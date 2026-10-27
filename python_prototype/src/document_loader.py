from pathlib import Path
import re
from typing import Dict, Any

try:
    from bs4 import BeautifulSoup

    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False


def _strip_html_fallback(raw_html: str) -> str:
    """Fallback HTML stripper using stdlib regex when BeautifulSoup4 is not installed."""
    cleaned = re.sub(
        r"<(script|style|nav)[^>]*>.*?</\1>",
        " ",
        raw_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    cleaned = re.sub(r"<[^>]+>", "\n", cleaned)
    return cleaned


def load_text_or_html_file(
    file_path: Path, metadata: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Loads an approved local .txt or .html guideline document and attaches metadata.
    Raises ValueError explicitly if the extracted content is empty.
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"Source file not found: {file_path}")

    raw_bytes = file_path.read_bytes()
    raw_str = raw_bytes.decode("utf-8", errors="replace")

    if file_path.suffix.lower() in {".html", ".htm"}:
        if BS4_AVAILABLE:
            soup = BeautifulSoup(raw_str, "html.parser")
            for tag in soup(["script", "style", "nav"]):
                tag.decompose()
            extracted_text = soup.get_text(separator="\n")
        else:
            extracted_text = _strip_html_fallback(raw_str)
    else:
        extracted_text = raw_str

    if not extracted_text or not extracted_text.strip():
        raise ValueError(
            f"Extracted text from '{file_path.name}' is empty. "
            "If this document is a scanned image PDF, OCR processing is required."
        )

    return {
        "file_name": file_path.name,
        "raw_text": extracted_text,
        "metadata": metadata,
    }
