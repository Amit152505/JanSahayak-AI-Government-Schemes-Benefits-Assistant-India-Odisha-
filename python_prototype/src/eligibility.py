from typing import Dict, Any, List, Union
from src.models import (
    SchemeRecord,
    EligibilityCondition,
    EligibilityState,
    UserProfile,
)


class EligibilityEvaluation:
    """
    Structured 3-state eligibility evaluation result that supports both:
    - Attribute access (`ev.overall_state`, `ev.matched_criteria`, `ev.mismatched_criteria`)
      used in `app.py` and `tests/test_evaluation.py`
    - Dictionary access (`ev["eligibility_state"]`, `ev["inconsistent_criteria"]`)
      used in `tests/test_eligibility.py`
    """

    def __init__(
        self,
        scheme_id: str,
        scheme_name: str,
        overall_state: EligibilityState,
        matched_criteria: List[str],
        unknown_criteria: List[str],
        inconsistent_criteria: List[str],
        flagged_exceptions: List[str],
        exclusions_to_verify: List[str],
    ) -> None:
        self.scheme_id = scheme_id
        self.scheme_name = scheme_name
        self.overall_state = overall_state
        self.eligibility_state = overall_state.value
        self.matched_criteria = matched_criteria
        self.unknown_criteria = unknown_criteria
        self.inconsistent_criteria = inconsistent_criteria
        self.mismatched_criteria = inconsistent_criteria
        self.flagged_exceptions = flagged_exceptions
        self.exclusions_to_verify = exclusions_to_verify

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scheme_id": self.scheme_id,
            "scheme_name": self.scheme_name,
            "eligibility_state": self.eligibility_state,
            "overall_state": self.overall_state,
            "matched_criteria": self.matched_criteria,
            "unknown_criteria": self.unknown_criteria,
            "inconsistent_criteria": self.inconsistent_criteria,
            "mismatched_criteria": self.mismatched_criteria,
            "flagged_exceptions": self.flagged_exceptions,
            "exclusions_to_verify": self.exclusions_to_verify,
        }

    def __getitem__(self, key: str) -> Any:
        return self.to_dict()[key]

    def keys(self):
        return self.to_dict().keys()


def check_single_condition(cond: EligibilityCondition, user_val: Any) -> bool:
    """Evaluates a single structured rule when the user's value is known."""
    if cond.operator == "equals":
        return str(user_val).strip().lower() == str(cond.value).strip().lower()

    if cond.operator == "boolean":
        return bool(user_val) is bool(cond.value)

    if cond.operator == "in" and isinstance(cond.value, list):
        return any(
            str(user_val).strip().lower() == str(item).strip().lower()
            for item in cond.value
        )

    if cond.operator == "min":
        return float(user_val) >= float(cond.value)

    if cond.operator == "max":
        return float(user_val) <= float(cond.value)

    if (
        cond.operator == "range"
        and isinstance(cond.value, list)
        and len(cond.value) == 2
    ):
        num = float(user_val)
        return float(cond.value[0]) <= num <= float(cond.value[1])

    return False


def evaluate_scheme_eligibility(
    scheme: SchemeRecord, profile: Union[Dict[str, Any], UserProfile]
) -> EligibilityEvaluation:
    """
    Evaluates a user profile against a scheme using 3-state logic:
    - Consistent (matched)
    - Unknown (missing user input - never treated as a failed requirement)
    - Flagged Exception (rule has a documented legal exception)
    - Inconsistent (contradicts a mandatory condition with no exception)
    Also attaches documented scheme exclusions so they are never silently ignored.
    """
    profile_dict = (
        profile.to_dict() if isinstance(profile, UserProfile) else dict(profile or {})
    )

    matched: List[str] = []
    unknown: List[str] = []
    inconsistent: List[str] = []
    exceptions: List[str] = []

    # 1. Check geographical scope first
    user_state = profile_dict.get("state")
    if user_state and str(user_state).strip():
        state_str = str(user_state).strip()
        applies_to_state = "All India" in scheme.applicable_states or any(
            s.lower() == state_str.lower() for s in scheme.applicable_states
        )
        if not applies_to_state:
            inconsistent.append(
                f"Geographic scope mismatch: Scheme applies to {scheme.applicable_states}, "
                f"but stated state is '{state_str}'."
            )

    # 2. Check each structured eligibility condition
    for cond in scheme.eligibility_conditions:
        raw_val = profile_dict.get(cond.field)

        # Special handling: if condition checks state=="Odisha" or "All India" and
        # the scheme itself is available in All India, treat All India as consistent
        if (
            cond.field == "state"
            and raw_val
            and "All India" in scheme.applicable_states
        ):
            matched.append(
                f"Consistent on 'state' ({raw_val}): {cond.description}"
            )
            continue

        # Missing information is NEVER treated as a failed requirement
        if raw_val is None or raw_val == "":
            unknown.append(f"Missing '{cond.field}': {cond.description}")
            continue

        if check_single_condition(cond, raw_val):
            matched.append(
                f"Consistent on '{cond.field}' ({raw_val}): {cond.description}"
            )
        elif cond.has_exceptions and cond.exception_note:
            exceptions.append(
                f"Exception to verify on '{cond.field}' ({raw_val}): {cond.exception_note}"
            )
        else:
            inconsistent.append(
                f"Inconsistent on '{cond.field}' ({raw_val}): {cond.description}"
            )

    # 3. Determine explicit eligibility evidence state
    if len(inconsistent) > 0:
        overall_state = EligibilityState.INCONSISTENT
    elif len(matched) == 0 and len(exceptions) == 0 and len(unknown) > 0:
        overall_state = EligibilityState.UNABLE_TO_ASSESS
    elif len(matched) > 0 and len(unknown) == 0 and len(exceptions) == 0:
        overall_state = EligibilityState.SOME_CRITERIA_CONSISTENT
    elif len(matched) > 0 or len(exceptions) > 0:
        overall_state = EligibilityState.ADDITIONAL_INFO_REQUIRED
    else:
        overall_state = EligibilityState.UNABLE_TO_ASSESS

    return EligibilityEvaluation(
        scheme_id=scheme.scheme_id,
        scheme_name=scheme.scheme_name,
        overall_state=overall_state,
        matched_criteria=matched,
        unknown_criteria=unknown,
        inconsistent_criteria=inconsistent,
        flagged_exceptions=exceptions,
        exclusions_to_verify=list(scheme.exclusions),
    )
