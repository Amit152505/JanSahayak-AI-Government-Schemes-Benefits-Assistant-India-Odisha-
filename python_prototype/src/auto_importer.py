"""
auto_importer.py
Automated Scheme Discovery & Draft Ingestion with Honest Provenance Tracking

IMPORTANT PROVENANCE RULE (Audit Step 4):
Automatically imported or template-populated schemes are NEVER marked as
`Verified Official Guideline` or stamped with a fake `date.today()` verification
date. Instead, they are marked `Under Review` / `Partial - Needs Confirmation`
with an explicit `unverified_fields` checklist until a human verifies the official
government notification.
"""

from typing import Any, Dict, Tuple
from src.models import (
    SchemeRecord,
    EligibilityRule,
    GovernmentLevel,
    SchemeStatus,
    ConfidenceLevel,
)
from src.database import SchemeDatabase
from src.retrieval import HybridVectorStore


MANDATORY_HUMAN_VERIFICATION_CHECKLIST = [
    "Verify exact eligibility conditions and exclusions against current official PDF",
    "Verify current benefit amount and payment frequency",
    "Verify mandatory required documents list",
    "Verify official application portal URL and current closing deadline",
    "Confirm whether scheme is actively accepting applications for the current financial year",
]


DISCOVERABLE_PRESET_SCHEMES: Dict[str, SchemeRecord] = {
    "surya ghar": SchemeRecord(
        scheme_id="central-pm-surya-ghar",
        scheme_name="PM Surya Ghar: Muft Bijli Yojana",
        short_description="Up to ₹78,000 central subsidy for residential rooftop solar installations and up to 300 units of free electricity per month.",
        detailed_description=(
            "Administered by the Ministry of New and Renewable Energy (MNRE), "
            "this scheme provides ₹30,000/kW up to 2 kW and ₹18,000 for the 3rd kW "
            "(maximum ₹78,000) via Direct Benefit Transfer."
        ),
        government_level=GovernmentLevel.CENTRAL,
        responsible_department="Ministry of New and Renewable Energy (MNRE), Govt of India",
        applicable_states=["All India"],
        target_beneficiaries=["Households", "Low-Income Households"],
        scheme_category="Housing & Clean Energy",
        eligibility_conditions=[
            EligibilityRule(
                rule_id="surya_age",
                field_name="age",
                operator="gte",
                expected_value=18,
                description="Applicant must be an adult resident with an active electricity connection.",
            )
        ],
        exclusions=["Commercial/industrial connections and prior rooftop subsidy recipients."],
        benefit_description="₹30,000 (1 kW), ₹60,000 (2 kW), up to ₹78,000 (3 kW+) capital subsidy.",
        benefit_amount=78000.0,
        benefit_unit_and_frequency="INR one-time subsidy",
        application_method=[
            "Apply online on the National Rooftop Solar Portal (https://pmsuryaghar.gov.in/)."
        ],
        required_documents=[
            "Aadhaar Card",
            "Electricity Bill with Consumer Number",
            "Bank Passbook / Cancelled Cheque",
        ],
        official_scheme_url="https://pmsuryaghar.gov.in/",
        official_application_url="https://pmsuryaghar.gov.in/",
        source_document_url="https://pmsuryaghar.gov.in/",
        source_title="MNRE PM Surya Ghar Operational Guidelines",
        source_publisher="Government of India",
        source_publication_date="2024-02-29",
        source_last_verified_at="Unverified (Pending Human Check)",
        scheme_effective_status=SchemeStatus.UNDER_REVIEW,
        information_confidence=ConfidenceLevel.MEDIUM,
        notes_and_limitations="Auto-imported template; verify state DISCOM top-up subsidy rules before relying on amounts.",
        unverified_fields=list(MANDATORY_HUMAN_VERIFICATION_CHECKLIST),
    ),
    "krushi vidya nidhi": SchemeRecord(
        scheme_id="odisha-krushi-vidya-nidhi",
        scheme_name="Krushi Vidya Nidhi Yojana (Odisha)",
        short_description="Course fee and hostel scholarship for children of CM-KISAN / KALIA farmer families in Odisha pursuing professional higher education.",
        detailed_description=(
            "Administered by the Department of Agriculture & Farmers Empowerment, "
            "Government of Odisha, supporting children of small, marginal, and landless "
            "farmers in medical, engineering, agriculture, nursing, and postgraduate courses."
        ),
        government_level=GovernmentLevel.STATE,
        responsible_department="Department of Agriculture & Farmers Empowerment, Odisha",
        applicable_states=["Odisha"],
        target_beneficiaries=["Students", "Farmers"],
        scheme_category="Education & Scholarships",
        eligibility_conditions=[
            EligibilityRule(
                rule_id="kvn_state",
                field_name="state",
                operator="eq",
                expected_value="Odisha",
                description="Must be a permanent resident of Odisha.",
            ),
            EligibilityRule(
                rule_id="kvn_student",
                field_name="is_student",
                operator="eq",
                expected_value=True,
                description="Must be admitted on merit to a recognized professional/technical course.",
            ),
        ],
        exclusions=["Students already receiving another full-tuition state scholarship."],
        benefit_description="Direct Benefit Transfer of tuition fee and hostel/mess expenses.",
        benefit_amount=None,
        benefit_unit_and_frequency="INR per annum (varies by course)",
        application_method=[
            "Online via Odisha State Scholarship Portal (https://scholarship.odisha.gov.in/)."
        ],
        required_documents=[
            "Aadhaar Card",
            "Parent CM-KISAN / Ration Card",
            "Odisha Resident Certificate",
            "College Bonafide Admission Receipt",
        ],
        official_scheme_url="https://scholarship.odisha.gov.in/",
        official_application_url="https://scholarship.odisha.gov.in/",
        source_document_url="https://scholarship.odisha.gov.in/website/home/scheme-details",
        source_title="Odisha Agriculture Dept Krushi Vidya Nidhi Notification",
        source_publisher="Government of Odisha",
        source_publication_date="2024-09-10",
        source_last_verified_at="Unverified (Pending Human Check)",
        scheme_effective_status=SchemeStatus.UNDER_REVIEW,
        information_confidence=ConfidenceLevel.MEDIUM,
        notes_and_limitations="Auto-imported from Odisha State Scholarship Portal guidelines; requires human verification of current academic cycle deadlines.",
        unverified_fields=list(MANDATORY_HUMAN_VERIFICATION_CHECKLIST),
    ),
}


def auto_discover_and_ingest_scheme(
    query_or_url: str,
    db: SchemeDatabase,
    vector_store: HybridVectorStore,
) -> Tuple[SchemeRecord, Dict[str, Any]]:
    """
    Creates a draft `SchemeRecord` from a scheme name or URL, marks its
    verification status honestly as `Under Review` / `Unverified (Pending Human Check)`,
    saves it to SQLite, and indexes its summary chunk in `HybridVectorStore`.
    """
    lowered = query_or_url.strip().lower()

    matched_scheme: SchemeRecord | None = None
    for key, preset in DISCOVERABLE_PRESET_SCHEMES.items():
        if key in lowered or lowered in key:
            matched_scheme = preset
            break

    if matched_scheme is None:
        is_odisha = any(w in lowered for w in ["odisha", "biju", "gopabandhu", "kalia"])
        slug = "".join(ch if ch.isalnum() else "-" for ch in lowered).strip("-")[:36] or "custom"
        matched_scheme = SchemeRecord(
            scheme_id=f"{'odisha' if is_odisha else 'central'}-{slug}",
            scheme_name=query_or_url.strip(),
            short_description=f"Unverified draft scheme record for {query_or_url.strip()}.",
            detailed_description=(
                f"Automatically structured draft record for {query_or_url.strip()}. "
                "All eligibility conditions, amounts, and documents must be verified against an official notification."
            ),
            government_level=GovernmentLevel.STATE if is_odisha else GovernmentLevel.CENTRAL,
            responsible_department="Notified Government Department (Unverified)",
            applicable_states=["Odisha"] if is_odisha else ["All India"],
            target_beneficiaries=["General Citizens"],
            scheme_category="Public Welfare",
            eligibility_conditions=[
                EligibilityRule(
                    rule_id=f"{slug}_state",
                    field_name="state",
                    operator="eq",
                    expected_value="Odisha" if is_odisha else "All India",
                    description="Geographic scope rule (pending verification).",
                )
            ],
            exclusions=["Unverified — check official scheme notification for exclusions."],
            benefit_description="Unverified — check official scheme notification for benefit amount.",
            benefit_amount=None,
            benefit_unit_and_frequency="Unverified",
            application_method=[
                "Check https://www.myscheme.gov.in/ or the relevant ministry portal."
            ],
            required_documents=["Verify required documents on official portal"],
            official_scheme_url="https://www.myscheme.gov.in/",
            official_application_url="https://www.myscheme.gov.in/",
            source_document_url="https://www.myscheme.gov.in/",
            source_title=f"Draft Unverified Entry: {query_or_url.strip()}",
            source_publisher="Pending Official Source Verification",
            source_publication_date="Unknown",
            source_last_verified_at="Unverified",
            scheme_effective_status=SchemeStatus.UNVERIFIED,
            information_confidence=ConfidenceLevel.UNVERIFIED,
            notes_and_limitations="This is an unverified draft record. Do not rely on it until human verification is completed.",
            unverified_fields=list(MANDATORY_HUMAN_VERIFICATION_CHECKLIST),
        )

    db.upsert_scheme(matched_scheme)

    chunk_dict = {
        "chunk_id": f"chk_auto_{matched_scheme.scheme_id}",
        "scheme_id": matched_scheme.scheme_id,
        "section_title": f"{matched_scheme.scheme_name} — Draft Summary",
        "content": (
            f"{matched_scheme.scheme_name}: {matched_scheme.short_description} "
            f"Benefit: {matched_scheme.benefit_description} "
            f"Documents: {', '.join(matched_scheme.required_documents)}."
        ),
        "metadata": {
            "source_title": matched_scheme.source_title,
            "source_publisher": matched_scheme.source_publisher,
            "source_url": matched_scheme.official_scheme_url,
            "last_verified_at": matched_scheme.source_last_verified_at,
        },
    }
    vector_store.add_chunks([chunk_dict])

    return matched_scheme, chunk_dict
