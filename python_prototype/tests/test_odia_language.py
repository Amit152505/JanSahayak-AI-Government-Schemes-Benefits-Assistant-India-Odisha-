"""
test_odia_language.py
Phase 10 Unit Tests: Odia (ଓଡ଼ିଆ) Script & Transliteration Query Expansion
"""

from src.odia_language import (
    expand_odia_query_for_retrieval,
    BILINGUAL_UI_LABELS,
)
from src.retrieval import HybridVectorStore
from src.sample_data import get_initial_chunks


def test_odia_script_query_expands_and_retrieves_subhadra():
    store = HybridVectorStore()
    store.add_chunks(get_initial_chunks())

    # User asks in Odia script about SUBHADRA ("ସୁଭଦ୍ରା")
    odia_query = "ସୁଭଦ୍ରା ଯୋଜନା ପାଇଁ କଣ ଦଲିଲ ଦରକାର?"
    expanded = expand_odia_query_for_retrieval(odia_query)

    assert "subhadra" in expanded
    results = store.search(expanded, top_k=2)
    assert len(results) >= 1
    assert results[0].scheme_id == "odisha-subhadra-yojana"


def test_romanized_odia_transliteration_retrieves_scholarship():
    store = HybridVectorStore()
    store.add_chunks(get_initial_chunks())

    # User types transliterated Odia ("chhatra brutti" = student scholarship)
    transliterated_query = "Odisha college chhatra brutti sahayata"
    expanded = expand_odia_query_for_retrieval(transliterated_query)

    assert "scholarship" in expanded
    results = store.search(expanded, top_k=2)
    assert len(results) >= 1
    assert results[0].scheme_id == "odisha-gopabandhu-sikhya-sahayata"


def test_bilingual_disclaimer_preserves_statutory_warnings():
    assert "en" in BILINGUAL_UI_LABELS["disclaimer"]
    assert "or" in BILINGUAL_UI_LABELS["disclaimer"]
    assert "ସରକାରୀ ପୋର୍ଟାଲ୍ ନୁହେଁ" in BILINGUAL_UI_LABELS["disclaimer"]["or"]
