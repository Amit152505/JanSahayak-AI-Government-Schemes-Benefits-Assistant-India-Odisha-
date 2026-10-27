import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import { SchemeRecord, GovernmentLevel } from '../domain/types';
import { filterSchemes, validateSchemeRecord } from '../domain/engine';

interface SchemeCatalogueViewProps {
  schemes: SchemeRecord[];
  onInspectScheme: (scheme: SchemeRecord) => void;
  onQuickAskRAG: (question: string) => void;
  onGoToRecommender: () => void;
  showAddModal: boolean;
  onCloseAddModal: () => void;
  onAddValidatedScheme: (scheme: SchemeRecord) => void;
}

const EXAMPLE_DISCOVERY_QUESTIONS = [
  'I am a college student in Odisha. What scholarships should I investigate?',
  'Which government schemes support farmers in Odisha and across India?',
  'I want to start a small business or artisan trade. What government support might be available?',
  'What pension and healthcare benefits should senior citizens investigate?',
  'Which schemes support students or citizens with disabilities in Odisha?',
  'What are the eligibility rules and exclusions for SUBHADRA Yojana?',
];

export const SchemeCatalogueView: React.FC<SchemeCatalogueViewProps> = ({
  schemes,
  onInspectScheme,
  onQuickAskRAG,
  onGoToRecommender,
  showAddModal,
  onCloseAddModal,
  onAddValidatedScheme,
}) => {
  const [keyword, setKeyword] = useState('');
  const [govLevel, setGovLevel] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Add New Scheme Form State (Phase 2 Interactive Validation Exercise)
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newShortDesc, setNewShortDesc] = useState('');
  const [newGovLevel, setNewGovLevel] = useState<GovernmentLevel>('Odisha State Government');
  const [newDepartment, setNewDepartment] = useState('Department of Higher Education, Odisha');
  const [newCategory, setNewCategory] =
    useState<SchemeRecord['scheme_category']>('Higher Education & Scholarships');
  const [newStateScope, setNewStateScope] = useState('Odisha');
  const [newBenefitAmount, setNewBenefitAmount] = useState('15000');
  const [newBenefitDesc, setNewBenefitDesc] = useState(
    'Annual merit-cum-means financial assistance transferred via DBT.'
  );
  const [newOfficialUrl, setNewOfficialUrl] = useState('https://scholarship.odisha.gov.in/');
  const [newSourceTitle, setNewSourceTitle] = useState(
    'Official Departmental Notification — Govt. of Odisha'
  );
  const [newVerifiedDate, setNewVerifiedDate] = useState('2026-10-25');
  const [newUnverifiedField, setNewUnverifiedField] = useState(
    'Current cycle closing date'
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [autoImportQuery, setAutoImportQuery] = useState('');
  const [isAutoImporting, setIsAutoImporting] = useState(false);

  const handleAutoImportScheme = async (topicOrUrl: string) => {
    const trimmed = topicOrUrl.trim();
    if (!trimmed) return;
    setIsAutoImporting(true);
    setValidationErrors([]);
    setValidationSuccess(null);

    try {
      const res = await fetch('/api/schemes/auto-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryOrUrl: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.scheme) {
        setValidationErrors([
          data.error || 'Could not auto-import scheme. Try another name or URL.',
        ]);
        return;
      }

      const imported: SchemeRecord = data.scheme;
      // Populate form fields so user can see what was extracted
      setNewId(imported.scheme_id);
      setNewName(imported.scheme_name);
      setNewShortDesc(imported.short_description);
      setNewGovLevel(imported.government_level);
      setNewDepartment(imported.responsible_department);
      setNewCategory(imported.scheme_category);
      setNewStateScope(
        imported.applicable_states.includes('All India') ? 'All India' : 'Odisha'
      );
      setNewBenefitAmount(
        imported.benefit_amount !== null ? String(imported.benefit_amount) : ''
      );
      setNewBenefitDesc(imported.benefit_description);
      setNewOfficialUrl(imported.official_scheme_url);
      setNewSourceTitle(imported.source_title);
      setNewVerifiedDate(imported.source_last_verified_at);

      onAddValidatedScheme(imported);
      setValidationSuccess(
        `Auto-imported "${imported.scheme_name}" (${data.mode}) and indexed it into the Catalogue, Recommender, and RAG Vector Store!`
      );
      setAutoImportQuery('');
    } catch {
      setValidationErrors([
        'Network error while auto-importing scheme. Please try again.',
      ]);
    } finally {
      setIsAutoImporting(false);
    }
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    schemes.forEach((s) => set.add(s.responsible_department));
    return ['All', ...Array.from(set)];
  }, [schemes]);

  const beneficiaries = useMemo(() => {
    const set = new Set<string>();
    schemes.forEach((s) => s.target_beneficiaries.forEach((b) => set.add(b)));
    return ['All', ...Array.from(set)];
  }, [schemes]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    schemes.forEach((s) => set.add(s.scheme_category));
    return ['All', ...Array.from(set)];
  }, [schemes]);

  const filteredSchemes = useMemo(() => {
    return filterSchemes(schemes, {
      keyword,
      government_level: govLevel,
      state: selectedState,
      department: selectedDepartment,
      beneficiary: selectedBeneficiary,
      category: selectedCategory,
    });
  }, [
    schemes,
    keyword,
    govLevel,
    selectedState,
    selectedDepartment,
    selectedBeneficiary,
    selectedCategory,
  ]);

  const handleResetFilters = () => {
    setKeyword('');
    setGovLevel('All');
    setSelectedState('All');
    setSelectedDepartment('All');
    setSelectedBeneficiary('All');
    setSelectedCategory('All');
  };

  const handleValidateAndSubmitScheme = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setValidationSuccess(null);

    const parsedAmount =
      newBenefitAmount.trim() !== '' && !Number.isNaN(Number(newBenefitAmount))
        ? Number(newBenefitAmount)
        : null;

    const candidate: Partial<SchemeRecord> = {
      scheme_id: newId.trim(),
      scheme_name: newName.trim(),
      short_description: newShortDesc.trim(),
      detailed_description: newShortDesc.trim(),
      government_level: newGovLevel,
      responsible_department: newDepartment.trim(),
      scheme_category: newCategory,
      applicable_states:
        newStateScope === 'All India' ? ['All India', 'Odisha'] : ['Odisha'],
      applicable_districts: ['All Districts'],
      target_beneficiaries: ['Students', 'Low-Income Households'],
      eligibility_conditions: [
        {
          criterion_id: `${newId.trim()}-state`,
          field: 'state',
          operator: 'equals',
          value: newStateScope === 'All India' ? 'All India' : 'Odisha',
          description: `Applicable geographical scope: ${newStateScope}.`,
          is_mandatory: true,
          has_exceptions: false,
        },
      ],
      exclusions: ['Verify detailed exclusion clauses in official notification.'],
      benefit_description: newBenefitDesc.trim(),
      benefit_amount: parsedAmount,
      benefit_amount_unit: 'INR',
      benefit_frequency: 'Per Year',
      application_method: [
        `Apply online via the official portal (${newOfficialUrl.trim()}).`,
      ],
      required_documents: ['Aadhaar Card', 'Resident Certificate', 'Income Certificate'],
      official_scheme_url: newOfficialUrl.trim(),
      official_application_url: newOfficialUrl.trim(),
      source_document_url: newOfficialUrl.trim(),
      source_title: newSourceTitle.trim(),
      source_publisher: newDepartment.trim(),
      source_publication_date: '2025-01-15',
      source_last_verified_at: newVerifiedDate.trim(),
      scheme_effective_status: 'Active',
      scheme_validity_information: 'Active as per verified entry.',
      information_confidence: 'Verified Official Guideline',
      notes_and_limitations:
        'Added and validated through the Pydantic/TypeScript schema validator.',
      unverified_fields: newUnverifiedField.trim()
        ? [newUnverifiedField.trim()]
        : [],
    };

    const result = validateSchemeRecord(candidate);
    if (!result.valid) {
      setValidationErrors(result.errors);
      return;
    }

    onAddValidatedScheme(candidate as SchemeRecord);
    setValidationSuccess(
      `Scheme "${candidate.scheme_name}" passed all schema & provenance checks and was added to the catalogue!`
    );
    setNewId('');
    setNewName('');
    setNewShortDesc('');
  };

  return (
    <div className="space-y-10">
      {/* Institutional Hero & Independent Tool Notice */}
      <section className="bg-[#F3EFE6] border border-[#E7E2D8] rounded-xl p-6 md:p-10">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] mb-3">
            <span className="font-semibold text-[#1E3A8A]">
              Independent Public Benefit Discovery & Learning Tool
            </span>
            <span aria-hidden="true">·</span>
            <span>Central Government & Odisha State Focus</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {schemes.length} Verified Schemes Indexed
            </span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#1C1917] tracking-tight leading-tight">
            Discover Government Schemes with Source-Verified Clarity
          </h1>

          <p className="mt-3 text-sm md:text-base text-[#44403C] leading-relaxed">
            Search official Central Government and Odisha State schemes using
            everyday language, inspect exact eligibility conditions and required
            documents, and see which requirements remain uncertain—backed by
            traceable official sources.
          </p>

          {/* Prominent Search Bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search schemes by keyword, need, or beneficiary"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search by keyword or need (e.g., scholarship, farmer, KALIA, pension)..."
                className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>
            <button
              type="button"
              onClick={onGoToRecommender}
              className="px-5 py-3 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172554] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Check My Eligibility Profile
            </button>
          </div>

          {/* Suggested Example Questions (Triggers Grounded RAG Assistant) */}
          <div className="mt-5">
            <div className="text-xs font-medium text-[#57534E] mb-2">
              Or ask the Grounded AI Assistant an example question:
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_DISCOVERY_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onQuickAskRAG(q)}
                  className="text-left px-3 py-1.5 text-xs text-[#292524] bg-white hover:bg-[#1E3A8A]/5 border border-[#D6CEBE] rounded-md transition-colors cursor-pointer"
                >
                  “{q}”
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Non-Official Disclaimer Strip */}
        <div className="mt-6 pt-4 border-t border-[#D6CEBE] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#57534E]">
          <p>
            <strong className="text-[#1C1917]">Important Limitation:</strong>{' '}
            JanSahayak is an independent educational and discovery platform, not
            an official government portal. It never asks for Aadhaar numbers,
            bank accounts, or OTPs, and never guarantees benefit approval.
          </p>
          <span className="font-mono whitespace-nowrap shrink-0 tabular-nums">
            Corpus Verified: Oct 2026
          </span>
        </div>
      </section>

      {/* Filter Bar */}
      <section
        aria-label="Scheme Catalogue Filters"
        className="bg-white border border-[#E7E2D8] rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#1C1917]">
              Verified Scheme Catalogue
            </h2>
            <p className="text-xs text-[#57534E]">
              Showing{' '}
              <span className="font-mono font-semibold text-[#1C1917] tabular-nums">
                {filteredSchemes.length}
              </span>{' '}
              of{' '}
              <span className="font-mono tabular-nums">{schemes.length}</span>{' '}
              documented schemes (supports semantic synonym matching, e.g.
              “college” matches post-matric scholarships).
            </p>
          </div>

          {/* Segmented Government Level Filter */}
          <div
            role="group"
            aria-label="Filter by Government Level"
            className="flex items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg"
          >
            {['All', 'Central Government', 'Odisha State Government'].map(
              (level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setGovLevel(level)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    govLevel === level
                      ? 'bg-white text-[#1C1917] shadow-xs font-semibold'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {level === 'All' ? 'All Levels' : level}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#F3EFE6]">
          <div>
            <label
              htmlFor="filter-state"
              className="block text-xs font-medium text-[#57534E] mb-1"
            >
              Applicable State Scope
            </label>
            <select
              id="filter-state"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917]"
            >
              <option value="All">All States (India + Odisha)</option>
              <option value="Odisha">Available in Odisha</option>
              <option value="All India">All-India Central Schemes Only</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-category"
              className="block text-xs font-medium text-[#57534E] mb-1"
            >
              Scheme Category
            </label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-beneficiary"
              className="block text-xs font-medium text-[#57534E] mb-1"
            >
              Beneficiary Group
            </label>
            <select
              id="filter-beneficiary"
              value={selectedBeneficiary}
              onChange={(e) => setSelectedBeneficiary(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917]"
            >
              {beneficiaries.map((b) => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Beneficiary Groups' : b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-department"
              className="block text-xs font-medium text-[#57534E] mb-1"
            >
              Responsible Department
            </label>
            <select
              id="filter-department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917]"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(keyword ||
          govLevel !== 'All' ||
          selectedState !== 'All' ||
          selectedCategory !== 'All' ||
          selectedBeneficiary !== 'All' ||
          selectedDepartment !== 'All') && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#57534E]">
              Active filters applied
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </section>

      {/* Scheme Catalogue Grid (Clean unboxed metadata, no pill sandwiches) */}
      {filteredSchemes.length === 0 ? (
        <div className="p-10 bg-white border border-[#E7E2D8] rounded-xl text-center space-y-4">
          <p className="font-display text-lg font-medium text-[#1C1917]">
            No verified schemes in the local database matched your search.
          </p>
          <p className="text-xs text-[#57534E] max-w-xl mx-auto">
            Don’t want to add schemes manually? Click{' '}
            <strong className="text-[#1C1917]">Auto-Discover & Import</strong>{' '}
            below to automatically fetch official rules and index this scheme
            into your database!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {keyword.trim().length >= 3 && (
              <button
                type="button"
                disabled={isAutoImporting}
                onClick={() => handleAutoImportScheme(keyword)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#14532D]/90 rounded-lg cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isAutoImporting
                    ? 'Auto-Discovering Official Rules...'
                    : `Auto-Discover & Import "${keyword.trim()}"`}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSchemes.map((scheme) => (
            <article
              key={scheme.scheme_id}
              className="flex flex-col justify-between bg-white border border-[#E7E2D8] rounded-xl p-6 hover:border-[#D6CEBE] transition-colors"
            >
              <div>
                {/* Quiet 1-line unboxed text kicker with · separators */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#57534E] mb-2">
                  <span className="font-medium text-[#1E3A8A]">
                    {scheme.government_level}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{scheme.scheme_category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Scope: {scheme.applicable_states.join(', ')}</span>
                </div>

                <h3 className="font-display text-xl font-semibold text-[#1C1917] leading-snug">
                  {scheme.scheme_name}
                </h3>

                <p className="mt-2 text-xs text-[#57534E]">
                  Department: {scheme.responsible_department}
                </p>

                <p className="mt-3 text-sm text-[#292524] leading-relaxed">
                  {scheme.short_description}
                </p>

                {/* Key Verified Facts */}
                <div className="mt-4 pt-4 border-t border-[#F3EFE6] space-y-1.5 text-xs text-[#44403C]">
                  <div>
                    <strong className="text-[#1C1917]">
                      Published Benefit:
                    </strong>{' '}
                    <span className="font-mono font-medium text-[#14532D] tabular-nums">
                      {scheme.benefit_amount !== null
                        ? `₹${scheme.benefit_amount.toLocaleString('en-IN')} (${scheme.benefit_frequency})`
                        : scheme.benefit_frequency}
                    </span>
                  </div>
                  <div>
                    <strong className="text-[#1C1917]">
                      Key Documents to Check:
                    </strong>{' '}
                    {scheme.required_documents.slice(0, 3).join(', ')}
                    {scheme.required_documents.length > 3
                      ? ` (+${scheme.required_documents.length - 3} more)`
                      : ''}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[#57534E] pt-1 font-mono tabular-nums">
                    <span>Published: {scheme.source_publication_date}</span>
                    <span aria-hidden="true">·</span>
                    <span>Verified: {scheme.source_last_verified_at}</span>
                    {scheme.unverified_fields.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#9A3412] font-sans">
                          1 Dynamic Field Flagged
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-5 pt-4 border-t border-[#E7E2D8] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onInspectScheme(scheme)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172554] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Inspect Scheme Details
                </button>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      onQuickAskRAG(
                        `What are the eligibility requirements, exclusions, and documents needed for ${scheme.scheme_name}?`
                      )
                    }
                    className="text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Ask AI Assistant
                  </button>
                  <a
                    href={scheme.official_scheme_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#57534E] hover:text-[#1C1917] whitespace-nowrap shrink-0"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Phase 2 Interactive Modal: Add & Validate Scheme Record */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-scheme-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl bg-[#FBF9F5] border border-[#D6CEBE] rounded-xl shadow-xl p-6 md:p-8 text-[#1C1917] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E7E2D8]">
              <div>
                <h2
                  id="add-scheme-modal-title"
                  className="font-display text-xl font-semibold text-[#1C1917]"
                >
                  Add & Validate Official Scheme Record (Phase 2 Schema Lab)
                </h2>
                <p className="text-xs text-[#57534E] mt-1">
                  Tests the Pydantic / TypeScript data quality rules: requires
                  HTTPS official URLs, traceable source titles, and explicit
                  unverified-field tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseAddModal}
                aria-label="Close add scheme modal"
                className="p-1.5 rounded-lg text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-4 bg-[#F3EFE6] border border-[#D6CEBE] rounded-lg space-y-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#1E3A8A]">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  1-Click Automated Scheme Discovery (No Manual Typing Needed!)
                </span>
              </div>
              <p className="text-[#44403C] leading-relaxed">
                Type any Central or Odisha scheme name (or paste an official{' '}
                <code className="font-mono">.gov.in</code> URL) and JanSahayak
                will automatically discover its eligibility rules, required
                documents, and portal link and save it to your database:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={autoImportQuery}
                  onChange={(e) => setAutoImportQuery(e.target.value)}
                  placeholder="e.g., PM Surya Ghar Rooftop Solar, Krushi Vidya Nidhi Odisha, Sukanya Samriddhi..."
                  className="flex-1 px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917]"
                />
                <button
                  type="button"
                  disabled={isAutoImporting || !autoImportQuery.trim()}
                  onClick={() => handleAutoImportScheme(autoImportQuery)}
                  className="px-4 py-2 font-semibold text-white bg-[#14532D] hover:bg-[#14532D]/90 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isAutoImporting
                    ? 'Auto-Fetching Official Data...'
                    : 'Auto-Discover & Save'}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[#57534E] font-medium">
                  Quick 1-Click Auto-Import:
                </span>
                {[
                  'PM Surya Ghar: Muft Bijli Yojana',
                  'Krushi Vidya Nidhi (Odisha)',
                  'Sukanya Samriddhi Yojana',
                  'PM SVANidhi Street Vendor Loan',
                ].map((presetName) => (
                  <button
                    key={presetName}
                    type="button"
                    disabled={isAutoImporting}
                    onClick={() => handleAutoImportScheme(presetName)}
                    className="px-2.5 py-1 bg-white hover:bg-[#1E3A8A]/10 text-[#1C1917] border border-[#D6CEBE] rounded cursor-pointer transition-colors"
                  >
                    + {presetName}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleValidateAndSubmitScheme}
              className="mt-5 space-y-4 text-xs"
            >
              {validationErrors.length > 0 && (
                <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[#991B1B] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Schema Validation Rejected Record:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationSuccess && (
                <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[#14532D] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{validationSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="new-scheme-id"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    Scheme ID (slug, min 3 chars)
                  </label>
                  <input
                    id="new-scheme-id"
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g. odisha-medhabruti-scholarship"
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-scheme-level"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    Government Level
                  </label>
                  <select
                    id="new-scheme-level"
                    value={newGovLevel}
                    onChange={(e) =>
                      setNewGovLevel(e.target.value as GovernmentLevel)
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg"
                  >
                    <option value="Odisha State Government">
                      Odisha State Government
                    </option>
                    <option value="Central Government">
                      Central Government
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-scheme-name"
                  className="block font-medium text-[#1C1917] mb-1"
                >
                  Official Scheme Name
                </label>
                <input
                  id="new-scheme-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. e-Medhabruti Scholarship Scheme (Odisha)"
                  className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="new-scheme-desc"
                  className="block font-medium text-[#1C1917] mb-1"
                >
                  Short Verified Summary
                </label>
                <textarea
                  id="new-scheme-desc"
                  rows={2}
                  value={newShortDesc}
                  onChange={(e) => setNewShortDesc(e.target.value)}
                  placeholder="Describe verified purpose and target beneficiaries..."
                  className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="new-scheme-state"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    State Scope
                  </label>
                  <select
                    id="new-scheme-state"
                    value={newStateScope}
                    onChange={(e) => setNewStateScope(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg"
                  >
                    <option value="Odisha">Odisha Only</option>
                    <option value="All India">All India</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="new-scheme-cat"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="new-scheme-cat"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(
                        e.target.value as SchemeRecord['scheme_category']
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg"
                  >
                    <option value="Higher Education & Scholarships">
                      Higher Education & Scholarships
                    </option>
                    <option value="Agriculture & Rural Livelihood">
                      Agriculture & Rural Livelihood
                    </option>
                    <option value="Women & Child Empowerment">
                      Women & Child Empowerment
                    </option>
                    <option value="Social Security & Pensions">
                      Social Security & Pensions
                    </option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="new-scheme-amount"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    Benefit Amount (INR or blank)
                  </label>
                  <input
                    id="new-scheme-amount"
                    type="text"
                    value={newBenefitAmount}
                    onChange={(e) => setNewBenefitAmount(e.target.value)}
                    placeholder="e.g. 15000 (leave blank if unknown)"
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="new-scheme-url"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    Official Portal URL (Must be https://)
                  </label>
                  <input
                    id="new-scheme-url"
                    type="text"
                    value={newOfficialUrl}
                    onChange={(e) => setNewOfficialUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-scheme-verified"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    Last Verified Date (YYYY-MM-DD)
                  </label>
                  <input
                    id="new-scheme-verified"
                    type="text"
                    value={newVerifiedDate}
                    onChange={(e) => setNewVerifiedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="new-scheme-source"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    Official Source Title
                  </label>
                  <input
                    id="new-scheme-source"
                    type="text"
                    value={newSourceTitle}
                    onChange={(e) => setNewSourceTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-scheme-unverified"
                    className="block font-medium text-[#1C1917] mb-1"
                  >
                    Explicit Unknown / Unverified Field
                  </label>
                  <input
                    id="new-scheme-unverified"
                    type="text"
                    value={newUnverifiedField}
                    onChange={(e) => setNewUnverifiedField(e.target.value)}
                    placeholder="e.g. Exact closing date for current academic year"
                    className="w-full px-3 py-2 bg-white border border-[#D6CEBE] rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7E2D8]">
                <button
                  type="button"
                  onClick={onCloseAddModal}
                  className="px-4 py-2 text-xs font-medium text-[#57534E] bg-[#F3EFE6] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172554] cursor-pointer"
                >
                  Validate & Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
