"""
test_retrieval.py
Phase 5 Unit Tests: Embeddings, Cosine Similarity, Minimum Thresholds & Scheme Filtering
"""

from src.embeddings import compute_embedding, cosine_similarity, VECTORIZER_TYPE
from src.retrieval import HybridVectorStore


SAMPLE_CHUNKS = [
    {
        "chunk_id": "chk_gopabandhu_01",
        "scheme_id": "odisha-gopabandhu-sikhya-sahayata",
        "section_title": "Eligibility & ₹20,000 Annual Grant",
        "content": (
            "Gopabandhu Sikhya Sahayata Yojana provides ₹20,000 per annum to "
            "students in Odisha pursuing higher education (graduate and postgraduate) "
            "whose parents are affected by HIV/AIDS, manual scavengers, or households "
            "with annual income below ₹2,50,000."
        ),
        "metadata": {
            "source_title": "Odisha Higher Education Department Guidelines",
            "source_url": "https://scholarship.odisha.gov.in/",
            "last_verified_at": "2026-10-15",
        },
    },
    {
        "chunk_id": "chk_pmkisan_01",
        "scheme_id": "central-pm-kisan",
        "section_title": "Benefit Structure & Exclusions",
        "content": (
            "Under PM-KISAN, eligible landholding farmer families receive ₹6,000 per "
            "year in three equal installments of ₹2,000 every four months via Direct "
            "Benefit Transfer (DBT). Institutional landholders and income tax payers "
            "are excluded."
        ),
        "metadata": {
            "source_title": "PM-KISAN Operational Guidelines",
            "source_url": "https://pmkisan.gov.in/",
            "last_verified_at": "2026-10-12",
        },
    },
    {
        "chunk_id": "chk_vishwakarma_01",
        "scheme_id": "central-pm-vishwakarma",
        "section_title": "Toolkit Incentive & Collateral-Free Credit",
        "content": (
            "PM Vishwakarma supports traditional artisans and craftspeople across 18 "
            "trades including carpenters, blacksmiths, and weavers with a ₹15,000 "
            "e-voucher toolkit incentive and collateral-free enterprise loans."
        ),
        "metadata": {
            "source_title": "Ministry of MSME PM Vishwakarma Guidelines",
            "source_url": "https://pmvishwakarma.gov.in/",
            "last_verified_at": "2026-10-14",
        },
    },
]


def test_vectorizer_is_explicitly_labeled_handcrafted():
    assert VECTORIZER_TYPE == "handcrafted-concept-lexical-v2"


def test_identical_texts_have_unit_cosine_similarity():
    vec1 = compute_embedding("Financial support for college students in Odisha")
    vec2 = compute_embedding("Financial support for college students in Odisha")
    assert abs(cosine_similarity(vec1, vec2) - 1.0) <= 1e-3


def test_semantic_similarity_bridges_synonym_gap():
    """
    Even though 'pay for college degree' shares zero words with
    'post-matric scholarship tuition assistance', their semantic concept
    vectors should have strong positive cosine similarity.
    """
    query_vec = compute_embedding("help me pay for college degree")
    doc_vec = compute_embedding("post-matric scholarship tuition assistance")
    unrelated_vec = compute_embedding("tractor seed subsidy for crop cultivation")

    sim_related = cosine_similarity(query_vec, doc_vec)
    sim_unrelated = cosine_similarity(query_vec, unrelated_vec)

    assert sim_related > 0.45
    assert sim_related > sim_unrelated


def test_hybrid_search_ranks_correct_chunk_first():
    store = HybridVectorStore()
    count = store.add_chunks(SAMPLE_CHUNKS)
    assert count == 3

    results = store.search(
        "What financial support can help me pay for college in Odisha?", top_k=2
    )
    assert len(results) >= 1
    assert results[0].scheme_id == "odisha-gopabandhu-sikhya-sahayata"
    assert results[0].semantic_score > 0.35


def test_hybrid_search_respects_scheme_id_filter():
    """
    Regression test for Problem 3:
    Filtering by `scheme_id_filter='central-pm-vishwakarma'` must check the filter
    BEFORE ranking and return the matching chunk (`chk_vishwakarma_01`).
    """
    store = HybridVectorStore()
    store.add_chunks(SAMPLE_CHUNKS)

    results = store.search(
        "What support is available?",
        top_k=3,
        scheme_id_filter="central-pm-vishwakarma",
    )
    assert len(results) == 1
    assert results[0].chunk_id == "chk_vishwakarma_01"


def test_unrelated_query_returns_empty_list():
    """
    Regression test for Problem 2:
    An out-of-scope query about an electric submarine in Antarctica must fall below
    the minimum relevance threshold and return 0 passages (`[]`).
    """
    store = HybridVectorStore()
    store.add_chunks(SAMPLE_CHUNKS)

    results = store.search(
        "What subsidy is available for buying an electric submarine in Antarctica?",
        top_k=3,
    )
    assert len(results) == 0


def test_embedding_benchmark_evaluates_handcrafted_and_documents_pretrained_comparison():
    """
    Verifies the evaluation benchmark comparing `handcrafted-concept-lexical-v2`
    against the `EmbedderProtocol` interface for pretrained neural models.
    """
    from src.embedding_benchmark import compare_embedding_approaches

    comparison = compare_embedding_approaches()
    hc_report = comparison["handcrafted_vectorizer"]

    assert hc_report["model_name"] == "handcrafted-concept-lexical-v2"
    assert hc_report["is_pretrained_neural"] is False
    assert hc_report["in_scope_top1_accuracy"] == 1.0
    assert hc_report["mean_reciprocal_rank"] == 1.0
    assert hc_report["out_of_scope_rejection_rate"] == 1.0
    assert "PretrainedSentenceTransformerEmbedder" in comparison["architectural_guidance"]

