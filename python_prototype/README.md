# JanSahayak — AI Government Schemes & Benefits Assistant (India & Odisha)

An independent, transparent civic discovery tool that helps citizens across India and Odisha discover government welfare schemes, understand preliminary eligibility conditions, inspect required documents, and verify official application portals using **3-State Rule Evaluation** and **Grounded Retrieval-Augmented Generation (RAG)**.

> **Important Disclaimer:** JanSahayak is an educational and informational project, **not** an official government service. It never guarantees scheme approval or benefit disbursement. Always verify current rules on the cited official `.gov.in` portals.

---

## 1. Problem Statement & Core Principles

Citizens often struggle to navigate public welfare schemes because guidelines are scattered across ministry portals and dense PDFs. At the same time, naive LLM chatbots frequently hallucinate eligibility rules, invent dead URLs, or falsely reject users when profile details are missing.

JanSahayak solves this by separating **deterministic rule checking** from **grounded document retrieval**:
1. **3-State Eligibility Logic**: Distinguishes between **Matched Evidence**, **Unknown / Missing Information** (never treated as a failure!), **Exception Flags** (e.g., age waivers for widows or persons with disabilities), and **Inconsistent Criteria**.
2. **Hybrid Vector + Keyword Search**: Combines semantic concept embeddings (`65%`) with exact keyword overlap (`35%`) so both natural-language queries (*"help me pay for college"*) and exact acronyms (*"PM-KISAN"*, *"SUBHADRA"*) retrieve the right passage.
3. **Strict Citation Provenance**: Citations are extracted exclusively from verified chunk metadata (`source_url`, `source_title`, `last_verified_at`), never invented by the language model.
4. **Offline-Ready Deterministic Fallback**: Runs out of the box without requiring a paid API key, while optionally supporting Gemini API synthesis when `GEMINI_API_KEY` is configured.

---

## 2. Project Structure

```text
python_prototype/
├── app.py                      # 4-Tab Streamlit Web Interface
├── requirements.txt            # Pinned Python dependencies
├── .env.example                # Environment variable template (no secrets)
├── .gitignore                  # Excludes venv/, .env, and SQLite .db files
├── src/
│   ├── models.py               # Pydantic schemas & 3-state enums
│   ├── database.py             # SQLite persistence & parameterized search
│   ├── eligibility.py          # 3-state rule evaluator & exception handler
│   ├── recommendation.py       # 2-stage hard filter + transparent ranking
│   ├── document_loader.py      # HTML/text extraction & scanned PDF detection
│   ├── text_processing.py      # Boilerplate cleaning & overlapping chunker
│   ├── embeddings.py           # Vector embeddings & cosine similarity
│   ├── retrieval.py            # HybridVectorStore (semantic + keyword search)
│   ├── citations.py            # Verified citation extraction & grounding audit
│   ├── rag.py                  # Grounded RAG pipeline & prompt-injection guard
│   ├── freshness.py            # SHA-256 content drift & PII redaction
│   ├── odia_language.py        # Odia (ଓଡ଼ିଆ) bilingual glossary & query expansion
│   └── sample_data.py          # Curated Central & Odisha schemes dataset
└── tests/
    ├── test_models.py          # Schema validation & SQLite CRUD tests
    ├── test_eligibility.py     # 3-state logic & exception flag tests
    ├── test_chunking.py        # Document cleaning & overlap chunking tests
    ├── test_retrieval.py       # Cosine similarity & hybrid search tests
    ├── test_rag.py             # Grounded answers & prompt-injection tests
    └── test_evaluation.py      # Golden RAG benchmark, freshness & PII tests
```

---

## 3. Windows Setup & Installation

### PowerShell
```powershell
cd python_prototype
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Command Prompt (CMD)
```cmd
cd python_prototype
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

---

## 4. Running Automated Tests & Launching the App

### Run the 20 Automated Unit, Integration & Evaluation Tests:
```powershell
# PowerShell
$env:PYTHONPATH="."; pytest -v

# CMD
set PYTHONPATH=. && pytest -v
```

### Launch the Streamlit Application:
```powershell
streamlit run app.py
```

---

## 5. Privacy, Security & Known Limitations

- **Zero Sensitive Identifiers Collected**: Never asks for Aadhaar numbers, bank account numbers, passwords, or OTPs. Accidental Aadhaar/phone inputs are automatically scrubbed via `redact_sensitive_identifiers()`.
- **Untrusted Document Isolation**: Retrieved passages are treated strictly as data, and adversarial prompt-injection patterns are blocked prior to synthesis.
- **Curated Scope**: Covers a curated initial dataset of Central and Odisha schemes. Absence of a scheme in search results does not mean no government benefit exists.
