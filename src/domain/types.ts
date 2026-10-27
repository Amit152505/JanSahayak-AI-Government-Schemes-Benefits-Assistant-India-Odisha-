export type GovernmentLevel = 'Central Government' | 'Odisha State Government';

export type SchemeStatus = 'Active' | 'Under Review' | 'Unverified';

export type ConfidenceLevel =
  | 'Verified Official Guideline'
  | 'Partial - Needs Confirmation';

export type EligibilityState =
  | 'Some stated criteria appear consistent'
  | 'Additional information required'
  | 'One or more stated criteria appear inconsistent'
  | 'Unable to assess with available information';

export type CriterionOperator =
  | 'equals'
  | 'in'
  | 'min'
  | 'max'
  | 'range'
  | 'boolean';

export interface EligibilityCondition {
  criterion_id: string;
  field:
    | 'state'
    | 'age'
    | 'annual_income'
    | 'occupation'
    | 'is_student'
    | 'gender'
    | 'social_category'
    | 'has_disability'
    | 'landholding_status';
  operator: CriterionOperator;
  value: string | number | boolean | string[] | [number, number];
  description: string;
  is_mandatory: boolean;
  has_exceptions: boolean;
  exception_note?: string;
}

export interface SchemeRecord {
  scheme_id: string;
  scheme_name: string;
  short_description: string;
  detailed_description: string;
  government_level: GovernmentLevel;
  responsible_department: string;
  scheme_category:
    | 'Agriculture & Rural Livelihood'
    | 'Higher Education & Scholarships'
    | 'Women & Child Empowerment'
    | 'Social Security & Pensions'
    | 'Housing & Rural Shelter'
    | 'Healthcare & Insurance'
    | 'Skill, Artisans & Self-Employment'
    | 'Disability Support';
  applicable_states: string[];
  applicable_districts: string[];
  target_beneficiaries: string[];
  eligibility_conditions: EligibilityCondition[];
  exclusions: string[];
  benefit_description: string;
  benefit_amount: number | null;
  benefit_amount_unit: string;
  benefit_frequency: string;
  application_method: string[];
  required_documents: string[];
  official_scheme_url: string;
  official_application_url: string;
  source_document_url: string;
  source_title: string;
  source_publisher: string;
  source_publication_date: string;
  source_last_verified_at: string;
  scheme_effective_status: SchemeStatus;
  scheme_validity_information: string;
  information_confidence: ConfidenceLevel;
  notes_and_limitations: string;
  unverified_fields: string[];
}

export interface DocumentChunk {
  chunk_id: string;
  scheme_id: string;
  scheme_name: string;
  government_level: GovernmentLevel;
  applicable_states: string[];
  department: string;
  section_title: string;
  page_or_clause: string;
  content: string;
  source_title: string;
  source_publisher: string;
  source_url: string;
  publication_date: string;
  last_verified_at: string;
  keywords: string[];
}

export interface UserProfile {
  state?: string;
  district?: string;
  age?: number | null;
  occupation?: string;
  is_student?: boolean | null;
  annual_income?: number | null;
  gender?: string;
  social_category?: string;
  has_disability?: boolean | null;
  landholding_status?: string;
  primary_need?: string;
  search_query?: string;
}

export interface CriterionEvaluation {
  criterion_id: string;
  description: string;
  status: 'consistent' | 'inconsistent' | 'unknown' | 'flagged_exception';
  reason: string;
}

export interface RecommendationResult {
  scheme: SchemeRecord;
  eligibility_state: EligibilityState;
  relevance_score: number;
  relevance_reasons: string[];
  matched_criteria: CriterionEvaluation[];
  unknown_criteria: CriterionEvaluation[];
  inconsistent_criteria: CriterionEvaluation[];
  flagged_exceptions: CriterionEvaluation[];
}

export interface RetrievedChunkResult {
  chunk: DocumentChunk;
  semantic_score: number;
  keyword_score: number;
  hybrid_score: number;
  matched_terms: string[];
}

export interface CitationItem {
  citation_id: string;
  scheme_id: string;
  source_title: string;
  official_publisher: string;
  page_or_section: string;
  source_url: string;
  publication_date: string;
  last_verified_at: string;
  excerpt: string;
}

export interface RAGAnswerResponse {
  query: string;
  generation_mode:
    | 'gemini-grounded'
    | 'live-web-search-grounded'
    | 'deterministic-retrieval-fallback';
  short_answer: string;
  why_relevant: string;
  requirements_to_check: string[];
  what_remains_uncertain: string[];
  documents_to_prepare: string[];
  how_to_apply: string[];
  important_limitation: string;
  follow_up_questions: string[];
  citations: CitationItem[];
  retrieved_chunks: RetrievedChunkResult[];
  security_flags: {
    prompt_injection_detected: boolean;
    sanitized_notes: string[];
  };
  validation_summary: {
    is_fully_grounded: boolean;
    has_conflicting_or_stale_sources: boolean;
    validation_notes: string[];
  };
}

export interface SourceVerificationRecord {
  source_id: string;
  scheme_id: string;
  scheme_name: string;
  source_title: string;
  publisher: string;
  original_url: string;
  date_retrieved: string;
  last_verified_date: string;
  publication_date: string;
  status: 'Verified Reachable' | 'Needs Periodic Re-Check' | 'Manual Verification Required';
  change_log: string;
}
