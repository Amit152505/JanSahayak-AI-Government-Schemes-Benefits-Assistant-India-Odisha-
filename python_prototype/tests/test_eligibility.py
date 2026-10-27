from src.models import SchemeRecord, EligibilityCondition
from src.eligibility import evaluate_scheme_eligibility
from src.recommendation import recommend_schemes, rank_and_recommend_schemes


def make_pension_scheme() -> SchemeRecord:
    return SchemeRecord(
        scheme_id="odisha-madhu-babu-pension",
        scheme_name="Madhu Babu Pension Yojana (MBPY)",
        short_description="Monthly social security pension for elderly, widows, and PwD in Odisha.",
        detailed_description="Provides monthly pension to vulnerable senior citizens, widows, and PwD in Odisha.",
        government_level="Odisha State Government",
        responsible_department="SSEPD Department, Government of Odisha",
        scheme_category="Social Security & Pensions",
        applicable_states=["Odisha"],
        target_beneficiaries=[
            "Senior citizens",
            "Persons with disabilities",
            "Women seeking eligible benefits",
        ],
        eligibility_conditions=[
            EligibilityCondition(
                criterion_id="mbpy-state",
                field="state",
                operator="equals",
                value="Odisha",
                description="Must be a permanent resident of Odisha.",
                is_mandatory=True,
                has_exceptions=False,
            ),
            EligibilityCondition(
                criterion_id="mbpy-age",
                field="age",
                operator="min",
                value=60,
                description="Must be 60 years or above for Old Age Pension.",
                is_mandatory=False,
                has_exceptions=True,
                exception_note="Age requirement is waived for widows and lowered to 5+ years for PwD.",
            ),
            EligibilityCondition(
                criterion_id="mbpy-income",
                field="annual_income",
                operator="max",
                value=60000,
                description="Annual family income must not exceed Rs. 60,000.",
                is_mandatory=True,
                has_exceptions=False,
            ),
        ],
        exclusions=["Recipients of another government pension."],
        benefit_description="Rs. 1,000+ per month.",
        benefit_amount=12000.0,
        benefit_frequency="Per Year",
        application_method=["Apply on ssepd.odisha.gov.in or at Block office."],
        required_documents=["Aadhaar Card", "Income Certificate", "Age Proof"],
        official_scheme_url="https://ssepd.odisha.gov.in/",
        official_application_url="https://ssepd.odisha.gov.in/",
        source_document_url="https://ssepd.odisha.gov.in/schemes-and-programs/social-security",
        source_title="MBPY Consolidated Rules",
        source_publisher="SSEPD Department, Odisha",
        source_publication_date="2024-02-15",
        source_last_verified_at="2026-10-16",
        notes_and_limitations="Verify exact slab rate with Block Social Security Officer.",
        unverified_fields=[],
    )


def test_clear_match_returns_consistent_state() -> None:
    scheme = make_pension_scheme()
    profile = {"state": "Odisha", "age": 66, "annual_income": 45000}
    res = evaluate_scheme_eligibility(scheme, profile)

    assert res["eligibility_state"] == "Some stated criteria appear consistent"
    assert len(res["matched_criteria"]) == 3
    assert len(res["unknown_criteria"]) == 0
    assert len(res["inconsistent_criteria"]) == 0
    # Verify exclusions are surfaced so they are never silently ignored
    assert "Recipients of another government pension." in res["exclusions_to_verify"]


def test_missing_income_is_flagged_unknown_never_inconsistent() -> None:
    scheme = make_pension_scheme()
    profile = {"state": "Odisha", "age": 66, "annual_income": None}
    res = evaluate_scheme_eligibility(scheme, profile)

    assert res["eligibility_state"] == "Additional information required"
    assert len(res["unknown_criteria"]) == 1
    assert len(res["inconsistent_criteria"]) == 0


def test_exception_rule_flags_age_exception_instead_of_rejecting() -> None:
    scheme = make_pension_scheme()
    profile = {"state": "Odisha", "age": 34, "annual_income": 40000}
    res = evaluate_scheme_eligibility(scheme, profile)

    assert res["eligibility_state"] == "Additional information required"
    assert len(res["flagged_exceptions"]) == 1
    assert len(res["inconsistent_criteria"]) == 0


def test_borderline_threshold_values_evaluated_accurately() -> None:
    """Tests exact boundary values (age == 60 and annual_income == 60000 vs 60001)."""
    scheme = make_pension_scheme()
    exact_boundary = {"state": "Odisha", "age": 60, "annual_income": 60000}
    res_exact = evaluate_scheme_eligibility(scheme, exact_boundary)
    assert res_exact["eligibility_state"] == "Some stated criteria appear consistent"

    over_income = {"state": "Odisha", "age": 60, "annual_income": 60001}
    res_over = evaluate_scheme_eligibility(scheme, over_income)
    assert res_over["eligibility_state"] == "One or more stated criteria appear inconsistent"


def test_geographic_mismatch_returns_inconsistent() -> None:
    scheme = make_pension_scheme()
    profile = {"state": "Maharashtra", "age": 68, "annual_income": 35000}
    res = evaluate_scheme_eligibility(scheme, profile)

    assert res["eligibility_state"] == "One or more stated criteria appear inconsistent"
    assert len(res["inconsistent_criteria"]) >= 1

    # Also verify both rank_and_recommend_schemes and recommend_schemes work
    ranked = rank_and_recommend_schemes([scheme], profile)
    assert len(ranked) == 1
    assert ranked[0]["eligibility_state"] == "One or more stated criteria appear inconsistent"
    filtered_recs = recommend_schemes([scheme], profile)
    assert len(filtered_recs) == 0
