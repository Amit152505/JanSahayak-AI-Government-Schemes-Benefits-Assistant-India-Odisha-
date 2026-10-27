import tempfile
from pathlib import Path
from src.models import (
    SchemeRecord,
    EligibilityCondition,
    EligibilityRule,
    GovernmentLevel,
    ValidationError,
)
from src.database import upsert_scheme, load_all_schemes, search_schemes


def make_sample_scheme() -> SchemeRecord:
    return SchemeRecord(
        scheme_id="odisha-gopabandhu-sikhya",
        scheme_name="Gopabandhu Sikhya Sahayata Yojana",
        short_description="Odisha state scholarship providing Rs. 20,000 per year to UG/PG students from low-income families.",
        detailed_description="Provides Rs. 20,000 per annum to permanent resident students in Odisha pursuing regular UG/PG courses.",
        government_level="Odisha State Government",
        responsible_department="Higher Education Department, Government of Odisha",
        scheme_category="Higher Education & Scholarships",
        applicable_states=["Odisha"],
        target_beneficiaries=["Students", "Low-Income Households"],
        eligibility_conditions=[
            EligibilityCondition(
                criterion_id="gssy-income",
                field="annual_income",
                operator="max",
                value=250000,
                description="Family annual income must not exceed Rs. 2,50,000.",
                is_mandatory=True,
                has_exceptions=True,
                exception_note="Vulnerable household categories qualify under special provisions.",
            )
        ],
        exclusions=["Distance learning students are excluded."],
        benefit_description="Rs. 20,000 per academic year via DBT.",
        benefit_amount=20000.0,
        benefit_frequency="Per Academic Year",
        application_method=["Apply on scholarship.odisha.gov.in"],
        required_documents=["Aadhaar Card", "Resident Certificate", "Income Certificate"],
        official_scheme_url="https://scholarship.odisha.gov.in/",
        official_application_url="https://scholarship.odisha.gov.in/",
        source_document_url="https://dhe.odisha.gov.in/schemes-and-scholarship/gopabandhu-sikhya-sahayata-yojana",
        source_title="Gopabandhu Sikhya Sahayata Yojana Guidelines",
        source_publisher="Higher Education Department, Odisha",
        source_publication_date="2024-07-01",
        source_last_verified_at="2026-10-12",
        notes_and_limitations="Verify exact portal closing deadline for current academic year.",
        unverified_fields=["Current academic year application deadline"],
    )


def test_valid_scheme_passes_validation() -> None:
    scheme = make_sample_scheme()
    assert scheme.scheme_id == "odisha-gopabandhu-sikhya"
    assert scheme.benefit_amount == 20000.0
    assert scheme.government_level == GovernmentLevel.STATE
    assert len(scheme.unverified_fields) == 1


def test_eligibility_rule_and_condition_unification() -> None:
    """Verifies that both EligibilityRule (legacy) and EligibilityCondition (canonical) schemas interoperate."""
    legacy_rule = EligibilityRule(
        rule_id="sub_income",
        field_name="annual_income",
        operator="lte",
        expected_value=250000,
        description="Annual household income must not exceed Rs. 2,50,000.",
    )
    assert legacy_rule.criterion_id == "sub_income"
    assert legacy_rule.rule_id == "sub_income"
    assert legacy_rule.field == "annual_income"
    assert legacy_rule.field_name == "annual_income"
    assert legacy_rule.operator == "max"
    assert legacy_rule.value == 250000
    assert legacy_rule.expected_value == 250000


def test_insecure_http_url_raises_validation_error() -> None:
    scheme_data = make_sample_scheme().model_dump()
    scheme_data["official_scheme_url"] = "http://insecure-portal.example.com"
    raised = False
    try:
        SchemeRecord(**scheme_data)
    except (ValidationError, ValueError):
        raised = True
    assert raised, "Expected ValidationError for insecure http:// URL"


def test_sqlite_roundtrip_and_filtering(tmp_path: Path | None = None) -> None:
    if tmp_path is None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            _run_sqlite_check(Path(tmp_dir))
    else:
        _run_sqlite_check(tmp_path)


def _run_sqlite_check(folder: Path) -> None:
    test_db = folder / "test_schemes.db"
    scheme = make_sample_scheme()
    upsert_scheme(scheme, db_path=test_db)

    loaded = load_all_schemes(db_path=test_db)
    assert len(loaded) == 1
    assert loaded[0].scheme_name == "Gopabandhu Sikhya Sahayata Yojana"

    # Filter by state
    odisha_matches = search_schemes(loaded, state="Odisha")
    assert len(odisha_matches) == 1

    # Non-Odisha state should not match an Odisha-only scheme
    gujarat_matches = search_schemes(loaded, state="Gujarat")
    assert len(gujarat_matches) == 0


if __name__ == "__main__":
    test_valid_scheme_passes_validation()
    test_eligibility_rule_and_condition_unification()
    test_insecure_http_url_raises_validation_error()
    test_sqlite_roundtrip_and_filtering()
    print("ALL 4 test_models.py checks PASSED!")
