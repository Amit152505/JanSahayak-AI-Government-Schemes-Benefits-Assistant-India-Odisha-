import sqlite3
from pathlib import Path
from typing import List, Optional, Union
from src.models import SchemeRecord, GOV_LEVEL_NORMALIZATION_MAP

DEFAULT_DB_PATH = Path("database/schemes.db")


def init_db(db_path: Path = DEFAULT_DB_PATH) -> None:
    """Creates the SQLite schemes table if it does not already exist."""
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schemes (
                scheme_id TEXT PRIMARY KEY,
                scheme_name TEXT NOT NULL,
                government_level TEXT NOT NULL,
                scheme_category TEXT NOT NULL,
                source_last_verified_at TEXT NOT NULL,
                record_json TEXT NOT NULL
            )
            """
        )


def upsert_scheme(
    scheme: SchemeRecord, db_path: Union[Path, str] = DEFAULT_DB_PATH
) -> None:
    """Inserts or updates a validated SchemeRecord in SQLite."""
    resolved_path = Path(db_path)
    init_db(resolved_path)
    gov_level_str = (
        scheme.government_level.value
        if hasattr(scheme.government_level, "value")
        else str(scheme.government_level)
    )
    with sqlite3.connect(resolved_path) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO schemes (
                scheme_id,
                scheme_name,
                government_level,
                scheme_category,
                source_last_verified_at,
                record_json
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                scheme.scheme_id,
                scheme.scheme_name,
                gov_level_str,
                scheme.scheme_category,
                scheme.source_last_verified_at,
                scheme.model_dump_json(),
            ),
        )


def load_all_schemes(
    db_path: Union[Path, str] = DEFAULT_DB_PATH,
) -> List[SchemeRecord]:
    """Loads and validates all stored schemes from SQLite."""
    resolved_path = Path(db_path)
    if not resolved_path.exists():
        return []
    with sqlite3.connect(resolved_path) as conn:
        rows = conn.execute(
            "SELECT record_json FROM schemes ORDER BY scheme_name ASC"
        ).fetchall()
    return [SchemeRecord.model_validate_json(row[0]) for row in rows]


def search_schemes(
    schemes: List[SchemeRecord],
    keyword: Optional[str] = None,
    government_level: Optional[str] = None,
    state: Optional[str] = None,
) -> List[SchemeRecord]:
    """Filters schemes by keyword, government level, and state scope."""
    results: List[SchemeRecord] = []
    normalized_level = None
    if government_level and government_level != "All":
        normalized_level = GOV_LEVEL_NORMALIZATION_MAP.get(
            government_level, government_level
        )

    for scheme in schemes:
        if normalized_level and scheme.government_level != normalized_level:
            continue

        if state and state != "All":
            if (
                "All India" not in scheme.applicable_states
                and state not in scheme.applicable_states
            ):
                continue

        if keyword and keyword.strip():
            q = keyword.strip().lower()
            haystack = (
                f"{scheme.scheme_name} {scheme.short_description} "
                f"{scheme.detailed_description} {scheme.scheme_category} "
                f"{' '.join(scheme.target_beneficiaries)}"
            ).lower()
            if q not in haystack:
                continue

        results.append(scheme)
    return results


class SchemeDatabase:
    """
    Object-oriented wrapper around the SQLite scheme functions used by
    `app.py` and `auto_importer.py`.
    """

    def __init__(self, db_path: Union[Path, str] = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)
        init_db(self.db_path)

    def upsert_scheme(self, scheme: SchemeRecord) -> None:
        upsert_scheme(scheme, db_path=self.db_path)

    def load_all_schemes(self) -> List[SchemeRecord]:
        return load_all_schemes(db_path=self.db_path)

    def search_schemes(
        self,
        keyword: Optional[str] = None,
        government_level: Optional[str] = None,
        state: Optional[str] = None,
    ) -> List[SchemeRecord]:
        all_schemes = self.load_all_schemes()
        return search_schemes(
            all_schemes,
            keyword=keyword,
            government_level=government_level,
            state=state,
        )
