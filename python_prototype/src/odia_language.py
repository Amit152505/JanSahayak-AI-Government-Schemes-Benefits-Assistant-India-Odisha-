"""
odia_language.py
Phase 10: Regional Language Support (Odia / ଓଡ଼ିଆ Glossary & Query Normalization)

This module demonstrates how to extend JanSahayak for Odia speakers while
preserving the exact official English/statutory scheme names, amounts, and
conditions so machine translation never distorts legal eligibility rules.

Key Distinctions Taught in Section 10:
1. Translation: Converting meaning from one language to another
   (e.g., "Student Scholarship" -> "ଛାତ୍ର ବୃତ୍ତି").
2. Transliteration: Writing the sound of a word in another script
   (e.g., "SUBHADRA" -> "ସୁଭଦ୍ରା", or Odia spoken in Latin script "chhatra brutti").
3. Bilingual Term Preservation: Keeping official scheme titles, rupee amounts,
   and statutory category labels side-by-side in both Odia and English.
"""

from typing import Dict, List


# Verified bilingual glossary mapping Odia script & Romanized Odia terms
# to canonical English retrieval terms so Odia queries match our vector store.
ODIA_TO_ENGLISH_CONCEPT_MAP: Dict[str, str] = {
    # Odia script terms
    "ସୁଭଦ୍ରା": "subhadra women welfare odisha",
    "କାଳିଆ": "kalia cm-kisan farmer agriculture odisha",
    "ମଧୁ ବାବୁ": "madhu babu pension elderly widow disability odisha",
    "ବୃତ୍ତି": "scholarship student college education gopabandhu",
    "ଚାଷୀ": "farmer agriculture crop kisan",
    "ମହିଳା": "women female subhadra mamata",
    "ଭତ୍ତା": "pension allowance madhu babu",
    "ଘର": "housing house pmay-g rural",
    # Romanized Odia (transliterated) terms
    "chasi": "farmer agriculture kisan",
    "brutti": "scholarship education student",
    "bhatta": "pension allowance elderly widow",
    "mahila": "women female subhadra",
}


BILINGUAL_UI_LABELS: Dict[str, Dict[str, str]] = {
    "disclaimer": {
        "en": (
            "Independent Civic Information Tool — Not an Official Government Service. "
            "All eligibility outputs are preliminary guidance; verify on official portals."
        ),
        "or": (
            "ଏହା ଏକ ସ୍ୱାଧୀନ ସୂଚନା ମାଧ୍ୟମ — କୌଣସି ସରକାରୀ ପୋର୍ଟାଲ୍ ନୁହେଁ। "
            "ସମସ୍ତ ଯୋଗ୍ୟତା ସୂଚନା ପ୍ରାଥମିକ ଅଟେ; ଆବେଦନ ପୂର୍ବରୁ ସରକାରୀ ୱେବସାଇଟ୍ ଯାଞ୍ଚ କରନ୍ତୁ।"
        ),
    },
    "unknown_warning": {
        "en": "Additional information required to check this requirement.",
        "or": "ଏହି ସର୍ତ୍ତ ଯାଞ୍ଚ କରିବା ପାଇଁ ଅଧିକ ସୂଚନା ଆବଶ୍ୟକ।",
    },
}


def expand_odia_query_for_retrieval(user_query: str) -> str:
    """
    Detects Odia script or Romanized Odia terms in a user's question and
    appends the canonical English retrieval keywords so the hybrid vector
    store can retrieve the matching official guidelines without modifying
    the underlying verified English rule text.
    """
    expanded_terms: List[str] = [user_query]
    lowered = user_query.lower()

    for odia_term, english_expansion in ODIA_TO_ENGLISH_CONCEPT_MAP.items():
        if odia_term in user_query or odia_term in lowered:
            expanded_terms.append(english_expansion)

    return " ".join(expanded_terms)
