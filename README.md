# JanSahayak (ଜନ ସହାୟକ) — AI Government Schemes & Benefits Assistant (India & Odisha)

JanSahayak is a bilingual (**English + Odia / ଓଡ଼ିଆ**), provenance-first Government Schemes & Public Benefits Assistant designed for citizens, field workers, and students across **Odisha** and **India**.

Unlike generic chatbots that hallucinate welfare rules or make false promises of eligibility, JanSahayak is built around three core engineering principles:
1. **3-State Transparent Eligibility Reasoning**: Distinguishes between criteria that **appear consistent**, **require additional information / exception verification**, or **appear inconsistent**—never guaranteeing final government sanction.
2. **Citation-Grounded RAG with Minimum Relevance Thresholds**: Every answer cites specific official scheme guidelines (`source_title`, `source_url`, `last_verified_at`). Out-of-scope queries that fall below the minimum hybrid similarity threshold (`0.22`) are deterministically rejected rather than fabricated.
3. **Explicit Provenance & Unverified Field Disclosures**: A `.gov.in` URL or verification date is not treated as blanket proof of accuracy. Every scheme record explicitly lists `exclusions`, mandatory category certificates (such as the 10 notified vulnerable categories under *Gopabandhu Sikhya Sahayata Yojana*), and `unverified_fields` (such as seasonal portal closing dates or district-level verification queues).

---

## 1. Which Implementation Should I Use?

This repository contains **two synchronized, fully tested implementations** of JanSahayak:

| Feature / Aspect | Root Web Application (`/src` + `/server.ts`) | Python Prototype (`/python_prototype`) |
| :--- | :--- | :--- |
| **Primary Use Case** | Production-grade full-stack web app with interactive UI, live `.gov.in` search fallback, and 1-click scheme discovery | Modular Python reference architecture, CLI/Streamlit prototype, and AI/ML evaluation benchmark suite |
| **Tech Stack** | React 19, TypeScript, Tailwind CSS, Express (`server.ts`), `@google/genai` | Python 3.10+, SQLite (`sqlite3`), Streamlit, `pytest` |
| **Eligibility Engine** | `src/domain/engine.ts` (`evaluateSchemeEligibility`, `recommendSchemes`) | `python_prototype/src/eligibility.py` & `recommendation.py` |
| **RAG & Vector Search** | `src/domain/engine.ts` + `/api/rag/ask` (Tier-1 Curated Corpus + Tier-2 Live `.gov.in` Gemini Search Grounding) | `python_prototype/src/embeddings.py`, `retrieval.py`, `rag.py`, and `embedding_benchmark.py` |
| **Automated Tests** | `src/domain/engine.test.ts` (8 Node/TS unit tests) | `python_prototype/tests/test_*.py` (30 Python unit & benchmark tests) |

- **Use the Root Web Application** if you want the complete citizen-facing experience, including the **Eligibility & Recommendation Engine**, **Document-Grounded RAG Assistant** with live `.gov.in` web search fallback, **1-Click AI Scheme Auto-Discovery**, and **Source Provenance Audit Matrix**.
- **Use `/python_prototype/`** if you want to inspect, test, or extend the Python data models, SQLite persistence layer, RAG retrieval thresholds, or compare our deterministic vectorizer against pretrained neural embeddings (`sentence-transformers/all-MiniLM-L6-v2`).

---

## 2. How to Install and Run the Application

### A. Running the Full-Stack React + Express Application (Root)

**Prerequisites:** Node.js 18+ (Node 20+ recommended).

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables safely (optional for Tier-1 offline mode, required for Tier-2 live `.gov.in` Gemini grounding):**
   Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your Gemini API key:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ```
   > **Security Note:** Never commit `.env` to version control or expose `GEMINI_API_KEY` in client-side `VITE_*` variables. All Gemini API calls in JanSahayak execute strictly on the backend Express server (`server.ts` via `/api/rag/ask` and `/api/schemes/auto-import`). If `GEMINI_API_KEY` is omitted, the application runs safely in deterministic offline mode using the curated official corpus.

3. **Start the development server (runs on `http://localhost:3000`):**
   ```bash
   npm run dev
   ```

### B. Running the Python Prototype (`/python_prototype`)

**Prerequisites:** Python 3.10+.

1. **Install Python dependencies:**
   ```bash
   pip install -r python_prototype/requirements.txt
   ```

2. **Run the end-to-end CLI verification demo (no external services required):**
   ```bash
   PYTHONPATH=python_prototype python3 python_prototype/run_demo.py
   ```

3. **Launch the Streamlit web interface (optional):**
   ```bash
   PYTHONPATH=python_prototype streamlit run python_prototype/app.py
   ```

---

## 3. How to Run the Automated Tests

Both implementations include automated unit and integration tests covering eligibility rules, missing-data handling, statutory exceptions, retrieval relevance thresholds, scheme ID filtering, and provenance checklists.

### Run the Python Test Suite (7 test modules, 30 tests)
```bash
PYTHONPATH=python_prototype pytest python_prototype/tests -v
```
Or without `pytest` installed, using the built-in runner:
```bash
PYTHONPATH=python_prototype python3 -m unittest discover -s python_prototype/tests
```

### Run the TypeScript Domain Engine Tests (8 tests)
```bash
npx tsx --test src/domain/engine.test.ts
```

### Verify the Production TypeScript & Vite Build
```bash
npm run build
```

---

## 4. AI/ML & Retrieval Architecture Transparency

### Handcrafted Concept-Lexical Vectorizer vs. Pretrained Neural Embeddings
JanSahayak never misrepresents a deterministic feature vectorizer as a pretrained neural transformer:

1. **Default Deterministic Vectorizer (`VECTORIZER_TYPE = "handcrafted-concept-lexical-v2"`)**:
   - Implemented in `python_prototype/src/embeddings.py` and `src/domain/engine.ts`.
   - Produces a **136-dimensional L2-normalized vector** combining **8 curated domain concept axes** (Education/Scholarship, Agriculture/Farmer, Women/Maternity, Elderly/Widow/Disability Pension, Artisan/MSME/Loan, Housing, Healthcare, Odisha State Context) with **128 FNV-1a stemmed lexical hash buckets** (after stopword removal and suffix stemming).
   - Combined with token overlap and a strict minimum hybrid score threshold (`DEFAULT_MIN_HYBRID_SCORE = 0.22`), it bridges domain synonym gaps (e.g., *"help me pay for college"* $\rightarrow$ *Gopabandhu Sikhya Sahayata Yojana*) while rejecting unrelated queries (e.g., *"subsidy for buying an electric submarine in Antarctica"* $\rightarrow$ `[]`).

2. **Pretrained Neural Embedding Benchmark (`python_prototype/src/embedding_benchmark.py`)**:
   - Provides a clean `EmbedderProtocol` interface and `PretrainedSentenceTransformerEmbedder("all-MiniLM-L6-v2")` alongside `HandcraftedConceptLexicalEmbedder`.
   - Run `compare_embedding_approaches()` to compare Top-1 Accuracy, Mean Reciprocal Rank (MRR), and Out-of-Scope Rejection Rate across the evaluation dataset.

---

## 5. What JanSahayak Can and Cannot Reliably Do

### What It Can Reliably Do
- **Explainable 3-State Screening**: Clearly separates *"Some stated criteria appear consistent"*, *"Additional information required"*, and *"One or more stated criteria appear inconsistent"*.
- **Surface Statutory Exceptions & Mandatory Exclusions**: Prevents false rejections on rules with official exceptions (e.g., *Madhu Babu Pension Yojana* waives the age-60 requirement for destitute widows of any age and persons with $\ge 40\%$ disability aged 5+) and explicitly lists mandatory category constraints (e.g., *Gopabandhu Sikhya Sahayata Yojana* requires membership in one of 10 notified vulnerable categories in addition to family income $\le \text{₹2,50,000}$).
- **Grounded Citations & Refusal on Unsupported Questions**: Refuses to guess benefit amounts, deadlines, or rules when no passage meets the relevance threshold.
- **PII Redaction**: Automatically strips 12-digit Aadhaar numbers and 10-digit phone numbers from free-text queries before processing or logging.

### What It Cannot Do (Important Limitations)
- **Not an Official Sanction or Legal Guarantee**: Passing software tests or matching stated profile fields does not guarantee benefit approval. Final eligibility is determined solely by government nodal officers (e.g., Tahasildar, Block Social Security Officer, College Principal, Gram Sabha) upon verification of original certificates and e-KYC.
- **Static Snapshots Require Periodic Portal Verification**: Government departments periodically revise portal closing dates, installment schedules, and district quotas via fresh notifications. Every scheme record includes an `unverified_fields` list highlighting operational details that citizens must confirm on the linked official `.gov.in` / `.nic.in` portal before applying.
