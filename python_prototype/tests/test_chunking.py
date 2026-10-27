from src.text_processing import (
    clean_guideline_text,
    chunk_text_with_overlap,
    build_metadata_chunks,
)
from src.retrieval import HybridVectorStore


def test_empty_or_scanned_text_raises_value_error() -> None:
    raised = False
    try:
        clean_guideline_text("   \n\t  ")
    except ValueError as err:
        raised = "OCR is required" in str(err)
    assert raised, "Expected ValueError mentioning OCR is required"


def test_overlap_keeps_condition_and_exception_context() -> None:
    sample_guideline = (
        "Clause 3.1: All landholding farmer families in Odisha and India shall receive Rs. 6,000 per year in three installments. "
        "Clause 3.2: Payment is transferred via Direct Benefit Transfer into Aadhaar-seeded accounts. "
        "Clause 4.1: Provided that serving or retired regular government employees and income tax payees are excluded, except Multi-Tasking Staff / Class IV / Group D employees."
    )
    chunks = chunk_text_with_overlap(sample_guideline, chunk_size=220, overlap=60)
    assert len(chunks) >= 2
    assert "Clause 3.1" in chunks[0]
    assert any("except Multi-Tasking Staff" in c for c in chunks)


def test_build_metadata_chunks_attaches_provenance_for_vector_store() -> None:
    meta = {
        "scheme_id": "pm-kisan-central",
        "scheme_name": "PM-KISAN",
        "source_title": "Revised Operational Guidelines for PM-KISAN",
        "source_url": "https://pmkisan.gov.in/",
        "last_verified_at": "2026-10-15",
    }
    records = build_metadata_chunks(
        "Eligible farmers receive Rs. 6,000 per year.",
        base_metadata=meta,
        chunk_size=300,
        overlap=50,
    )
    assert len(records) == 1
    assert records[0]["chunk_id"] == "pm-kisan-central-chunk-1"
    assert records[0]["source_url"] == "https://pmkisan.gov.in/"

    # Verify HybridVectorStore preserves the provenance metadata from build_metadata_chunks
    store = HybridVectorStore()
    store.add_chunks(records)
    hits = store.search("How much do farmers receive under PM-KISAN?", top_k=1)
    assert len(hits) == 1
    assert hits[0].metadata["source_url"] == "https://pmkisan.gov.in/"
