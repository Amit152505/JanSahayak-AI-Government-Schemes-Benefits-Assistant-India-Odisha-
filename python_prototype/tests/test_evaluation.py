"""
test_evaluation.py
Phase 8: Golden Evaluation Benchmark, Provenance Checklist, Freshness & Security Suite
"""

import tempfile
from pathlib import Path
from src.retrieval import HybridVectorStore
from src.rag import generate_grounded_answer
from src.sample_data import (
    get_initial_chunks,
    get_initial_schemes,
    get_scheme_verification_checklist,
)
from src.recommendation import recommend_schemes
from src.models import UserProfile, EligibilityState, SchemeStatus, ConfidenceLevel
from src.database import SchemeDatabase
from src.auto_importer import auto_discover_and_ingest_scheme
from src.freshness import (
    audit_source_freshness,
    compute_document_sha256,
    redact_sensitive_identifiers,
)


# ---------------------------------------------------------------------------
# 1. GOLDEN RAG EVALUATION BENCHMARK (Section 14.C)
# ---------------------------------------------------------------------------
GOLDEN_RAG_BENCHMARK = [
    {
        "question": "What financial support can help me pay for college in Odisha?",
        "expected_scheme_id": "odisha-gopabandhu-sikhya-sahayata",
        "expected_fact_substring": "₹20,000",
        "expected_url": "https://scholarship.odisha.gov.in/",
    },
    {
        "question": "How much money do women get under SUBHADRA Yojana and what documents are needed?",
        "expected_scheme_id": "odisha-subhadra-yojana",
        "expected_fact_substring": "₹10,000",
        "expected_url": "https://subhadra.odisha.gov.in/",
    },
    {
        "question": "What is the annual farmer installment under PM-KISAN?",
        "expected_scheme_id": "central-pm-kisan",
        "expected_fact_substring": "₹6,000",
        "expected_url": "https://pmkisan.gov.in/",
    },
    {
        "question": "Can a widow under age 60 apply for Madhu Babu Pension in Odisha?",
        "expected_scheme_id": "odisha-madhu-babu-pension",
        "expected_fact_substring": "widows",
        "expected_url": "https://ssepd.odisha.gov.in/",
    },
]


def test_golden_rag_evaluation_benchmark():
    """
    Evaluates our RAG pipeline across realistic citizen questions to verify:
    1. Correct top-1 scheme retrieval.
    2. Factual support in the synthesized answer.
    3. Exact official URL citation grounding.
    """
    store = HybridVectorStore()
    store.add_chunks(get_initial_chunks())

    for case in GOLDEN_RAG_BENCHMARK:
        ans = generate_grounded_answer(case["question"], store, top_k=2)
        assert len(ans.retrieved_chunks) >= 1, f"Failed retrieval for: {case['question']}"
        assert ans.retrieved_chunks[0].scheme_id == case["expected_scheme_id"]
        assert case["expected_fact_substring"] in ans.short_answer
        cited_urls = [c.source_url for c in ans.citations]
        assert case["expected_url"] in cited_urls


# ---------------------------------------------------------------------------
# 2. RECOMMENDATION SCENARIO MATRIX (Section 14.D)
# ---------------------------------------------------------------------------
def test_recommendation_scenarios_matrix():
    schemes = get_initial_schemes()

    # Scenario A: Clear Match (25yo Female in Odisha, income ₹1,20,000 -> SUBHADRA)
    profile_match = UserProfile(
        state="Odisha", age=25, gender="Female", annual_income=120000
    )
    recs_a = recommend_schemes(schemes, profile_match)
    subhadra_rec = next(
        r for r in recs_a if r.scheme.scheme_id == "odisha-subhadra-yojana"
    )
    assert (
        subhadra_rec.evaluation.overall_state
        == EligibilityState.SOME_CRITERIA_CONSISTENT
    )

    # Scenario B: Geographical Exclusion (Resident of Maharashtra cannot match Odisha-only schemes)
    profile_non_odisha = UserProfile(
        state="Maharashtra", age=25, gender="Female", annual_income=100000
    )
    recs_b = recommend_schemes(schemes, profile_non_odisha)
    returned_ids = [r.scheme.scheme_id for r in recs_b]
    assert "odisha-subhadra-yojana" not in returned_ids
    assert "central-pm-kisan" in returned_ids


# ---------------------------------------------------------------------------
# 3. PROVENANCE & VERIFICATION CHECKLIST AUDIT (Audit Step 4)
# ---------------------------------------------------------------------------
def test_scheme_provenance_and_verification_checklist():
    schemes = get_initial_schemes()
    for s in schemes:
        audit = get_scheme_verification_checklist(s)
        # Curated records now link to specific guideline paths rather than bare homepages
        assert audit["uses_generic_department_homepage"] is False
        assert len(audit["unverified_fields"]) >= 1
        assert all(audit["mandatory_verification_checklist"].values())

    # Auto-imported records must NEVER claim to be Verified Official Guidelines
    with tempfile.TemporaryDirectory() as tmp_dir:
        db = SchemeDatabase(Path(tmp_dir) / "test.db")
        store = HybridVectorStore()
        draft_scheme, _ = auto_discover_and_ingest_scheme(
            "New Custom Solar Pump Scheme", db, store
        )
        assert draft_scheme.scheme_effective_status == SchemeStatus.UNVERIFIED
        assert draft_scheme.information_confidence == ConfidenceLevel.UNVERIFIED
        assert draft_scheme.source_last_verified_at == "Unverified"
        assert len(draft_scheme.unverified_fields) == 5


# ---------------------------------------------------------------------------
# 4. SOURCE FRESHNESS & CONTENT HASH TESTS (Section 13)
# ---------------------------------------------------------------------------
def test_source_freshness_detects_stale_dates_and_content_changes():
    fresh = audit_source_freshness(
        scheme_id="odisha-subhadra-yojana",
        last_verified_iso="2026-10-15",
        reference_date_iso="2026-10-27",
        max_verified_days=90,
    )
    assert fresh.is_stale is False
    assert fresh.warning_message is None

    stale = audit_source_freshness(
        scheme_id="old-scheme",
        last_verified_iso="2026-04-01",
        reference_date_iso="2026-10-27",
        max_verified_days=90,
    )
    assert stale.is_stale is True
    assert "days ago" in (stale.warning_message or "")

    original_hash = compute_document_sha256("Income limit is ₹2,50,000 per annum.")
    changed = audit_source_freshness(
        scheme_id="odisha-subhadra-yojana",
        last_verified_iso="2026-10-25",
        reference_date_iso="2026-10-27",
        previous_sha256=original_hash,
        current_content="Income limit is revised to ₹3,00,000 per annum.",
    )
    assert changed.content_changed is True
    assert changed.is_stale is True
    assert "Human Review Required" in changed.status_label


# ---------------------------------------------------------------------------
# 5. PRIVACY & PII REDACTION SAFEGUARD (Section 12)
# ---------------------------------------------------------------------------
def test_pii_redaction_strips_aadhaar_and_phone_numbers():
    raw_input = (
        "My Aadhaar number is 4567 8901 2345 and my mobile is 9876543210. "
        "Am I eligible for PM-KISAN?"
    )
    cleaned = redact_sensitive_identifiers(raw_input)
    assert "4567 8901 2345" not in cleaned
    assert "9876543210" not in cleaned
    assert "[REDACTED-AADHAAR-ID]" in cleaned
    assert "[REDACTED-PHONE-NUMBER]" in cleaned
