import React, { useState, useEffect } from 'react';
import {
  Send,
  ExternalLink,
  BookOpen,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Database,
  Trash2,
} from 'lucide-react';
import {
  SchemeRecord,
  RAGAnswerResponse,
} from '../domain/types';
import { OFFICIAL_DOCUMENT_CHUNKS } from '../domain/schemesData';
import {
  retrieveRelevantChunks,
  buildDeterministicRAGResponse,
} from '../domain/engine';

interface RagAssistantViewProps {
  schemes: SchemeRecord[];
  initialQuestion?: string | null;
  onClearInitialQuestion?: () => void;
}

const SAMPLE_RAG_QUESTIONS = [
  'I am a college student in Odisha. What scholarships should I investigate?',
  'What financial support can help me pay for college in Odisha?',
  'Which government schemes support farmers and landless households in Odisha?',
  'Who is excluded from receiving PM-KISAN benefits?',
  'What are the eligibility conditions and exclusions for SUBHADRA Yojana?',
  'What benefits and pensions should senior citizens in Odisha investigate?',
  'I want to start a small business or work as an artisan. What support is available?',
  'What is the rooftop solar subsidy under PM Surya Ghar Muft Bijli Yojana?',
  'What is Krushi Vidya Nidhi scholarship for farmer children in Odisha?',
];

const ODIA_TERMINOLOGY_GLOSSARY = [
  {
    english_term: 'Record of Rights (RoR) / Patta / Khatiyan',
    odia_script: 'ପଟ୍ଟା / ଖତିୟାନ (ଜମି ଅଧିକାର ଅଭିଲେଖ)',
    plain_meaning:
      'Official revenue document issued by the Tahasildar proving ownership and plot details of agricultural or homestead land.',
  },
  {
    english_term: 'Resident / Domicile Certificate',
    odia_script: 'ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର (Resident Certificate)',
    plain_meaning:
      'Certificate issued via e-District Odisha / Tahasildar confirming permanent residence in Odisha for state-specific schemes.',
  },
  {
    english_term: 'Annual Family Income Certificate',
    odia_script: 'ବାର୍ଷିକ ଆୟ ପ୍ରମାଣପତ୍ର (Income Certificate)',
    plain_meaning:
      'Official certificate from a Revenue Officer stating total household annual income from all sources.',
  },
  {
    english_term: 'Aadhaar-Seeded & NPCI DBT Bank Account',
    odia_script: 'ଆଧାର ସଂଯୁକ୍ତ ବ୍ୟାଙ୍କ ଆକାଉଣ୍ଟ (DBT ସକ୍ରିୟ)',
    plain_meaning:
      'A single-holder bank account linked with Aadhaar and mapped on the NPCI mapper so Direct Benefit Transfers arrive automatically.',
  },
];

export const RagAssistantView: React.FC<RagAssistantViewProps> = ({
  schemes,
  initialQuestion,
  onClearInitialQuestion,
}) => {
  const [queryInput, setQueryInput] = useState(
    'I am a college student in Odisha. What scholarships should I investigate?'
  );
  const [stateScope, setStateScope] = useState<'All' | 'Odisha' | 'All India'>('All');
  const [preferFallback, setPreferFallback] = useState(false);
  const [showOdiaGlossary, setShowOdiaGlossary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [history, setHistory] = useState<RAGAnswerResponse[]>(() => {
    const initialRetrieved = retrieveRelevantChunks(
      'I am a college student in Odisha. What scholarships should I investigate?',
      OFFICIAL_DOCUMENT_CHUNKS,
      { topK: 4 }
    );
    return [
      buildDeterministicRAGResponse(
        'I am a college student in Odisha. What scholarships should I investigate?',
        initialRetrieved,
        schemes
      ),
    ];
  });

  const [activeResponseIdx, setActiveResponseIdx] = useState(0);

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() !== '') {
      setQueryInput(initialQuestion);
      handleRunQuery(initialQuestion, preferFallback);
      if (onClearInitialQuestion) {
        onClearInitialQuestion();
      }
    }
  }, [initialQuestion]);

  const handleRunQuery = async (
    questionText: string,
    useFallback: boolean = preferFallback
  ) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/rag/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          stateFilter: stateScope,
          preferFallback: useFallback,
        }),
      });

      if (res.ok) {
        const data: RAGAnswerResponse = await res.json();
        setHistory((prev) => [data, ...prev]);
        setActiveResponseIdx(0);
      } else {
        const retrieved = retrieveRelevantChunks(
          trimmed,
          OFFICIAL_DOCUMENT_CHUNKS,
          { stateFilter: stateScope, topK: 4 }
        );
        const localFallback = buildDeterministicRAGResponse(
          trimmed,
          retrieved,
          schemes
        );
        setHistory((prev) => [localFallback, ...prev]);
        setActiveResponseIdx(0);
      }
    } catch {
      const retrieved = retrieveRelevantChunks(
        trimmed,
        OFFICIAL_DOCUMENT_CHUNKS,
        { stateFilter: stateScope, topK: 4 }
      );
      const localFallback = buildDeterministicRAGResponse(
        trimmed,
        retrieved,
        schemes
      );
      setHistory((prev) => [localFallback, ...prev]);
      setActiveResponseIdx(0);
    } finally {
      setIsLoading(false);
    }
  };

  const currentResponse = history[activeResponseIdx] || history[0];

  return (
    <div className="space-y-8">
      {/* Header & RAG Transparency Controls */}
      <section className="bg-[#F3EFE6] border border-[#E7E2D8] rounded-xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-[#1C1917]">
              Grounded RAG Question-Answering Assistant
            </h1>
            <p className="mt-2 text-sm text-[#44403C] leading-relaxed">
              Every answer is strictly grounded in retrieved official scheme
              guideline passages. Inspect the retrieved chunks and cosine
              similarity scores side-by-side with the generated explanation.
            </p>
          </div>

          {/* Mode Toggle: Gemini Grounded vs Deterministic Fallback */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-medium text-[#57534E]">
              Generation Engine Mode (Section 18 Cost & Fallback Control):
            </div>
            <div
              role="group"
              aria-label="Select Generation Engine Mode"
              className="flex items-center gap-1 p-1 bg-white border border-[#D6CEBE] rounded-lg"
            >
              <button
                type="button"
                onClick={() => setPreferFallback(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  !preferFallback
                    ? 'bg-[#1E3A8A] text-white font-semibold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Gemini 3.8 Flash Grounded
              </button>
              <button
                type="button"
                onClick={() => setPreferFallback(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  preferFallback
                    ? 'bg-[#1E3A8A] text-white font-semibold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Deterministic Retrieval Fallback
              </button>
            </div>
          </div>
        </div>

        {/* Question Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunQuery(queryInput, preferFallback);
          }}
          className="mt-6 space-y-3"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              aria-label="Filter retrieval by State Scope"
              value={stateScope}
              onChange={(e) =>
                setStateScope(e.target.value as 'All' | 'Odisha' | 'All India')
              }
              className="px-3.5 py-3 text-xs font-medium bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] shrink-0"
            >
              <option value="All">Scope: India + Odisha</option>
              <option value="Odisha">Scope: Odisha Applicable</option>
              <option value="All India">Scope: Central All-India</option>
            </select>

            <input
              type="text"
              aria-label="Ask a natural-language question about government schemes"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask about eligibility, documents, benefit amounts, or exclusions..."
              className="flex-1 px-4 py-3 text-sm bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172554] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Retrieving & Grounding...' : 'Ask Assistant'}</span>
            </button>
          </div>

          {/* Quick Questions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-[#57534E] mr-1">
              Test queries:
            </span>
            {SAMPLE_RAG_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQueryInput(q);
                  handleRunQuery(q, preferFallback);
                }}
                className="px-2.5 py-1 text-xs bg-white hover:bg-[#1E3A8A]/5 text-[#292524] border border-[#D6CEBE] rounded transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* Main Split Workspace: Left = Structured Answer & Citations, Right = Retrieved Evidence Inspector */}
      {currentResponse && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Structured Grounded Answer */}
          <section
            aria-label="Grounded Answer and Citations"
            className="lg:col-span-7 bg-white border border-[#E7E2D8] rounded-xl p-6 md:p-8 space-y-6"
          >
            {/* Answer Metadata Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E7E2D8]">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                  <span className="font-semibold text-[#1E3A8A] inline-flex items-center gap-1">
                    {currentResponse.generation_mode === 'gemini-grounded' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mode: Gemini 3.8 Flash (Local Corpus Grounded)</span>
                      </>
                    ) : currentResponse.generation_mode ===
                      'live-web-search-grounded' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#14532D]" />
                        <span className="text-[#14532D]">
                          Mode: Tier-2 Live .gov.in Google Search Grounding
                        </span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        <span>Mode: Deterministic Retrieval Baseline</span>
                      </>
                    )}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {currentResponse.citations.length} Verified Citation(s)
                  </span>
                </div>
                <h2 className="font-display text-xl font-semibold text-[#1C1917] mt-1">
                  “{currentResponse.query}”
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowOdiaGlossary(!showOdiaGlossary)}
                className="px-3.5 py-2 text-xs font-semibold text-[#1E3A8A] bg-[#1E3A8A]/10 rounded-lg hover:bg-[#1E3A8A]/20 cursor-pointer whitespace-nowrap shrink-0 self-start"
              >
                {showOdiaGlossary
                  ? 'Hide Odia Terms Guide'
                  : 'Odia / Simple Terms Guide'}
              </button>
            </div>

            {/* Security Alert if Prompt Injection Detected */}
            {currentResponse.security_flags.prompt_injection_detected && (
              <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Prompt-Injection / Rule Override Blocked</span>
                </div>
                <ul className="list-disc pl-5">
                  {currentResponse.security_flags.sanitized_notes.map(
                    (note, i) => (
                      <li key={i}>{note}</li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* Optional Odia & Administrative Terminology Explainer */}
            {showOdiaGlossary && (
              <div className="p-4 bg-[#F3EFE6] border border-[#D6CEBE] rounded-lg space-y-3 text-xs">
                <div className="font-semibold text-[#1C1917]">
                  Administrative & Odia Terminology Reference (Preserving
                  Official Legal Terms):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ODIA_TERMINOLOGY_GLOSSARY.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white border border-[#E7E2D8] rounded"
                    >
                      <div className="font-semibold text-[#1C1917]">
                        {item.english_term}
                      </div>
                      <div className="text-[#1E3A8A] font-medium mt-0.5">
                        {item.odia_script}
                      </div>
                      <p className="text-[#57534E] mt-1 leading-relaxed">
                        {item.plain_meaning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 1: Short Answer */}
            <div>
              <h3 className="font-display text-base font-semibold text-[#1C1917] mb-1.5">
                Short Answer
              </h3>
              <p className="text-sm text-[#292524] leading-relaxed">
                {currentResponse.short_answer}
              </p>
            </div>

            {/* Section 2: Why This Scheme May Be Relevant */}
            <div>
              <h3 className="font-display text-base font-semibold text-[#1C1917] mb-1.5">
                Why This Scheme May Be Relevant
              </h3>
              <p className="text-xs text-[#44403C] leading-relaxed">
                {currentResponse.why_relevant}
              </p>
            </div>

            {/* Section 3: Requirements to Check */}
            {currentResponse.requirements_to_check.length > 0 && (
              <div>
                <h3 className="font-display text-base font-semibold text-[#1C1917] mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#14532D] shrink-0" />
                  <span>Requirements & Exclusions to Check</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-[#292524] leading-relaxed list-disc pl-5">
                  {currentResponse.requirements_to_check.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 4: What Remains Uncertain */}
            {currentResponse.what_remains_uncertain.length > 0 && (
              <div className="p-4 bg-[#FBF9F5] border border-[#E7E2D8] rounded-lg">
                <h3 className="font-display text-sm font-semibold text-[#9A3412] mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>What Remains Uncertain / Missing Facts</span>
                </h3>
                <ul className="space-y-1 text-xs text-[#44403C] list-disc pl-5">
                  {currentResponse.what_remains_uncertain.map((unc, idx) => (
                    <li key={idx}>{unc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 5 & 6: Documents to Prepare & How to Apply */}
            {(currentResponse.documents_to_prepare.length > 0 ||
              currentResponse.how_to_apply.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentResponse.documents_to_prepare.length > 0 && (
                  <div className="p-4 bg-[#F3EFE6]/50 border border-[#E7E2D8] rounded-lg">
                    <h3 className="font-display text-sm font-semibold text-[#1C1917] mb-2">
                      Documents to Prepare
                    </h3>
                    <ul className="space-y-1 text-xs text-[#292524] list-disc pl-4">
                      {currentResponse.documents_to_prepare.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentResponse.how_to_apply.length > 0 && (
                  <div className="p-4 bg-[#F3EFE6]/50 border border-[#E7E2D8] rounded-lg">
                    <h3 className="font-display text-sm font-semibold text-[#1C1917] mb-2">
                      How to Apply (Verified Steps)
                    </h3>
                    <ol className="space-y-1.5 text-xs text-[#292524] list-decimal pl-4">
                      {currentResponse.how_to_apply.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Section 7: Official Sources & Clickable Citations */}
            <div className="pt-2 border-t border-[#E7E2D8]">
              <h3 className="font-display text-base font-semibold text-[#1C1917] mb-3">
                Official Sources Supporting This Answer
              </h3>
              {currentResponse.citations.length === 0 ? (
                <p className="text-xs text-[#57534E]">
                  No source citations attached because no verified passage
                  matched the query.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {currentResponse.citations.map((cit) => (
                    <div
                      key={cit.citation_id}
                      className="p-3.5 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-[#1E3A8A]">
                          [{cit.citation_id}] {cit.source_title}
                        </span>
                        <a
                          href={cit.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A] hover:underline"
                        >
                          <span>Open Official Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[#57534E] flex flex-wrap items-center gap-1.5 font-mono tabular-nums">
                        <span>Publisher: {cit.official_publisher}</span>
                        <span aria-hidden="true">·</span>
                        <span>{cit.page_or_section}</span>
                        <span aria-hidden="true">·</span>
                        <span>Published: {cit.publication_date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#14532D]">
                          Verified: {cit.last_verified_at}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 8: Important Limitation & Follow-up Questions */}
            <div className="p-4 bg-[#F3EFE6] border border-[#E7E2D8] rounded-lg text-xs text-[#44403C]">
              <strong className="text-[#1C1917]">Important Limitation:</strong>{' '}
              {currentResponse.important_limitation}
            </div>

            {currentResponse.follow_up_questions.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-[#1C1917]">
                  Suggested Follow-Up Questions:
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentResponse.follow_up_questions.map((fq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQueryInput(fq);
                        handleRunQuery(fq, preferFallback);
                      }}
                      className="text-left px-3 py-1.5 text-xs text-[#1E3A8A] bg-[#1E3A8A]/5 hover:bg-[#1E3A8A]/10 border border-[#1E3A8A]/20 rounded-md cursor-pointer"
                    >
                      {fq}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right 5 Columns: Retrieved Evidence & Cosine Similarity Inspector */}
          <aside
            aria-label="Retrieved Evidence and Similarity Inspector"
            className="lg:col-span-5 space-y-5"
          >
            <div className="bg-white border border-[#E7E2D8] rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E7E2D8]">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1C1917] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#1E3A8A] shrink-0" />
                    <span>Retrieved Evidence Inspector</span>
                  </h2>
                  <p className="text-xs text-[#57534E] mt-0.5">
                    Shows the exact chunks retrieved in Step 8 of our RAG
                    pipeline before generation.
                  </p>
                </div>
              </div>

              {/* Validation Summary */}
              <div className="p-3 bg-[#F3EFE6] border border-[#E7E2D8] rounded-lg text-xs space-y-1">
                <div className="font-semibold text-[#1C1917]">
                  Step 11 Answer Validation Check:
                </div>
                {currentResponse.validation_summary.validation_notes.map(
                  (note, i) => (
                    <div key={i} className="text-[#44403C]">
                      • {note}
                    </div>
                  )
                )}
              </div>

              {currentResponse.retrieved_chunks.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#57534E] border border-dashed border-[#D6CEBE] rounded-lg">
                  Zero chunks exceeded the minimum similarity threshold (0.08).
                  The assistant safely refused to speculate.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentResponse.retrieved_chunks.map((item, idx) => (
                    <div
                      key={item.chunk.chunk_id}
                      className="p-4 bg-[#FBF9F5] border border-[#E7E2D8] rounded-lg space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-[#1E3A8A]">
                          [CIT-{idx + 1}] {item.chunk.scheme_name}
                        </span>
                        <span className="font-mono text-[#14532D] font-semibold tabular-nums">
                          Hybrid: {item.hybrid_score.toFixed(3)}
                        </span>
                      </div>

                      {/* Semantic vs Keyword Score Bar */}
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#57534E] tabular-nums bg-white px-2.5 py-1.5 rounded border border-[#E7E2D8]">
                        <span>
                          Semantic Cosine: {item.semantic_score.toFixed(3)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Exact Keyword: {item.keyword_score.toFixed(3)}
                        </span>
                      </div>

                      <div className="text-[#57534E] font-medium">
                        {item.chunk.section_title} ({item.chunk.page_or_clause})
                      </div>

                      <p className="text-[#292524] leading-relaxed bg-white p-2.5 rounded border border-[#F3EFE6]">
                        “{item.chunk.content}”
                      </p>

                      {item.matched_terms.length > 0 && (
                        <div className="text-[11px] text-[#57534E]">
                          <strong>Matched Concepts:</strong>{' '}
                          {item.matched_terms.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Session History Manager (Privacy Requirement Section 12) */}
            <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#1C1917]">
                  Session Question History ({history.length})
                </div>
                {history.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistory([history[0]]);
                      setActiveResponseIdx(0);
                    }}
                    className="inline-flex items-center gap-1 text-[#991B1B] hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>
              <p className="text-[#57534E]">
                Stored only in temporary browser memory. Clearing removes all
                prior questions immediately.
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {history.map((h, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveResponseIdx(idx)}
                    className={`w-full text-left px-3 py-2 rounded border transition-colors cursor-pointer truncate ${
                      idx === activeResponseIdx
                        ? 'bg-[#1E3A8A]/10 border-[#1E3A8A] text-[#1C1917] font-medium'
                        : 'bg-[#FBF9F5] border-[#E7E2D8] text-[#57534E]'
                    }`}
                  >
                    {idx + 1}. {h.query}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
