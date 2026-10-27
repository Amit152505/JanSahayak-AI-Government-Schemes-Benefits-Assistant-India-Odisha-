import re
from typing import List, Dict, Any


def clean_guideline_text(raw_text: str) -> str:
    """
    Normalizes whitespace and line breaks while carefully preserving
    eligibility conditions, exceptions, dates, footnotes, and clause numbers.
    """
    if not raw_text or not raw_text.strip():
        raise ValueError(
            "Extracted text is empty. If this is a scanned PDF, OCR is required."
        )
    normalized = raw_text.replace("\r\n", "\n")
    # Remove common navigation boilerplate lines if present
    lines = [
        line
        for line in normalized.split("\n")
        if line.strip().lower()
        not in {"skip to main content", "home | about us | contact"}
    ]
    normalized = "\n".join(lines)
    # Collapse 3+ consecutive blank lines into a clean paragraph break
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    # Collapse repeated spaces/tabs on the same line
    normalized = re.sub(r"[ \t]{2,}", " ", normalized)
    return normalized.strip()


# Alias for callers expecting `clean_extracted_text`
clean_extracted_text = clean_guideline_text


def chunk_text_with_overlap(
    text: str,
    chunk_size: int = 450,
    overlap: int = 90,
) -> List[str]:
    """
    Splits cleaned guideline text on sentence boundaries so that
    conditions remain attached to their qualifying exceptions via overlap.
    """
    cleaned = clean_guideline_text(text)
    if len(cleaned) <= chunk_size:
        return [cleaned]

    sentences = re.split(r"(?<=[.?!])\s+", cleaned)
    chunks: List[str] = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= chunk_size:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
                tail = current[-overlap:] if overlap > 0 else ""
                current = f"{tail} {sentence}".strip()
            else:
                chunks.append(sentence[:chunk_size])
                current = sentence[chunk_size - overlap :]

    if current.strip():
        chunks.append(current.strip())

    return chunks


def build_metadata_chunks(
    raw_text: str,
    base_metadata: Dict[str, Any],
    chunk_size: int = 450,
    overlap: int = 90,
) -> List[Dict[str, Any]]:
    """
    Pairs each extracted text chunk with full source provenance metadata.
    Stores metadata both at top-level keys (for backward compatibility with
    `test_chunking.py`) and inside a nested `"metadata"` dict (for `HybridVectorStore`).
    """
    text_chunks = chunk_text_with_overlap(
        raw_text, chunk_size=chunk_size, overlap=overlap
    )
    scheme_id = base_metadata.get("scheme_id", "scheme")
    section_title = base_metadata.get("section_title", "Official Guideline Passage")
    records: List[Dict[str, Any]] = []
    for idx, content in enumerate(text_chunks, start=1):
        records.append(
            {
                "chunk_id": f"{scheme_id}-chunk-{idx}",
                "chunk_index": idx,
                "scheme_id": scheme_id,
                "section_title": section_title,
                "content": content,
                "metadata": dict(base_metadata),
                **base_metadata,
            }
        )
    return records
