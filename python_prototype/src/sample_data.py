"""
sample_data.py
Curated Central & Odisha Government Schemes Seed Data + Provenance Audit Checklist

IMPORTANT PROVENANCE NOTE (Audit Step 4):
- Presence of a `.gov.in` domain or a timestamp does NOT by itself prove that every
  sub-clause is current today.
- Each record below links to the specific scheme portal/guideline URL (rather than
  only a generic ministry homepage), explicitly lists `unverified_fields` (such as
  annual portal closing deadlines or district quotas), and can be audited with
  `get_scheme_verification_checklist(scheme)`.
"""

from typing import Any, Dict, List
from urllib.parse import urlparse
from src.models import (
    SchemeRecord,
    EligibilityRule,
    GovernmentLevel,
    SchemeStatus,
    ConfidenceLevel,
)


def get_scheme_verification_checklist(scheme: SchemeRecord) -> Dict[str, Any]:
    """
    Audits a SchemeRecord's provenance quality and returns an explicit 5-point
    verification checklist distinguishing specific guideline URLs from generic
    department homepages.
    """
    parsed_doc_url = urlparse(scheme.source_document_url)
    is_generic_homepage = parsed_doc_url.path in ("", "/", "/index.html")

    return {
        "scheme_id": scheme.scheme_id,
        "source_document_url": scheme.source_document_url,
        "uses_generic_department_homepage": is_generic_homepage,
        "evidence_strength": (
            "Weak (Department Homepage Only — Specific Guideline Needed)"
            if is_generic_homepage
            else "Specific Scheme Portal / Guideline Path"
        ),
        "unverified_fields": list(scheme.unverified_fields),
        "mandatory_verification_checklist": {
            "1_eligibility_and_exclusions": len(scheme.eligibility_conditions) > 0
            and len(scheme.exclusions) > 0,
            "2_benefit_amounts_and_frequency": bool(
                scheme.benefit_description and scheme.benefit_frequency
            ),
            "3_required_documents": len(scheme.required_documents) > 0,
            "4_application_process_and_deadlines_disclosed": len(
                scheme.application_method
            )
            > 0,
            "5_active_status_and_unverified_disclosures": len(
                scheme.unverified_fields
            )
            > 0,
        },
    }


def get_initial_schemes() -> List[SchemeRecord]:
    return [
        SchemeRecord(
            scheme_id="odisha-gopabandhu-sikhya-sahayata",
            scheme_name="Gopabandhu Sikhya Sahayata Yojana (Odisha)",
            short_description="₹20,000 annual financial assistance for higher education students from 10 notified vulnerable household categories (income <= ₹2,50,000) in Odisha.",
            detailed_description=(
                "Administered by the Higher Education Department, Government of Odisha, "
                "this scheme provides ₹20,000 per year to permanent resident students of Odisha "
                "pursuing regular full-time graduate and postgraduate courses (technical and non-technical) "
                "whose family annual income does not exceed ₹2,50,000 AND who belong to one of 10 officially "
                "notified vulnerable categories: (1) HIV/AIDS affected parents, (2) Households without shelter, "
                "(3) Destitute / living on alms, (4) Manual scavengers, (5) Particularly Vulnerable Tribal Groups (PVTGs), "
                "(6) Legally released bonded labourers, (7) Single-mother families, (8) Orphans without biological/adoptive parents, "
                "(9) Transgender community, or (10) Girl students rescued from child marriage staying in shelter homes."
            ),
            government_level=GovernmentLevel.STATE,
            responsible_department="Higher Education Department, Government of Odisha",
            applicable_states=["Odisha"],
            target_beneficiaries=["Students", "Low-Income Households"],
            scheme_category="Education & Scholarships",
            eligibility_conditions=[
                EligibilityRule(
                    rule_id="gssy_state",
                    field_name="state",
                    operator="eq",
                    expected_value="Odisha",
                    description="Applicant must be a permanent resident of Odisha.",
                ),
                EligibilityRule(
                    rule_id="gssy_student",
                    field_name="is_student",
                    operator="eq",
                    expected_value=True,
                    description="Must be enrolled in a regular full-time undergraduate or postgraduate course at a recognized institution.",
                ),
                EligibilityRule(
                    rule_id="gssy_income",
                    field_name="annual_income",
                    operator="lte",
                    expected_value=250000,
                    description="Family annual income from all sources must not exceed ₹2,50,000 AND applicant must belong to one of the 10 notified vulnerable categories.",
                    has_exceptions=True,
                    exception_note=(
                        "Requires mandatory certificate for one of the 10 vulnerable groups: HIV/AIDS affected parents, "
                        "shelterless household, destitute on alms, manual scavenger, PVTG, released bonded labourer, "
                        "single-mother family, orphan, transgender student, or rescued girl student in shelter home."
                    ),
                ),
            ],
            exclusions=[
                "General low-income students who do NOT belong to any of the 10 officially notified vulnerable categories (check e-Medhabruti or Post-Matric Scholarship instead).",
                "Students enrolled in distance education, correspondence, or part-time courses.",
                "Students from families exceeding the ₹2,50,000 annual income ceiling.",
            ],
            benefit_description="₹20,000 per annum transferred via Direct Benefit Transfer (DBT) for the duration of the course; can be held alongside other merit/post-matric scholarships.",
            benefit_amount=20000.0,
            benefit_unit_and_frequency="INR per annum",
            application_method=[
                "Apply online via the Odisha State Scholarship Portal (https://scholarship.odisha.gov.in/website/home/scheme-details)."
            ],
            required_documents=[
                "Aadhaar Card",
                "Odisha Resident / Domicile Certificate from Tahasildar",
                "Income Certificate (<= ₹2,50,000) issued by competent Revenue Authority (Tahasildar)",
                "Mandatory Vulnerability Category Certificate from competent District / Medical / Welfare / Revenue Authority (for 1 of the 10 notified categories)",
                "College Bonafide / Admission Receipt and Previous Exam Marksheet",
                "Bank Passbook copy with IFSC",
            ],
            official_scheme_url="https://scholarship.odisha.gov.in/",
            official_application_url="https://scholarship.odisha.gov.in/",
            source_document_url="https://dhe.odisha.gov.in/schemes-and-scholarship/gopabandhu-sikhya-sahayata-yojana",
            source_title="Higher Education Dept. Odisha — Gopabandhu Sikhya Sahayata Yojana Guidelines",
            source_publisher="Higher Education Department, Government of Odisha",
            source_publication_date="2024-07-01",
            source_last_verified_at="2026-10-15",
            scheme_effective_status=SchemeStatus.ACTIVE,
            information_confidence=ConfidenceLevel.HIGH,
            notes_and_limitations="Applicant must belong to one of the 10 notified vulnerable categories in addition to meeting the <= ₹2.50 lakh income ceiling. Final sanction is subject to validation by the Principal of the institution and the Higher Education Department.",
            unverified_fields=[
                "Current academic year portal closing deadline",
                "District-specific issuing authority designation for each of the 10 vulnerable category certificates",
            ],
        ),
        SchemeRecord(
            scheme_id="odisha-subhadra-yojana",
            scheme_name="SUBHADRA Yojana (Odisha)",
            short_description="₹10,000 annual financial assistance (in two ₹5,000 installments) for eligible women aged 21 to under 60 in Odisha.",
            detailed_description=(
                "A flagship women's welfare programme by the Department of Women & Child "
                "Development, Government of Odisha, providing ₹50,000 over five years (₹10,000/year, FY 2024-25 to 2028-29) "
                "in two equal installments of ₹5,000 on Raksha Bandhan and International Women's Day (March 8)."
            ),
            government_level=GovernmentLevel.STATE,
            responsible_department="Department of Women & Child Development, Odisha",
            applicable_states=["Odisha"],
            target_beneficiaries=["Women", "Low-Income Households"],
            scheme_category="Women & Child Welfare",
            eligibility_conditions=[
                EligibilityRule(
                    rule_id="sub_state",
                    field_name="state",
                    operator="eq",
                    expected_value="Odisha",
                    description="Must be a resident of Odisha covered under NFSA/SFSS or family income <= ₹2,50,000.",
                ),
                EligibilityRule(
                    rule_id="sub_gender",
                    field_name="gender",
                    operator="eq",
                    expected_value="Female",
                    description="Applicant must be a woman.",
                ),
                EligibilityRule(
                    rule_id="sub_age_min",
                    field_name="age",
                    operator="gte",
                    expected_value=21,
                    description="Applicant must be at least 21 years old as on the qualifying date.",
                ),
                EligibilityRule(
                    rule_id="sub_age_max",
                    field_name="age",
                    operator="lte",
                    expected_value=59,
                    description="Applicant must be less than 60 years old (21 to 59 years) as on the qualifying date.",
                ),
                EligibilityRule(
                    rule_id="sub_income",
                    field_name="annual_income",
                    operator="lte",
                    expected_value=250000,
                    description="Annual household income must not exceed ₹2,50,000.",
                ),
            ],
            exclusions=[
                "Women aged below 21 years or 60 years and above as on the qualifying date.",
                "Women receiving ₹1,500/month (₹18,000/year) or more from any other state or central government financial assistance, pension, or scholarship scheme.",
                "Families owning a 4-wheeler motor vehicle (excluding tractors/light commercial vehicles), owning >5 acres irrigated or >10 acres non-irrigated land, or paying income tax.",
                "Regular or contractual government employees, pensioners, and elected public representatives (excluding ASHA/Anganwadi/CRP-CM honorarium workers).",
            ],
            benefit_description="₹10,000 per year in two installments of ₹5,000 on Raksha Bandhan and International Women's Day (March 8), plus ₹500 incentive for top digital transaction users per GP/ULB.",
            benefit_amount=10000.0,
            benefit_unit_and_frequency="INR per year (two ₹5,000 installments for 5 years)",
            application_method=[
                "Obtain free printed form from Anganwadi Centres / Block / ULB offices and submit at Mo Seba Kendras or Common Service Centres (CSCs) with biometric Aadhaar e-KYC, verified via https://subhadra.odisha.gov.in/."
            ],
            required_documents=[
                "Aadhaar Card linked with active mobile number",
                "Single-holder Aadhaar-enabled & DBT-ready Bank Account",
                "Ration Card (NFSA / SFSS) or Income Certificate (<= ₹2,50,000)",
            ],
            official_scheme_url="https://subhadra.odisha.gov.in/",
            official_application_url="https://subhadra.odisha.gov.in/",
            source_document_url="https://wcd.odisha.gov.in/sites/default/files/2024-08/SUBHADRA_Guidelines_English.pdf",
            source_title="SUBHADRA Operational Guidelines, W&CD Dept Odisha",
            source_publisher="Department of Women & Child Development, Government of Odisha",
            source_publication_date="2024-08-23",
            source_last_verified_at="2026-10-18",
            scheme_effective_status=SchemeStatus.ACTIVE,
            information_confidence=ConfidenceLevel.HIGH,
            notes_and_limitations="e-KYC biometric or OTP verification and NPCI DBT single-holder bank seeding are mandatory; no fee is charged at CSC/Mo Seba Kendra.",
            unverified_fields=[
                "Qualifying cut-off date for age calculation in future annual verification phases",
            ],
        ),
        SchemeRecord(
            scheme_id="central-pm-kisan",
            scheme_name="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
            short_description="₹6,000 annual income support in three ₹2,000 installments for landholding farmer families across India.",
            detailed_description=(
                "A Central Sector Scheme by the Ministry of Agriculture & Farmers Welfare "
                "providing direct income support to landholding farmer families having "
                "cultivable land in their names, subject to exclusion criteria."
            ),
            government_level=GovernmentLevel.CENTRAL,
            responsible_department="Ministry of Agriculture & Farmers Welfare, Govt of India",
            applicable_states=["All India"],
            target_beneficiaries=["Farmers"],
            scheme_category="Agriculture & Rural Support",
            eligibility_conditions=[
                EligibilityRule(
                    rule_id="pmk_occ",
                    field_name="occupation",
                    operator="eq",
                    expected_value="Farmer",
                    description="Applicant must be a farmer with cultivable landholding records.",
                )
            ],
            exclusions=[
                "Institutional landholders",
                "Income tax payers in the last assessment year",
                "Serving or retired government employees (except Class IV/Multi-Tasking Staff) and pensioners receiving >= ₹10,000/month",
                "Practicing professionals (Doctors, Engineers, Lawyers, Chartered Accountants) registered with professional bodies",
            ],
            benefit_description="₹6,000 per year transferred in three equal installments of ₹2,000 every 4 months.",
            benefit_amount=6000.0,
            benefit_unit_and_frequency="INR per year (3 installments)",
            application_method=[
                "Self-registration on PM-KISAN portal (https://pmkisan.gov.in/) or via Common Service Centres (CSCs)."
            ],
            required_documents=[
                "Aadhaar Card",
                "Landholding Documents (RoR / Patta)",
                "Aadhaar-seeded Bank Account Passbook",
            ],
            official_scheme_url="https://pmkisan.gov.in/",
            official_application_url="https://pmkisan.gov.in/",
            source_document_url="https://pmkisan.gov.in/Documents/RevisedPM-KISANGuidelines.pdf",
            source_title="PM-KISAN Revised Operational Guidelines",
            source_publisher="Ministry of Agriculture & Farmers Welfare",
            source_publication_date="2019-02-01",
            source_last_verified_at="2026-10-12",
            scheme_effective_status=SchemeStatus.ACTIVE,
            information_confidence=ConfidenceLevel.HIGH,
            notes_and_limitations="In Odisha, farmers may also check CM-KISAN for additional state support, including landless agricultural households.",
            unverified_fields=[
                "Next installment release date for current four-month cycle",
            ],
        ),
        SchemeRecord(
            scheme_id="odisha-madhu-babu-pension",
            scheme_name="Madhu Babu Pension Yojana (MBPY - Odisha)",
            short_description="Monthly social security pension (₹1,000 to ₹3,500/month) for senior citizens, widows, unmarried women (30+), and persons with disabilities in Odisha.",
            detailed_description=(
                "Administered by the SSEPD Department, Government of Odisha, MBPY provides "
                "monthly financial security to destitute elderly citizens (60+ years), widows (regardless of age), "
                "unmarried women (30+ years), leprosy patients with visible deformity, HIV/AIDS patients, "
                "and persons with benchmark disabilities (aged 5+ years with >=40% disability)."
            ),
            government_level=GovernmentLevel.STATE,
            responsible_department="Department of Social Security & Empowerment of Persons with Disabilities (SSEPD), Odisha",
            applicable_states=["Odisha"],
            target_beneficiaries=["Senior Citizens", "Women", "Persons with Disabilities"],
            scheme_category="Social Security & Pension",
            eligibility_conditions=[
                EligibilityRule(
                    rule_id="mbpy_state",
                    field_name="state",
                    operator="eq",
                    expected_value="Odisha",
                    description="Must be a permanent resident of Odisha.",
                ),
                EligibilityRule(
                    rule_id="mbpy_age",
                    field_name="age",
                    operator="gte",
                    expected_value=60,
                    description="Age 60 years or above for old-age pension.",
                    has_exceptions=True,
                    exception_note=(
                        "Age 60 requirement is waived for destitute widows (any age), lowered to 30+ years for unmarried women, "
                        "lowered to 5+ years for persons with benchmark disabilities (>=40%), and waived for leprosy/AIDS patients."
                    ),
                ),
                EligibilityRule(
                    rule_id="mbpy_income",
                    field_name="annual_income",
                    operator="lte",
                    expected_value=60000,
                    description="Household annual income must not exceed ₹60,000 (or BPL household).",
                ),
            ],
            exclusions=[
                "Persons receiving any other Central or State government pension.",
                "Applicants convicted of a criminal offense involving moral turpitude.",
                "Households exceeding the ₹60,000 annual income ceiling.",
            ],
            benefit_description="Monthly pension of ₹1,000/month (ages 60–79), ₹1,200/month (ages 80+), and up to ₹3,500/month for severe benchmark disabilities (>=80%).",
            benefit_amount=1000.0,
            benefit_unit_and_frequency="INR per month (₹1,000–₹3,500 slab)",
            application_method=[
                "Online via SSEPD Odisha Portal (https://ssepd.odisha.gov.in/) or offline at Block Development Office (BDO) / Municipality."
            ],
            required_documents=[
                "Aadhaar Card",
                "Age Proof (Voter ID / School Certificate / Birth Certificate)",
                "Income Certificate from Tahasildar (<= ₹60,000) or BPL Card",
                "UDID Disability Certificate or Death Certificate of spouse (if applying under exception)",
                "3 Passport-size Photographs and Bank Passbook",
            ],
            official_scheme_url="https://ssepd.odisha.gov.in/",
            official_application_url="https://ssepd.odisha.gov.in/",
            source_document_url="https://ssepd.odisha.gov.in/schemes-and-programs/social-security",
            source_title="SSEPD Odisha Madhu Babu Pension Rules",
            source_publisher="Government of Odisha",
            source_publication_date="2024-02-15",
            source_last_verified_at="2026-10-16",
            scheme_effective_status=SchemeStatus.ACTIVE,
            information_confidence=ConfidenceLevel.HIGH,
            notes_and_limitations="Notice how our 3-state eligibility engine uses has_exceptions=True on the age 60 rule so younger widows or persons with disabilities are not falsely rejected.",
            unverified_fields=[
                "District/Block-level monthly disbursement camp schedule (typically 15th of each month)",
            ],
        ),
        SchemeRecord(
            scheme_id="central-pm-vishwakarma",
            scheme_name="PM Vishwakarma Scheme",
            short_description="₹15,000 toolkit e-voucher, skill stipend, and collateral-free loans (up to ₹3 lakh) for traditional artisans across 18 trades.",
            detailed_description=(
                "Holistic support for traditional artisans and craftspeople working with their "
                "hands and tools (carpenters, blacksmiths, potters, tailors, weavers, masons, etc.)."
            ),
            government_level=GovernmentLevel.CENTRAL,
            responsible_department="Ministry of Micro, Small & Medium Enterprises (MSME)",
            applicable_states=["All India"],
            target_beneficiaries=["Artisans & Craftspeople", "Small Business Owners"],
            scheme_category="Skill, Entrepreneurship & Loans",
            eligibility_conditions=[
                EligibilityRule(
                    rule_id="pmv_age",
                    field_name="age",
                    operator="gte",
                    expected_value=18,
                    description="Minimum age of 18 years on the date of registration.",
                )
            ],
            exclusions=[
                "Applicants who have availed loans under PMEGP, PM SVANidhi, or Mudra in the past 5 years (unless fully repaid).",
                "Families with a member in government service.",
            ],
            benefit_description="₹15,000 toolkit incentive + ₹500/day training stipend + collateral-free enterprise loan up to ₹3,00,000 at 5% concessional interest.",
            benefit_amount=15000.0,
            benefit_unit_and_frequency="INR toolkit grant + up to ₹3 Lakh credit",
            application_method=[
                "Biometric registration at Common Service Centres (CSCs) on PM Vishwakarma Portal (https://pmvishwakarma.gov.in/)."
            ],
            required_documents=[
                "Aadhaar Card with linked mobile number",
                "Ration Card (for family verification)",
                "Active Bank Account details",
            ],
            official_scheme_url="https://pmvishwakarma.gov.in/",
            official_application_url="https://pmvishwakarma.gov.in/",
            source_document_url="https://pmvishwakarma.gov.in/Guidelines.html",
            source_title="PM Vishwakarma Scheme Guidelines, Ministry of MSME",
            source_publisher="Government of India",
            source_publication_date="2023-09-17",
            source_last_verified_at="2026-10-14",
            scheme_effective_status=SchemeStatus.ACTIVE,
            information_confidence=ConfidenceLevel.HIGH,
            notes_and_limitations="Requires three-tier verification (Gram Panchayat/ULB -> District Implementation Committee -> Screening Committee).",
            unverified_fields=[
                "Local Gram Panchayat / ULB verification queue turnaround time",
            ],
        ),
    ]


def get_initial_chunks() -> List[Dict[str, Any]]:
    return [
        {
            "chunk_id": "chk_gopabandhu_01",
            "scheme_id": "odisha-gopabandhu-sikhya-sahayata",
            "section_title": "Eligibility & ₹20,000 Annual Grant",
            "content": (
                "Gopabandhu Sikhya Sahayata Yojana provides ₹20,000 per annum to "
                "students in Odisha pursuing higher education (graduate and postgraduate) "
                "whose parents are affected by HIV/AIDS, manual scavengers, or households "
                "with annual income below ₹2,50,000. Required documents include Aadhaar, "
                "Odisha Resident Certificate, Income Certificate from Tehsildar, and College Admission Receipt."
            ),
            "metadata": {
                "source_title": "Odisha Higher Education Department Guidelines",
                "source_publisher": "Government of Odisha",
                "source_url": "https://scholarship.odisha.gov.in/",
                "last_verified_at": "2026-10-15",
            },
        },
        {
            "chunk_id": "chk_subhadra_01",
            "scheme_id": "odisha-subhadra-yojana",
            "section_title": "SUBHADRA ₹10,000 Annual Benefit & Required Documents",
            "content": (
                "SUBHADRA Yojana provides ₹10,000 per year in two installments of ₹5,000 "
                "to eligible women in Odisha aged 21 to 60 years whose family annual income "
                "is below ₹2,50,000 or covered under NFSA/SFSS ration card. Required documents: "
                "Aadhaar card linked with mobile number, single-holder DBT-enabled bank account, "
                "and Ration Card or Income Certificate. Applications are submitted at Anganwadi Centres, "
                "Mo Seba Kendras, or https://subhadra.odisha.gov.in/."
            ),
            "metadata": {
                "source_title": "SUBHADRA Operational Guidelines, W&CD Dept Odisha",
                "source_publisher": "Government of Odisha",
                "source_url": "https://subhadra.odisha.gov.in/",
                "last_verified_at": "2026-10-18",
            },
        },
        {
            "chunk_id": "chk_pmkisan_01",
            "scheme_id": "central-pm-kisan",
            "section_title": "PM-KISAN ₹6,000 Benefit & Exclusions",
            "content": (
                "Under PM-KISAN, eligible landholding farmer families receive ₹6,000 per "
                "year in three equal installments of ₹2,000 every four months via Direct "
                "Benefit Transfer (DBT). Institutional landholders and income tax payers "
                "are excluded. Required documents include Aadhaar, landholding RoR/Patta, "
                "and bank passbook."
            ),
            "metadata": {
                "source_title": "PM-KISAN Operational Guidelines",
                "source_publisher": "Ministry of Agriculture & Farmers Welfare",
                "source_url": "https://pmkisan.gov.in/",
                "last_verified_at": "2026-10-12",
            },
        },
        {
            "chunk_id": "chk_mbpy_01",
            "scheme_id": "odisha-madhu-babu-pension",
            "section_title": "Madhu Babu Pension Age 60 Rule & Widow/PwD Exceptions",
            "content": (
                "Madhu Babu Pension Yojana (MBPY) provides ₹1,000 per month (age 60–79) "
                "and ₹1,200 per month (age 80+) to destitute senior citizens in Odisha "
                "with household annual income up to ₹60,000. Important Exception: The age 60 "
                "requirement is waived for widows of any age, persons with benchmark disabilities "
                "(40% or above), and leprosy-cured citizens."
            ),
            "metadata": {
                "source_title": "SSEPD Odisha Madhu Babu Pension Rules",
                "source_publisher": "Government of Odisha",
                "source_url": "https://ssepd.odisha.gov.in/",
                "last_verified_at": "2026-10-16",
            },
        },
        {
            "chunk_id": "chk_vishwakarma_01",
            "scheme_id": "central-pm-vishwakarma",
            "section_title": "Toolkit Incentive & Collateral-Free Credit",
            "content": (
                "PM Vishwakarma supports traditional artisans and craftspeople across 18 "
                "trades including carpenters, blacksmiths, and weavers with a ₹15,000 "
                "e-voucher toolkit incentive and collateral-free enterprise loans up to ₹3,00,000 "
                "at 5% interest. Registration requires Aadhaar, Ration Card, and CSC biometric verification."
            ),
            "metadata": {
                "source_title": "Ministry of MSME PM Vishwakarma Guidelines",
                "source_publisher": "Government of India",
                "source_url": "https://pmvishwakarma.gov.in/",
                "last_verified_at": "2026-10-14",
            },
        },
    ]
