"""
embeddings.py
Phase 5: Hand-Built Concept & Stemmed Lexical Vectorizer + Cosine Similarity

IMPORTANT TECHNICAL DISCLOSURE (Audit Section 6):
This module implements a deterministic, zero-dependency feature vectorizer
(`VECTORIZER_TYPE = "handcrafted-concept-lexical-v2"`), NOT a pretrained neural
transformer model. It maps text into a fixed-length vector space using:
1. Domain concept clusters (bridging civic synonyms such as "college" <-> "scholarship").
2. Stemmed non-stopword lexical buckets (128 dimensions) for exact terminology.

This allows the entire RAG pipeline and test suite to run offline with zero external
model downloads, while demonstrating how vector spaces and cosine similarity work.
"""

import math
import re
from typing import Dict, List, Set

VECTORIZER_TYPE = "handcrafted-concept-lexical-v2"

STOPWORDS: Set[str] = {
    "what", "which", "who", "whom", "this", "that", "these", "those",
    "am", "is", "are", "was", "were", "be", "been", "being", "have",
    "has", "had", "having", "do", "does", "did", "doing", "a", "an",
    "the", "and", "but", "if", "or", "because", "as", "until", "while",
    "of", "at", "by", "for", "with", "about", "against", "between",
    "into", "through", "during", "before", "after", "above", "below",
    "to", "from", "up", "down", "in", "out", "on", "off", "over", "under",
    "can", "how", "get", "help", "need", "should", "i", "my", "me", "available",
}

# Domain-aware synonym groups so that queries like "pay for college"
# map to the same concept dimensions as "post-matric scholarship tuition".
CONCEPT_CLUSTERS: Dict[str, List[str]] = {
    "concept_education_scholarship": [
        "college", "university", "student", "scholarship", "tuition",
        "post-matric", "gopabandhu", "sikhya", "education", "hostel", "degree",
        "aicte", "pragati", "saksham", "banishree", "graduate", "postgraduate",
        "pay", "study", "course",
    ],
    "concept_agriculture_farmer": [
        "farmer", "farming", "agriculture", "crop", "cultivator", "kisan",
        "kalia", "cm-kisan", "pm-kisan", "landholding", "sharecropper", "seed",
        "installment",
    ],
    "concept_women_welfare": [
        "woman", "women", "female", "subhadra", "mother", "pregnant",
        "lactating", "mamata", "maternity", "girl", "anganwadi",
    ],
    "concept_pension_elderly_disability": [
        "senior", "elderly", "old", "age", "pension", "widow", "disability",
        "disabled", "pwd", "madhu", "babu", "mbpy", "destitute", "ssepd",
    ],
    "concept_business_artisan_loan": [
        "business", "entrepreneur", "enterprise", "artisan", "craftsperson",
        "carpenter", "blacksmith", "weaver", "vishwakarma", "pmegp", "loan",
        "credit", "msme", "startup", "shop", "toolkit", "trades",
    ],
    "concept_housing_rural": [
        "house", "housing", "home", "shelter", "kutcha", "pucca", "pmay",
        "pmay-g", "awaas", "construction", "roof", "solar", "surya",
    ],
    "concept_health_hospital": [
        "health", "hospital", "medical", "treatment", "surgery", "insurance",
        "ayushman", "gjay", "arogya", "cashless", "illness",
    ],
    "concept_odisha_state": [
        "odisha", "oriya", "bhubaneswar", "cuttack", "kalia", "subhadra",
        "madhu", "mamata", "banishree", "gopabandhu",
    ],
    "concept_documents_application": [
        "document", "aadhaar", "certificate", "income", "caste",
        "residence", "domicile", "bank", "passbook", "ifsc", "portal", "apply",
        "application", "ekyc", "biometric", "ration",
    ],
}


def stem_token(token: str) -> str:
    """
    Lightweight rule-based stemmer for common English plurals and verb endings
    so 'supports' <-> 'support', 'widows' <-> 'widow', 'farmers' <-> 'farmer'.
    """
    if len(token) <= 3:
        return token
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith("es") and len(token) > 4 and not token.endswith("aes"):
        if token[:-2].endswith(("sh", "ch", "x", "s", "z")):
            return token[:-2]
    if token.endswith("s") and not token.endswith(("ss", "us", "is")):
        return token[:-1]
    if token.endswith("ing") and len(token) > 5:
        return token[:-3]
    return token


def tokenize(text: str, remove_stopwords: bool = False) -> List[str]:
    """Lowercases text, extracts alphanumeric tokens, and applies light stemming."""
    raw_tokens = re.findall(r"[a-z0-9-]+", text.lower())
    processed: List[str] = []
    for t in raw_tokens:
        if remove_stopwords and t in STOPWORDS:
            continue
        processed.append(stem_token(t))
    return processed


# Pre-stem cluster word sets for fast lookup
STEMMED_CONCEPT_CLUSTERS: Dict[str, Set[str]] = {
    name: {stem_token(w) for w in words} | set(words)
    for name, words in CONCEPT_CLUSTERS.items()
}


def compute_embedding(
    text: str, vocab_dimensions: List[str] | None = None
) -> List[float]:
    """
    Converts text into a fixed-length L2-normalized vector (137 dimensions:
    9 domain concept dimensions + 128 stemmed content-word hash buckets).

    Stopwords are excluded before hashing so unrelated English sentences do not
    produce false-positive bucket collisions.
    """
    content_tokens = tokenize(text, remove_stopwords=True)
    num_dims = len(STEMMED_CONCEPT_CLUSTERS) + 128
    if not content_tokens:
        return [0.0] * num_dims

    vector: List[float] = []

    # 1. Domain concept dimensions (weight = 1.0 + log(matches))
    for _, cluster_set in STEMMED_CONCEPT_CLUSTERS.items():
        matches = sum(1 for t in content_tokens if t in cluster_set)
        score = (1.0 + math.log(matches)) if matches > 0 else 0.0
        vector.append(score)

    # 2. Stemmed non-stopword lexical buckets (128 dimensions, weight = 0.35 per token)
    # Using 128 buckets and excluding stopwords prevents false collisions on unrelated queries.
    buckets = [0.0] * 128
    for token in content_tokens:
        if len(token) >= 3:
            h = 2166136261
            for ch in token:
                h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
            bucket_idx = h % 128
            buckets[bucket_idx] += 0.35
    vector.extend(buckets)

    # 3. Normalize vector to unit length
    norm = math.sqrt(sum(val * val for val in vector))
    if norm > 0:
        vector = [round(val / norm, 6) for val in vector]

    return vector


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Computes the cosine of the angle between two numeric vectors:
        similarity = (A . B) / (||A|| * ||B||)
    """
    if len(vec_a) != len(vec_b):
        raise ValueError(
            f"Vector dimension mismatch: {len(vec_a)} vs {len(vec_b)}"
        )

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return round(dot_product / (norm_a * norm_b), 4)
