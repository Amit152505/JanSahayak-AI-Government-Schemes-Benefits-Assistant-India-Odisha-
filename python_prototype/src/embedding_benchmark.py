"""
embedding_benchmark.py
Side-by-Side Comparison: Handcrafted Concept-Lexical Vectorizer vs. Pretrained Neural Transformer Embeddings

ARCHITECTURAL CLARITY NOTE:
- `src/embeddings.py` implements `handcrafted-concept-lexical-v2` (a 136-dim deterministic
  feature & FNV-1a lexical hash vectorizer). It is NOT a pretrained neural transformer.
- This module provides a clean abstraction (`BaseEmbedder`) and a side-by-side benchmark
  comparing `HandcraftedConceptLexicalEmbedder` with `PretrainedSentenceTransformerEmbedder`
  (`sentence-transformers/all-MiniLM-L6-v2`) on a small evaluation dataset of Indian/Odisha
  government scheme queries plus out-of-scope distractors.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Protocol
import math

from src.embeddings import compute_embedding, cosine_similarity, VECTORIZER_TYPE
from src.sample_data import get_initial_chunks


class EmbedderProtocol(Protocol):
    model_name: str
    is_pretrained_neural: bool

    def encode(self, text: str) -> List[float]:
        ...


class HandcraftedConceptLexicalEmbedder:
    """
    Wraps the deterministic 136-dimensional concept + FNV-1a lexical hash vectorizer
    defined in `src/embeddings.py`.
    """

    model_name: str = VECTORIZER_TYPE
    is_pretrained_neural: bool = False

    def encode(self, text: str) -> List[float]:
        return compute_embedding(text)


class PretrainedSentenceTransformerEmbedder:
    """
    Wraps a real pretrained neural transformer (`sentence-transformers/all-MiniLM-L6-v2`)
    when `sentence-transformers` is installed in the Python environment.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = f"sentence-transformers/{model_name}"
        self.is_pretrained_neural = True
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            self._model = SentenceTransformer(model_name)
        except Exception as exc:  # pragma: no cover - optional heavy dependency
            raise RuntimeError(
                f"Pretrained model '{self.model_name}' requires `pip install sentence-transformers`. "
                f"Original error: {exc}"
            ) from exc

    def encode(self, text: str) -> List[float]:
        vec = self._model.encode(text, normalize_embeddings=True)
        return [float(x) for x in vec.tolist()]


@dataclass
class QueryEvalCase:
    query: str
    expected_scheme_id: Optional[str]  # None means out-of-scope query that should be rejected
    description: str


DEFAULT_EVAL_DATASET: List[QueryEvalCase] = [
    QueryEvalCase(
        query="What financial support can help me pay for college in Odisha?",
        expected_scheme_id="odisha-gopabandhu-sikhya-sahayata",
        description="Synonym-rich student scholarship query ('pay for college' -> higher education grant)",
    ),
    QueryEvalCase(
        query="How much money do women get under SUBHADRA Yojana and what documents are needed?",
        expected_scheme_id="odisha-subhadra-yojana",
        description="Direct Odisha women's welfare scheme query",
    ),
    QueryEvalCase(
        query="What is the annual farmer installment under PM-KISAN?",
        expected_scheme_id="central-pm-kisan",
        description="Central agricultural DBT installment query",
    ),
    QueryEvalCase(
        query="Can a destitute widow under age 60 get monthly social security pension in Odisha?",
        expected_scheme_id="odisha-madhu-babu-pension",
        description="Exception-aware elderly/widow social security query",
    ),
    QueryEvalCase(
        query="Collateral-free loan and toolkit grant for traditional carpenter or blacksmith",
        expected_scheme_id="central-pm-vishwakarma",
        description="Artisan & craftsperson trade support query",
    ),
    QueryEvalCase(
        query="What subsidy is available for buying an electric submarine in Antarctica?",
        expected_scheme_id=None,
        description="Out-of-scope distractor query (must be rejected below threshold)",
    ),
]


def _dense_cosine(a: List[float], b: List[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def evaluate_embedder_on_dataset(
    embedder: EmbedderProtocol,
    chunks: Optional[List[Dict[str, Any]]] = None,
    eval_cases: Optional[List[QueryEvalCase]] = None,
    min_similarity_threshold: float = 0.25,
) -> Dict[str, Any]:
    """
    Evaluates an `EmbedderProtocol` implementation on `eval_cases` against `chunks`
    and computes:
    - Top-1 accuracy on in-scope queries
    - Mean Reciprocal Rank (MRR) on in-scope queries
    - Out-of-scope rejection accuracy
    """
    corpus = chunks if chunks is not None else get_initial_chunks()
    cases = eval_cases if eval_cases is not None else DEFAULT_EVAL_DATASET

    chunk_Embeddings = [
        {
            "chunk_id": c["chunk_id"],
            "scheme_id": c["scheme_id"],
            "vec": embedder.encode(f"{c.get('section_title', '')}. {c.get('content', '')}"),
        }
        for c in corpus
    ]

    in_scope_total = 0
    in_scope_top1_hits = 0
    reciprocal_ranks: List[float] = []
    out_of_scope_total = 0
    out_of_scope_rejected = 0
    per_query_results: List[Dict[str, Any]] = []

    for case in cases:
        q_vec = embedder.encode(case.query)
        scored = []
        for item in chunk_Embeddings:
            sim = _dense_cosine(q_vec, item["vec"])
            if sim >= min_similarity_threshold:
                scored.append((sim, item["scheme_id"], item["chunk_id"]))
        scored.sort(key=lambda x: x[0], reverse=True)

        top_scheme = scored[0][1] if scored else None
        top_score = round(scored[0][0], 4) if scored else 0.0

        if case.expected_scheme_id is None:
            out_of_scope_total += 1
            passed = len(scored) == 0
            if passed:
                out_of_scope_rejected += 1
            per_query_results.append(
                {
                    "query": case.query,
                    "expected_scheme_id": None,
                    "predicted_scheme_id": top_scheme,
                    "top_score": top_score,
                    "passed": passed,
                }
            )
        else:
            in_scope_total += 1
            passed = top_scheme == case.expected_scheme_id
            if passed:
                in_scope_top1_hits += 1

            rr = 0.0
            for rank_idx, (_, scheme_id, _) in enumerate(scored, start=1):
                if scheme_id == case.expected_scheme_id:
                    rr = 1.0 / rank_idx
                    break
            reciprocal_ranks.append(rr)

            per_query_results.append(
                {
                    "query": case.query,
                    "expected_scheme_id": case.expected_scheme_id,
                    "predicted_scheme_id": top_scheme,
                    "top_score": top_score,
                    "reciprocal_rank": round(rr, 4),
                    "passed": passed,
                }
            )

    return {
        "model_name": embedder.model_name,
        "is_pretrained_neural": embedder.is_pretrained_neural,
        "in_scope_top1_accuracy": round(
            in_scope_top1_hits / max(1, in_scope_total), 4
        ),
        "mean_reciprocal_rank": round(
            sum(reciprocal_ranks) / max(1, len(reciprocal_ranks)), 4
        ),
        "out_of_scope_rejection_rate": round(
            out_of_scope_rejected / max(1, out_of_scope_total), 4
        ),
        "per_query_results": per_query_results,
    }


def compare_embedding_approaches() -> Dict[str, Any]:
    """
    Runs the evaluation benchmark on `HandcraftedConceptLexicalEmbedder` and, if
    `sentence-transformers` is installed, also runs `PretrainedSentenceTransformerEmbedder`
    for direct side-by-side comparison.
    """
    handcrafted = HandcraftedConceptLexicalEmbedder()
    handcrafted_report = evaluate_embedder_on_dataset(
        handcrafted, min_similarity_threshold=0.25
    )

    pretrained_report: Optional[Dict[str, Any]] = None
    pretrained_status = "available"
    try:
        pretrained = PretrainedSentenceTransformerEmbedder("all-MiniLM-L6-v2")
        pretrained_report = evaluate_embedder_on_dataset(
            pretrained, min_similarity_threshold=0.30
        )
    except RuntimeError as exc:
        pretrained_status = str(exc)

    return {
        "handcrafted_vectorizer": handcrafted_report,
        "pretrained_neural_model": pretrained_report,
        "pretrained_status": pretrained_status,
        "architectural_guidance": (
            "The default `handcrafted-concept-lexical-v2` vectorizer uses 8 curated domain "
            "concept axes plus 128 FNV-1a stemmed token hash buckets. It runs in <1ms with "
            "zero external dependencies, making it ideal for deterministic unit tests and offline "
            "environments. For broader open-domain paraphrase coverage in production, plug in "
            "`PretrainedSentenceTransformerEmbedder('all-MiniLM-L6-v2')` or Gemini `text-embedding-004`."
        ),
    }
