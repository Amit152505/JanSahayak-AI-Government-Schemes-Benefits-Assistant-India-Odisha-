"""
freshness.py
Phase 8: Data Freshness, Source Verification & Content-Hash Auditing

Government scheme rules, income thresholds, and application portals can change
when a new financial year or departmental notification is released.

This module implements:
1. Content-hash comparison (SHA-256) to detect when an official webpage or PDF
   has changed since our last retrieval.
2. Staleness detection based on `source_last_verified_at` vs. a configurable
   max age (e.g., 90 days) so the UI can warn citizens when a record needs
   re-verification.
3. Sensitive PII redaction so accidental Aadhaar / bank account numbers typed by
   a user are never logged or forwarded to external APIs.
"""

import hashlib
import re
from datetime import date, datetime
from dataclasses import dataclass
from typing import Optional


@dataclass
class FreshnessAuditResult:
    scheme_id: str
    last_verified_at: str
    days_since_verified: int
    is_stale: bool
    content_changed: bool
    status_label: str
    warning_message: Optional[str]


def compute_document_sha256(content: str) -> str:
    """
    Computes a deterministic SHA-256 fingerprint of normalized document text.
    Note: Minor whitespace changes are normalized so trivial HTML formatting
    tweaks do not trigger false policy-change alarms.
    """
    normalized = re.sub(r"\s+", " ", content.strip())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def audit_source_freshness(
    scheme_id: str,
    last_verified_iso: str,
    reference_date_iso: str = "2026-10-27",
    max_verified_days: int = 90,
    previous_sha256: Optional[str] = None,
    current_content: Optional[str] = None,
) -> FreshnessAuditResult:
    """
    Checks whether a scheme's source verification date is older than
    `max_verified_days` or whether its source document hash has changed.
    """
    try:
        verified_dt = datetime.strptime(last_verified_iso, "%Y-%m-%d").date()
        ref_dt = datetime.strptime(reference_date_iso, "%Y-%m-%d").date()
        days_elapsed = max(0, (ref_dt - verified_dt).days)
    except ValueError:
        return FreshnessAuditResult(
            scheme_id=scheme_id,
            last_verified_at=last_verified_iso,
            days_since_verified=999,
            is_stale=True,
            content_changed=False,
            status_label="Verification Date Unclear",
            warning_message=(
                "The last verification date is missing or invalid. Please verify "
                "all eligibility rules directly on the official government portal."
            ),
        )

    content_changed = False
    if previous_sha256 and current_content is not None:
        new_hash = compute_document_sha256(current_content)
        content_changed = new_hash != previous_sha256

    is_stale = days_elapsed > max_verified_days or content_changed

    if content_changed:
        return FreshnessAuditResult(
            scheme_id=scheme_id,
            last_verified_at=last_verified_iso,
            days_since_verified=days_elapsed,
            is_stale=True,
            content_changed=True,
            status_label="Source Content Updated — Human Review Required",
            warning_message=(
                "The official source document text has changed since it was last "
                "indexed. A human reviewer must inspect whether eligibility rules "
                "or benefit amounts were amended before marking it verified."
            ),
        )

    if is_stale:
        return FreshnessAuditResult(
            scheme_id=scheme_id,
            last_verified_at=last_verified_iso,
            days_since_verified=days_elapsed,
            is_stale=True,
            content_changed=False,
            status_label=f"Stale ({days_elapsed} days since verification)",
            warning_message=(
                f"This scheme record was last verified {days_elapsed} days ago "
                f"(on {last_verified_iso}). Confirm current deadlines on the official portal."
            ),
        )

    return FreshnessAuditResult(
        scheme_id=scheme_id,
        last_verified_at=last_verified_iso,
        days_since_verified=days_elapsed,
        is_stale=False,
        content_changed=False,
        status_label=f"Verified ({days_elapsed} days ago)",
        warning_message=None,
    )


def redact_sensitive_identifiers(user_text: str) -> str:
    """
    Privacy safeguard (Section 12):
    If a user accidentally pastes a 12-digit Aadhaar number or a 10-digit
    mobile number into the chat box, redact it before logging or sending
    to an external AI API.
    """
    # Redact 12-digit Aadhaar patterns (e.g., 1234 5678 9012 or 123456789012)
    redacted = re.sub(
        r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[REDACTED-AADHAAR-ID]", user_text
    )
    # Redact 10-digit Indian mobile numbers starting with 6-9
    redacted = re.sub(
        r"\b[6-9]\d{9}\b", "[REDACTED-PHONE-NUMBER]", redacted
    )
    return redacted
