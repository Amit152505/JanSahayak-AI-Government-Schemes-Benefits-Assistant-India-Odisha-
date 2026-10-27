"""
retrieval.py
Phase 5: Hybrid Semantic + Keyword Vector Search with Minimum Relevance Thresholds
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from src.embeddings import (
    compute_embedding,
    cosine_similarity,
    tokenize,
    STOPWORDS,
)

# Minimum hybrid score required for an unfiltered query to be considered relevant.
# Prevents unrelated queries (e.g., "electric submarine in Antarctica") from returning
# unrelated Indian government scheme chunks.
DEFAULT_MIN_HYBRID_SCORE = 0.22


@dataclass
class IndexedChunk:
    chunk_id: str
    scheme_id: str
    section_title: str
    content: str
    metadata: Dict[str, Any]
    embedding: List[float]


@dataclass
class RetrievalResult:
    chunk_id: str
    scheme_id: str
    section_title: str
    content: str
    metadata: Dict[str, Any]
    semantic_score: float
    keyword_score: float
    hybrid_score: float
    matched_terms: List[str]


class HybridVectorStore:
    """
    In-memory vector store supporting:
    1. Metadata filtering (`scheme_id_filter`) checked BEFORE ranking.
    2. Hybrid scoring (`0.65 * semantic_score + 0.35 * keyword_score`).
    3. Minimum relevance thresholding so unsupported/irrelevant queries return `[]`.
    """

    def __init__(self) -> None:
        self.index: List[IndexedChunk] = []

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """
        Computes embeddings for each chunk dictionary and adds it to the index.
        Preserves metadata whether passed inside `item["metadata"]` or as top-level
        keys from `text_processing.build_metadata_chunks()`.
        """
        added = 0
        reserved_keys = {
            "chunk_id",
            "chunk_index",
            "scheme_id",
            "section_title",
            "content",
            "metadata",
            "embedding",
        }
        for item in chunks:
            section_title = item.get("section_title", "Official Guideline Passage")
            content = item["content"]
            full_text = f"{section_title} {content}"
            vec = compute_embedding(full_text)

            merged_meta: Dict[str, Any] = dict(item.get("metadata") or {})
            for k, v in item.items():
                if k not in reserved_keys and k not in merged_meta:
                    merged_meta[k] = v

            indexed = IndexedChunk(
                chunk_id=str(item["chunk_id"]),
                scheme_id=str(item["scheme_id"]).strip(),
                section_title=section_title,
                content=content,
                metadata=merged_meta,
                embedding=vec,
            )
            self.index.append(indexed)
            added += 1
        return added

    @staticmethod
    def compute_keyword_overlap(
        query: str, document_text: str
    ) -> tuple[float, List[str]]:
        """
        Calculates the fraction of meaningful stemmed query keywords that appear
        in the stemmed document text.
        """
        query_tokens = [
            t
            for t in tokenize(query, remove_stopwords=True)
            if t not in STOPWORDS and len(t) > 2
        ]
        if not query_tokens:
            return 0.0, []

        doc_token_set = set(tokenize(document_text, remove_stopwords=False))
        matched = sorted(list({t for t in query_tokens if t in doc_token_set}))
        score = round(len(matched) / len(set(query_tokens)), 4)
        return score, matched

    def search(
        self,
        query: str,
        top_k: int = 3,
        scheme_id_filter: Optional[str] = None,
        semantic_weight: float = 0.65,
        keyword_weight: float = 0.35,
        min_score: float = DEFAULT_MIN_HYBRID_SCORE,
    ) -> List[RetrievalResult]:
        """
        Retrieves the top_k chunks ranked by hybrid score.
        - Applies `scheme_id_filter` (case-insensitive) BEFORE scoring.
        - When `scheme_id_filter` is NOT provided, enforces `min_score` so
          unrelated out-of-domain queries return an empty list `[]`.
        - When `scheme_id_filter` IS explicitly provided by the caller, returns
          the matching scheme's chunks ranked by hybrid relevance even for broad
          questions like "What support is available?".
        """
        if not query.strip() or not self.index:
            return []

        normalized_filter = (
            scheme_id_filter.strip().lower()
            if scheme_id_filter and scheme_id_filter.strip()
            else None
        )

        # Step 1: Filter candidate chunks by scheme_id_filter first
        candidates = [
            item
            for item in self.index
            if normalized_filter is None
            or item.scheme_id.strip().lower() == normalized_filter
        ]
        if not candidates:
            return []

        query_vec = compute_embedding(query)
        results: List[RetrievalResult] = []

        for item in candidates:
            searchable_text = f"{item.section_title} {item.content}"
            sem_score = cosine_similarity(query_vec, item.embedding)
            kw_score, matched_terms = self.compute_keyword_overlap(
                query, searchable_text
            )

            hybrid = round(
                (semantic_weight * sem_score) + (keyword_weight * kw_score), 4
            )

            # When searching the entire corpus without a scheme filter, enforce
            # the minimum relevance threshold so out-of-scope questions return [].
            if normalized_filter is None and hybrid < min_score:
                continue

            results.append(
                RetrievalResult(
                    chunk_id=item.chunk_id,
                    scheme_id=item.scheme_id,
                    section_title=item.section_title,
                    content=item.content,
                    metadata=item.metadata,
                    semantic_score=sem_score,
                    keyword_score=kw_score,
                    hybrid_score=hybrid,
                    matched_terms=matched_terms,
                )
            )

        results.sort(key=lambda r: r.hybrid_score, reverse=True)
        return results[:top_k]
