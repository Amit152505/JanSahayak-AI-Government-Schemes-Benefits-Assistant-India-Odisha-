"""
models.py
Standardized Data Models for JanSahayak (Repair #1)

Unifies the schema across all modules (`database.py`, `eligibility.py`,
`recommendation.py`, `sample_data.py`, `auto_importer.py`, and `app.py`) by:
1. Defining explicit Enums (`GovernmentLevel`, `SchemeStatus`, `ConfidenceLevel`,
   `EligibilityState`) that inherit from `str` so both Enum members and plain
   strings serialize and compare cleanly.
2. Standardizing `EligibilityCondition` (with `EligibilityRule` as a backward-
   compatible alias) so both `(criterion_id, field, operator, value)` and
   `(rule_id, field_name, operator, expected_value)` work seamlessly.
3. Defining `UserProfile` with dictionary-like `.get()` access so `eligibility.py`
   and `recommendation.py` can accept either a `UserProfile` instance or a `dict`.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union

try:
    from pydantic import BaseModel, Field, model_validator

    PYDANTIC_AVAILABLE = True
except ImportError:  # Fallback if running in a bare Python environment without pydantic
    PYDANTIC_AVAILABLE = False
    BaseModel = object  # type: ignore


class ValidationError(ValueError):
    """Raised when a scheme record or condition fails schema validation."""


class GovernmentLevel(str, Enum):
    CENTRAL = "Central Government"
    STATE = "Odisha State Government"


class SchemeStatus(str, Enum):
    ACTIVE = "Active"
    UNDER_REVIEW = "Under Review"
    UNVERIFIED = "Unverified"


class ConfidenceLevel(str, Enum):
    HIGH = "Verified Official Guideline"
    MEDIUM = "Partial - Needs Confirmation"
    UNVERIFIED = "Unverified - Pending Human Check"


class EligibilityState(str, Enum):
    SOME_CRITERIA_CONSISTENT = "Some stated criteria appear consistent"
    ADDITIONAL_INFO_REQUIRED = "Additional information required"
    INCONSISTENT = "One or more stated criteria appear inconsistent"
    UNABLE_TO_ASSESS = "Unable to assess with available information"


OPERATOR_NORMALIZATION_MAP = {
    "eq": "equals",
    "equals": "equals",
    "in": "in",
    "min": "min",
    "gte": "min",
    "max": "max",
    "lte": "max",
    "range": "range",
    "boolean": "boolean",
}

GOV_LEVEL_NORMALIZATION_MAP = {
    "Central": GovernmentLevel.CENTRAL,
    "Central Government": GovernmentLevel.CENTRAL,
    GovernmentLevel.CENTRAL: GovernmentLevel.CENTRAL,
    "State": GovernmentLevel.STATE,
    "Odisha State Government": GovernmentLevel.STATE,
    GovernmentLevel.STATE: GovernmentLevel.STATE,
}


class EligibilityCondition:
    """
    Canonical representation of a single structured eligibility requirement.
    Supports both field naming conventions found in the codebase:
    - Canonical: (criterion_id, field, operator, value)
    - Legacy alias (`EligibilityRule`): (rule_id, field_name, operator, expected_value)
    """

    def __init__(
        self,
        criterion_id: Optional[str] = None,
        field: Optional[str] = None,
        operator: str = "equals",
        value: Any = None,
        description: str = "",
        is_mandatory: bool = True,
        has_exceptions: bool = False,
        exception_note: Optional[str] = None,
        *,
        rule_id: Optional[str] = None,
        field_name: Optional[str] = None,
        expected_value: Any = None,
    ) -> None:
        resolved_id = (criterion_id or rule_id or "").strip()
        if len(resolved_id) < 2:
            raise ValidationError("criterion_id / rule_id must be at least 2 characters.")

        resolved_field = (field or field_name or "").strip()
        if not resolved_field:
            raise ValidationError("field / field_name is required on EligibilityCondition.")

        if operator not in OPERATOR_NORMALIZATION_MAP:
            raise ValidationError(f"Unsupported operator: {operator}")

        resolved_value = value if value is not None else expected_value
        if resolved_value is None:
            raise ValidationError("value / expected_value is required on EligibilityCondition.")

        if not description or len(description.strip()) < 5:
            raise ValidationError("description must be at least 5 characters.")

        # If operator is "boolean" or expected value is a bool with "eq", normalize
        norm_op = OPERATOR_NORMALIZATION_MAP[operator]
        if isinstance(resolved_value, bool) and norm_op == "equals":
            norm_op = "boolean"

        self.criterion_id: str = resolved_id
        self.field: str = resolved_field
        self.operator: str = norm_op
        self.raw_operator: str = operator
        self.value: Any = resolved_value
        self.description: str = description.strip()
        self.is_mandatory: bool = bool(is_mandatory)
        self.has_exceptions: bool = bool(has_exceptions)
        self.exception_note: Optional[str] = exception_note

    @property
    def rule_id(self) -> str:
        return self.criterion_id

    @property
    def field_name(self) -> str:
        return self.field

    @property
    def expected_value(self) -> Any:
        return self.value

    def model_dump(self) -> Dict[str, Any]:
        return {
            "criterion_id": self.criterion_id,
            "field": self.field,
            "operator": self.operator,
            "value": self.value,
            "description": self.description,
            "is_mandatory": self.is_mandatory,
            "has_exceptions": self.has_exceptions,
            "exception_note": self.exception_note,
        }


# Backward-compatible alias so modules importing `EligibilityRule` continue to work
EligibilityRule = EligibilityCondition


class SchemeRecord:
    """
    Structured, provenance-tracked government scheme record.
    Validates URL security (`https://`), non-negative benefit amounts, and
    normalizes legacy vs. canonical field formats.
    """

    def __init__(
        self,
        scheme_id: str,
        scheme_name: str,
        short_description: str,
        detailed_description: str,
        government_level: Union[GovernmentLevel, str],
        responsible_department: str,
        scheme_category: str,
        applicable_states: List[str],
        target_beneficiaries: List[str],
        benefit_description: str,
        application_method: Union[List[str], str],
        required_documents: List[str],
        official_scheme_url: str,
        official_application_url: str,
        source_document_url: str,
        source_title: str,
        source_publisher: str,
        source_last_verified_at: str,
        notes_and_limitations: str = "Verify current rules on the official portal.",
        applicable_districts: Optional[List[str]] = None,
        eligibility_conditions: Optional[List[Union[EligibilityCondition, Dict[str, Any]]]] = None,
        exclusions: Optional[List[str]] = None,
        benefit_amount: Optional[float] = None,
        benefit_amount_unit: str = "INR",
        benefit_frequency: Optional[str] = None,
        benefit_unit_and_frequency: Optional[str] = None,
        source_publication_date: Optional[str] = None,
        scheme_effective_status: Union[SchemeStatus, str] = SchemeStatus.ACTIVE,
        scheme_validity_information: str = "Verify current cycle on official portal.",
        information_confidence: Union[ConfidenceLevel, str] = ConfidenceLevel.HIGH,
        unverified_fields: Optional[List[str]] = None,
    ) -> None:
        if not scheme_id or len(scheme_id.strip()) < 3:
            raise ValidationError("scheme_id must be at least 3 characters.")
        if not scheme_name or len(scheme_name.strip()) < 5:
            raise ValidationError("scheme_name must be at least 5 characters.")
        if not short_description or len(short_description.strip()) < 10:
            raise ValidationError("short_description must be at least 10 characters.")
        if not applicable_states or len(applicable_states) == 0:
            raise ValidationError("applicable_states must contain at least one state.")
        if benefit_amount is not None and float(benefit_amount) < 0:
            raise ValidationError("benefit_amount cannot be negative.")

        for url_field_name, url_val in [
            ("official_scheme_url", official_scheme_url),
            ("official_application_url", official_application_url),
            ("source_document_url", source_document_url),
        ]:
            if not isinstance(url_val, str) or not url_val.startswith("https://"):
                raise ValidationError(
                    f"{url_field_name} must start with 'https://' (got '{url_val}')."
                )

        self.scheme_id: str = scheme_id.strip()
        self.scheme_name: str = scheme_name.strip()
        self.short_description: str = short_description.strip()
        self.detailed_description: str = (detailed_description or short_description).strip()

        if government_level in GOV_LEVEL_NORMALIZATION_MAP:
            self.government_level: GovernmentLevel = GOV_LEVEL_NORMALIZATION_MAP[government_level]
        else:
            raise ValidationError(f"Invalid government_level: {government_level}")

        self.responsible_department: str = responsible_department.strip()
        self.scheme_category: str = scheme_category.strip()
        self.applicable_states: List[str] = list(applicable_states)
        self.applicable_districts: List[str] = (
            list(applicable_districts) if applicable_districts else ["All Districts"]
        )
        self.target_beneficiaries: List[str] = list(target_beneficiaries)

        parsed_conditions: List[EligibilityCondition] = []
        for item in eligibility_conditions or []:
            if isinstance(item, EligibilityCondition):
                parsed_conditions.append(item)
            elif isinstance(item, dict):
                parsed_conditions.append(EligibilityCondition(**item))
            else:
                raise ValidationError(f"Invalid eligibility condition: {item}")
        self.eligibility_conditions: List[EligibilityCondition] = parsed_conditions

        self.exclusions: List[str] = list(exclusions) if exclusions else []
        self.benefit_description: str = benefit_description.strip()
        self.benefit_amount: Optional[float] = (
            float(benefit_amount) if benefit_amount is not None else None
        )
        self.benefit_amount_unit: str = benefit_amount_unit
        resolved_freq = benefit_frequency or benefit_unit_and_frequency or "As per guidelines"
        self.benefit_frequency: str = resolved_freq
        self.benefit_unit_and_frequency: str = resolved_freq

        if isinstance(application_method, str):
            self.application_method: List[str] = [application_method]
        elif isinstance(application_method, list) and len(application_method) > 0:
            self.application_method = [str(m) for m in application_method]
        else:
            raise ValidationError("application_method must be a non-empty list or string.")

        if not required_documents or len(required_documents) == 0:
            raise ValidationError("required_documents must contain at least one item.")
        self.required_documents: List[str] = list(required_documents)

        self.official_scheme_url: str = official_scheme_url.strip()
        self.official_application_url: str = official_application_url.strip()
        self.source_document_url: str = source_document_url.strip()
        self.source_title: str = source_title.strip()
        self.source_publisher: str = source_publisher.strip()
        self.source_publication_date: str = source_publication_date or "Unknown"
        self.source_last_verified_at: str = source_last_verified_at.strip()

        self.scheme_effective_status: SchemeStatus = (
            scheme_effective_status
            if isinstance(scheme_effective_status, SchemeStatus)
            else SchemeStatus(scheme_effective_status)
        )
        self.scheme_validity_information: str = scheme_validity_information
        self.information_confidence: ConfidenceLevel = (
            information_confidence
            if isinstance(information_confidence, ConfidenceLevel)
            else ConfidenceLevel(information_confidence)
        )
        self.notes_and_limitations: str = notes_and_limitations
        self.unverified_fields: List[str] = list(unverified_fields) if unverified_fields else []

    def model_dump(self) -> Dict[str, Any]:
        return {
            "scheme_id": self.scheme_id,
            "scheme_name": self.scheme_name,
            "short_description": self.short_description,
            "detailed_description": self.detailed_description,
            "government_level": self.government_level.value,
            "responsible_department": self.responsible_department,
            "scheme_category": self.scheme_category,
            "applicable_states": self.applicable_states,
            "applicable_districts": self.applicable_districts,
            "target_beneficiaries": self.target_beneficiaries,
            "eligibility_conditions": [c.model_dump() for c in self.eligibility_conditions],
            "exclusions": self.exclusions,
            "benefit_description": self.benefit_description,
            "benefit_amount": self.benefit_amount,
            "benefit_amount_unit": self.benefit_amount_unit,
            "benefit_frequency": self.benefit_frequency,
            "application_method": self.application_method,
            "required_documents": self.required_documents,
            "official_scheme_url": self.official_scheme_url,
            "official_application_url": self.official_application_url,
            "source_document_url": self.source_document_url,
            "source_title": self.source_title,
            "source_publisher": self.source_publisher,
            "source_publication_date": self.source_publication_date,
            "source_last_verified_at": self.source_last_verified_at,
            "scheme_effective_status": self.scheme_effective_status.value,
            "scheme_validity_information": self.scheme_validity_information,
            "information_confidence": self.information_confidence.value,
            "notes_and_limitations": self.notes_and_limitations,
            "unverified_fields": self.unverified_fields,
        }

    def model_dump_json(self) -> str:
        import json

        return json.dumps(self.model_dump(), ensure_ascii=False)

    @classmethod
    def model_validate_json(cls, raw_json: str) -> "SchemeRecord":
        import json

        data = json.loads(raw_json)
        return cls(**data)


class UserProfile:
    """
    Optional user profile for preliminary scheme discovery.
    Supports both attribute access (`profile.state`) and dictionary access
    (`profile.get("state")`) so it works across all eligibility and ranking modules.
    """

    def __init__(
        self,
        state: Optional[str] = None,
        district: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        occupation: Optional[str] = None,
        is_student: Optional[bool] = None,
        annual_income: Optional[float] = None,
        social_category: Optional[str] = None,
        has_disability: Optional[bool] = None,
        landholding_status: Optional[str] = None,
        primary_need: Optional[str] = None,
        stated_need: Optional[str] = None,
    ) -> None:
        self.state = state
        self.district = district
        self.age = age
        self.gender = gender
        self.occupation = occupation
        self.is_student = is_student
        self.annual_income = annual_income
        self.social_category = social_category
        self.has_disability = has_disability
        self.landholding_status = landholding_status
        self.primary_need = primary_need or stated_need
        self.stated_need = stated_need or primary_need

    def to_dict(self) -> Dict[str, Any]:
        return {
            "state": self.state,
            "district": self.district,
            "age": self.age,
            "gender": self.gender,
            "occupation": self.occupation,
            "is_student": self.is_student,
            "annual_income": self.annual_income,
            "social_category": self.social_category,
            "has_disability": self.has_disability,
            "landholding_status": self.landholding_status,
            "primary_need": self.primary_need,
            "stated_need": self.stated_need,
        }

    def get(self, key: str, default: Any = None) -> Any:
        return self.to_dict().get(key, default)
