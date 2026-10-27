from typing import Dict, Any, List, Union
from src.models import (
    SchemeRecord,
    UserProfile,
    EligibilityState,
    ConfidenceLevel,
)
from src.eligibility import evaluate_scheme_eligibility, EligibilityEvaluation


class RecommendationItem:
    """
    Unified recommendation result object that supports both:
    - Attribute access (`rec.scheme`, `rec.evaluation`, `rec.relevance_score`, `rec.why_recommended`)
      expected by `app.py` and `tests/test_evaluation.py`.
    - Dictionary access (`rec["scheme"]`, `rec["relevance_score"]`, `rec["eligibility_state"]`)
      expected by callers of `rank_and_recommend_schemes()`.
    """

    def __init__(
        self,
        scheme: SchemeRecord,
        evaluation: EligibilityEvaluation,
        relevance_score: int,
        why_recommended: List[str],
    ) -> None:
        self.scheme = scheme
        self.evaluation = evaluation
        self.relevance_score = relevance_score
        self.why_recommended = why_recommended
        self.relevance_reasons = why_recommended

    def to_dict(self) -> Dict[str, Any]:
        base = self.evaluation.to_dict()
        base.update(
            {
                "scheme": self.scheme,
                "evaluation": self.evaluation,
                "relevance_score": self.relevance_score,
                "relevance_reasons": self.why_recommended,
                "why_recommended": self.why_recommended,
            }
        )
        return base

    def __getitem__(self, key: str) -> Any:
        return self.to_dict()[key]

    def keys(self):
        return self.to_dict().keys()


def recommend_schemes(
    schemes: List[SchemeRecord],
    profile: Union[Dict[str, Any], UserProfile],
    exclude_other_state_schemes: bool = True,
) -> List[RecommendationItem]:
    """
    Two-stage recommendation workflow:
    Stage 1: Hard geographical scope filter (when user state is known and
             exclude_other_state_schemes=True) + 3-state eligibility evaluation.
    Stage 2: Transparent relevance ranking with human-readable explanations.
    """
    profile_dict = (
        profile.to_dict() if isinstance(profile, UserProfile) else dict(profile or {})
    )
    user_state = profile_dict.get("state")

    recommendations: List[RecommendationItem] = []

    for scheme in schemes:
        # Stage 1: Hard filter for geographical scope when user state is explicitly provided
        if (
            exclude_other_state_schemes
            and user_state
            and str(user_state).strip()
            and str(user_state).strip() not in ("", "Other State")
        ):
            state_str = str(user_state).strip()
            applies_to_state = "All India" in scheme.applicable_states or any(
                s.lower() == state_str.lower() for s in scheme.applicable_states
            )
            if not applies_to_state:
                continue

        evaluation = evaluate_scheme_eligibility(scheme, profile_dict)
        score = 40
        reasons: List[str] = []

        # Geographic alignment
        if user_state and str(user_state).strip():
            gov_label = (
                scheme.government_level.value
                if hasattr(scheme.government_level, "value")
                else str(scheme.government_level)
            )
            if any(
                s.lower() == str(user_state).lower()
                for s in scheme.applicable_states
            ):
                score += 15
                reasons.append(
                    f"Geographic match: Available in {user_state} ({gov_label})."
                )
            elif "All India" in scheme.applicable_states:
                score += 10
                reasons.append("Geographic match: Available nationwide across India.")

        # Stated / primary need alignment
        stated_need = (
            profile_dict.get("primary_need")
            or profile_dict.get("stated_need")
            or ""
        ).strip()
        if stated_need and stated_need.lower() != "any":
            searchable = (
                f"{scheme.scheme_name} {scheme.short_description} "
                f"{scheme.scheme_category} {' '.join(scheme.target_beneficiaries)}"
            ).lower()
            need_words = [w for w in stated_need.lower().split() if len(w) > 2]
            if stated_need.lower() in searchable or any(
                w in searchable for w in need_words
            ):
                score += 25
                reasons.append(
                    f"Matches your stated need ('{stated_need}')."
                )

        # Occupation alignment
        occupation = profile_dict.get("occupation")
        if occupation and str(occupation).strip():
            occ_lower = str(occupation).strip().lower()
            if any(occ_lower in b.lower() for b in scheme.target_beneficiaries):
                score += 18
                reasons.append(
                    f"Targets beneficiary group matching occupation '{occupation}'."
                )

        # Student status alignment
        if profile_dict.get("is_student") is True:
            if any("student" in b.lower() for b in scheme.target_beneficiaries):
                score += 20
                reasons.append("Specifically supports enrolled students.")

        # Disability support alignment
        if profile_dict.get("has_disability") is True:
            if any("disabilit" in b.lower() for b in scheme.target_beneficiaries):
                score += 22
                reasons.append(
                    "Includes dedicated provisions for persons with disabilities."
                )

        # Adjust score by matched vs inconsistent criteria
        score += len(evaluation.matched_criteria) * 8
        score += len(evaluation.flagged_exceptions) * 4
        if len(evaluation.inconsistent_criteria) > 0:
            score = max(10, score - 45)

        # Freshness & confidence bonus
        if scheme.information_confidence in (
            ConfidenceLevel.HIGH,
            "Verified Official Guideline",
        ):
            score += 5
            reasons.append(
                f"Backed by documented official source (last checked {scheme.source_last_verified_at})."
            )

        score = min(99, max(5, score))
        if not reasons:
            reasons.append("Included from scheme catalogue for general exploration.")

        recommendations.append(
            RecommendationItem(
                scheme=scheme,
                evaluation=evaluation,
                relevance_score=score,
                why_recommended=reasons,
            )
        )

    # Sort consistent/partial schemes before inconsistent schemes, then by score
    recommendations.sort(
        key=lambda item: (
            0
            if item.evaluation.overall_state != EligibilityState.INCONSISTENT
            else 1,
            -item.relevance_score,
        )
    )
    return recommendations


def rank_and_recommend_schemes(
    schemes: List[SchemeRecord],
    profile: Union[Dict[str, Any], UserProfile],
) -> List[RecommendationItem]:
    """
    Backward-compatible entry point that preserves all schemes (including
    geographically inconsistent ones marked as INCONSISTENT) and returns
    objects that support both dict-key and attribute access.
    """
    return recommend_schemes(
        schemes, profile, exclude_other_state_schemes=False
    )
