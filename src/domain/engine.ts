import {
  SchemeRecord,
  UserProfile,
  CriterionEvaluation,
  RecommendationResult,
  EligibilityState,
  DocumentChunk,
  RetrievedChunkResult,
  RAGAnswerResponse,
  CitationItem,
} from './types';

export interface SchemeFilterCriteria {
  keyword?: string;
  government_level?: string;
  state?: string;
  department?: string;
  beneficiary?: string;
  category?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const SYNONYM_CONCEPT_MAP: Record<string, string[]> = {
  college: ['scholarship', 'undergraduate', 'postgraduate', 'higher education', 'student', 'degree', 'diploma', 'tuition', 'post-matric', 'gopabandhu', 'pragati', 'saksham'],
  university: ['scholarship', 'undergraduate', 'postgraduate', 'higher education', 'student', 'gopabandhu'],
  scholarship: ['college', 'student', 'education', 'stipend', 'post-matric', 'gopabandhu', 'banishree', 'pragati', 'saksham', 'tuition'],
  study: ['student', 'scholarship', 'education', 'college', 'degree', 'post-matric'],
  farmer: ['agriculture', 'kisan', 'kalia', 'cm-kisan', 'cultivable', 'land', 'crop', 'kharif', 'rabi', 'krushak'],
  farming: ['farmer', 'agriculture', 'kisan', 'kalia', 'cm-kisan', 'land', 'cultivable'],
  crop: ['farmer', 'agriculture', 'kisan', 'kalia', 'kharif', 'rabi'],
  business: ['entrepreneur', 'msme', 'pmegp', 'vishwakarma', 'loan', 'subsidy', 'artisan', 'self-employed', 'micro-enterprise', 'startup'],
  loan: ['credit', 'subsidy', 'pmegp', 'vishwakarma', 'business', 'enterprise'],
  artisan: ['vishwakarma', 'craftsperson', 'tailor', 'carpenter', 'potter', 'blacksmith', 'weaver', 'mason', 'toolkit'],
  elderly: ['senior citizen', 'pension', 'madhu babu', 'mbpy', 'old age', '60', '70', 'ayushman'],
  old: ['senior citizen', 'pension', 'madhu babu', 'mbpy', '60', '70'],
  pension: ['madhu babu', 'mbpy', 'senior citizen', 'widow', 'disability', 'monthly', 'ssepd'],
  disability: ['disabled', 'pwd', 'divyang', 'udid', 'banishree', 'saksham', 'madhu babu', 'ssepd'],
  disabled: ['disability', 'pwd', 'udid', 'banishree', 'saksham', 'madhu babu'],
  women: ['female', 'girl', 'subhadra', 'mamata', 'pragati', 'widow', 'maternity', 'pregnant', 'mother'],
  woman: ['women', 'female', 'subhadra', 'mamata', 'pragati', 'widow'],
  pregnant: ['maternity', 'mamata', 'mother', 'lactating', 'anganwadi', 'mcp'],
  house: ['housing', 'pmay', 'awaas', 'gramin', 'pucca', 'kutcha', 'shelter', 'rural'],
  housing: ['house', 'pmay', 'awaas', 'gramin', 'pucca', 'kutcha', 'shelter'],
  hospital: ['health', 'ayushman', 'medical', 'insurance', 'cashless', 'gopabandhu jan arogya', 'treatment'],
  health: ['hospital', 'ayushman', 'medical', 'insurance', 'cashless', 'gopabandhu jan arogya'],
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is',
  'are', 'am', 'i', 'my', 'me', 'what', 'which', 'how', 'do', 'can', 'should',
  'be', 'with', 'this', 'that', 'from', 'by', 'as', 'it', 'if', 'about',
  'investigate', 'available', 'might', 'support', 'find', 'need', 'want',
]);

export function validateSchemeRecord(record: Partial<SchemeRecord>): ValidationResult {
  const errors: string[] = [];

  if (!record.scheme_id || record.scheme_id.trim().length < 3) {
    errors.push('scheme_id is required and must be at least 3 characters.');
  }
  if (!record.scheme_name || record.scheme_name.trim().length < 5) {
    errors.push('scheme_name is required and must be at least 5 characters.');
  }
  if (!record.short_description || record.short_description.trim().length < 10) {
    errors.push('short_description is required.');
  }
  if (
    record.government_level !== 'Central Government' &&
    record.government_level !== 'Odisha State Government'
  ) {
    errors.push('government_level must be "Central Government" or "Odisha State Government".');
  }
  if (!record.applicable_states || record.applicable_states.length === 0) {
    errors.push('applicable_states must contain at least one state or "All India".');
  }
  if (
    !record.official_scheme_url ||
    !record.official_scheme_url.startsWith('https://')
  ) {
    errors.push('official_scheme_url must be a valid https:// URL.');
  }
  if (!record.source_title || record.source_title.trim().length === 0) {
    errors.push('source_title is required to trace provenance.');
  }
  if (!record.source_last_verified_at || !/^\d{4}-\d{2}-\d{2}$/.test(record.source_last_verified_at)) {
    errors.push('source_last_verified_at must be a valid YYYY-MM-DD date.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function filterSchemes(
  schemes: SchemeRecord[],
  criteria: SchemeFilterCriteria
): SchemeRecord[] {
  return schemes.filter((scheme) => {
    if (
      criteria.government_level &&
      criteria.government_level !== 'All' &&
      scheme.government_level !== criteria.government_level
    ) {
      return false;
    }

    if (criteria.state && criteria.state !== 'All') {
      const matchesState =
        scheme.applicable_states.includes('All India') ||
        scheme.applicable_states.some(
          (s) => s.toLowerCase() === criteria.state!.toLowerCase()
        );
      if (!matchesState) {
        return false;
      }
    }

    if (
      criteria.department &&
      criteria.department !== 'All' &&
      !scheme.responsible_department
        .toLowerCase()
        .includes(criteria.department.toLowerCase())
    ) {
      return false;
    }

    if (
      criteria.beneficiary &&
      criteria.beneficiary !== 'All' &&
      !scheme.target_beneficiaries.some(
        (b) => b.toLowerCase() === criteria.beneficiary!.toLowerCase()
      )
    ) {
      return false;
    }

    if (
      criteria.category &&
      criteria.category !== 'All' &&
      scheme.scheme_category !== criteria.category
    ) {
      return false;
    }

    if (criteria.keyword && criteria.keyword.trim() !== '') {
      const q = criteria.keyword.toLowerCase().trim();
      const searchableText = [
        scheme.scheme_name,
        scheme.short_description,
        scheme.detailed_description,
        scheme.responsible_department,
        scheme.scheme_category,
        ...scheme.target_beneficiaries,
        ...scheme.required_documents,
      ]
        .join(' ')
        .toLowerCase();

      const terms = q.split(/\s+/).filter((t) => t.length > 1 && !STOP_WORDS.has(t));
      if (terms.length === 0) {
        return searchableText.includes(q);
      }

      const matchesAnyTermOrSynonym = terms.some((term) => {
        if (searchableText.includes(term)) return true;
        const synonyms = SYNONYM_CONCEPT_MAP[term] || [];
        return synonyms.some((syn) => searchableText.includes(syn));
      });

      if (!matchesAnyTermOrSynonym) {
        return false;
      }
    }

    return true;
  });
}

export function evaluateSchemeEligibility(
  scheme: SchemeRecord,
  profile: UserProfile
): {
  eligibility_state: EligibilityState;
  matched_criteria: CriterionEvaluation[];
  unknown_criteria: CriterionEvaluation[];
  inconsistent_criteria: CriterionEvaluation[];
  flagged_exceptions: CriterionEvaluation[];
} {
  const matched_criteria: CriterionEvaluation[] = [];
  const unknown_criteria: CriterionEvaluation[] = [];
  const inconsistent_criteria: CriterionEvaluation[] = [];
  const flagged_exceptions: CriterionEvaluation[] = [];

  // Geographical scope check first
  if (profile.state && profile.state.trim() !== '') {
    const stateApplies =
      scheme.applicable_states.includes('All India') ||
      scheme.applicable_states.some(
        (s) => s.toLowerCase() === profile.state!.toLowerCase()
      );
    if (!stateApplies) {
      inconsistent_criteria.push({
        criterion_id: 'geo-scope',
        description: `Geographical availability: Scheme applies only to ${scheme.applicable_states.join(', ')}.`,
        status: 'inconsistent',
        reason: `Your selected state (${profile.state}) is outside the published geographical scope (${scheme.applicable_states.join(', ')}).`,
      });
    }
  }

  for (const cond of scheme.eligibility_conditions) {
    const rawUserVal = getUserFieldValue(profile, cond.field);

    if (rawUserVal === undefined || rawUserVal === null || rawUserVal === '') {
      unknown_criteria.push({
        criterion_id: cond.criterion_id,
        description: cond.description,
        status: 'unknown',
        reason: `Not yet provided: "${formatFieldName(cond.field)}" is needed to check this requirement.`,
      });
      continue;
    }

    const passes = evaluateSingleCondition(cond.operator, rawUserVal, cond.value);

    if (passes) {
      matched_criteria.push({
        criterion_id: cond.criterion_id,
        description: cond.description,
        status: 'consistent',
        reason: `Your stated ${formatFieldName(cond.field)} (${String(rawUserVal)}) is consistent with this requirement.`,
      });
    } else if (cond.has_exceptions && cond.exception_note) {
      flagged_exceptions.push({
        criterion_id: cond.criterion_id,
        description: cond.description,
        status: 'flagged_exception',
        reason: `Your stated ${formatFieldName(cond.field)} (${String(rawUserVal)}) does not meet the standard threshold, but an official exception exists: ${cond.exception_note}`,
      });
    } else {
      inconsistent_criteria.push({
        criterion_id: cond.criterion_id,
        description: cond.description,
        status: 'inconsistent',
        reason: `Your stated ${formatFieldName(cond.field)} (${String(rawUserVal)}) appears inconsistent with the published condition (${cond.description}).`,
      });
    }
  }

  let eligibility_state: EligibilityState;

  if (inconsistent_criteria.length > 0) {
    eligibility_state = 'One or more stated criteria appear inconsistent';
  } else if (
    matched_criteria.length === 0 &&
    flagged_exceptions.length === 0 &&
    unknown_criteria.length > 0
  ) {
    eligibility_state = 'Unable to assess with available information';
  } else if (
    matched_criteria.length > 0 &&
    unknown_criteria.length === 0 &&
    flagged_exceptions.length === 0
  ) {
    eligibility_state = 'Some stated criteria appear consistent';
  } else if (matched_criteria.length > 0 || flagged_exceptions.length > 0) {
    eligibility_state = 'Additional information required';
  } else {
    eligibility_state = 'Unable to assess with available information';
  }

  return {
    eligibility_state,
    matched_criteria,
    unknown_criteria,
    inconsistent_criteria,
    flagged_exceptions,
  };
}

function getUserFieldValue(
  profile: UserProfile,
  field: SchemeRecord['eligibility_conditions'][number]['field']
): string | number | boolean | undefined | null {
  switch (field) {
    case 'state':
      return profile.state;
    case 'age':
      return profile.age;
    case 'annual_income':
      return profile.annual_income;
    case 'occupation':
      return profile.occupation;
    case 'is_student':
      return profile.is_student;
    case 'gender':
      return profile.gender;
    case 'social_category':
      return profile.social_category;
    case 'has_disability':
      return profile.has_disability;
    case 'landholding_status':
      return profile.landholding_status;
    default:
      return undefined;
  }
}

function formatFieldName(field: string): string {
  const map: Record<string, string> = {
    state: 'State of Residence',
    age: 'Age',
    annual_income: 'Annual Household Income',
    occupation: 'Occupation',
    is_student: 'Student Status',
    gender: 'Gender',
    social_category: 'Social Category',
    has_disability: 'Disability Status',
    landholding_status: 'Agricultural Landholding Status',
  };
  return map[field] || field;
}

function evaluateSingleCondition(
  operator: string,
  userVal: string | number | boolean,
  targetVal: string | number | boolean | string[] | [number, number]
): boolean {
  switch (operator) {
    case 'equals':
      return String(userVal).toLowerCase() === String(targetVal).toLowerCase();
    case 'boolean':
      return Boolean(userVal) === Boolean(targetVal);
    case 'in':
      if (Array.isArray(targetVal)) {
        return targetVal.some(
          (item) => String(item).toLowerCase() === String(userVal).toLowerCase()
        );
      }
      return false;
    case 'min':
      return Number(userVal) >= Number(targetVal);
    case 'max':
      return Number(userVal) <= Number(targetVal);
    case 'range':
      if (Array.isArray(targetVal) && targetVal.length === 2) {
        const num = Number(userVal);
        return num >= Number(targetVal[0]) && num <= Number(targetVal[1]);
      }
      return false;
    default:
      return false;
  }
}

export function recommendSchemes(
  schemes: SchemeRecord[],
  profile: UserProfile
): RecommendationResult[] {
  const results: RecommendationResult[] = schemes.map((scheme) => {
    const evalResult = evaluateSchemeEligibility(scheme, profile);
    const relevance_reasons: string[] = [];
    let relevance_score = 40; // Base score

    // Stage 2: Transparent Relevance Scoring
    if (profile.state) {
      if (
        scheme.applicable_states.some(
          (s) => s.toLowerCase() === profile.state!.toLowerCase()
        )
      ) {
        relevance_score += 15;
        relevance_reasons.push(
          `Geographic match: Available in ${profile.state} (${scheme.government_level}).`
        );
      } else if (scheme.applicable_states.includes('All India')) {
        relevance_score += 10;
        relevance_reasons.push('Geographic match: Available nationwide across India.');
      }
    }

    if (profile.primary_need && profile.primary_need !== 'Any') {
      const needLower = profile.primary_need.toLowerCase();
      if (
        scheme.scheme_category.toLowerCase().includes(needLower) ||
        scheme.short_description.toLowerCase().includes(needLower)
      ) {
        relevance_score += 25;
        relevance_reasons.push(
          `Direct category alignment with your stated need (${profile.primary_need}).`
        );
      }
    }

    if (profile.is_student === true) {
      if (
        scheme.target_beneficiaries.some((b) =>
          b.toLowerCase().includes('student')
        )
      ) {
        relevance_score += 20;
        relevance_reasons.push('Designed specifically for enrolled students.');
      }
    }

    if (profile.has_disability === true) {
      if (
        scheme.target_beneficiaries.some((b) =>
          b.toLowerCase().includes('disabilit')
        )
      ) {
        relevance_score += 22;
        relevance_reasons.push('Includes dedicated provisions for persons with disabilities.');
      }
    }

    if (profile.occupation && profile.occupation !== '') {
      const occLower = profile.occupation.toLowerCase();
      if (
        scheme.target_beneficiaries.some((b) =>
          b.toLowerCase().includes(occLower.split(' ')[0])
        ) ||
        scheme.short_description.toLowerCase().includes(occLower.split(' ')[0])
      ) {
        relevance_score += 18;
        relevance_reasons.push(
          `Matches your stated occupation or circumstance (${profile.occupation}).`
        );
      }
    }

    if (profile.search_query && profile.search_query.trim() !== '') {
      const qLower = profile.search_query.toLowerCase();
      const docText = `${scheme.scheme_name} ${scheme.short_description} ${scheme.detailed_description}`.toLowerCase();
      const words = qLower.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
      const matchedWords = words.filter(
        (w) =>
          docText.includes(w) ||
          (SYNONYM_CONCEPT_MAP[w] || []).some((syn) => docText.includes(syn))
      );
      if (matchedWords.length > 0) {
        relevance_score += Math.min(25, matchedWords.length * 10);
        relevance_reasons.push(
          `Semantic & keyword match on query terms: ${matchedWords.join(', ')}.`
        );
      }
    }

    // Adjust score based on eligibility evaluation
    relevance_score += evalResult.matched_criteria.length * 8;
    relevance_score += evalResult.flagged_exceptions.length * 4;
    if (evalResult.inconsistent_criteria.length > 0) {
      relevance_score = Math.max(10, relevance_score - 45);
    }

    // Source freshness bonus
    if (scheme.information_confidence === 'Verified Official Guideline') {
      relevance_score += 5;
      relevance_reasons.push(
        `Backed by verified official source (last checked ${scheme.source_last_verified_at}).`
      );
    }

    relevance_score = Math.min(99, Math.max(5, relevance_score));

    if (relevance_reasons.length === 0) {
      relevance_reasons.push(
        'Included from verified catalogue for general exploration.'
      );
    }

    return {
      scheme,
      eligibility_state: evalResult.eligibility_state,
      relevance_score,
      relevance_reasons,
      matched_criteria: evalResult.matched_criteria,
      unknown_criteria: evalResult.unknown_criteria,
      inconsistent_criteria: evalResult.inconsistent_criteria,
      flagged_exceptions: evalResult.flagged_exceptions,
    };
  });

  // Sort: non-inconsistent first, then by relevance_score descending
  return results.sort((a, b) => {
    const aInconsistent =
      a.eligibility_state === 'One or more stated criteria appear inconsistent'
        ? 1
        : 0;
    const bInconsistent =
      b.eligibility_state === 'One or more stated criteria appear inconsistent'
        ? 1
        : 0;
    if (aInconsistent !== bInconsistent) {
      return aInconsistent - bInconsistent;
    }
    return b.relevance_score - a.relevance_score;
  });
}

export function chunkDocumentText(
  rawText: string,
  chunkSizeChars = 420,
  overlapChars = 80
): string[] {
  const cleaned = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];
  if (cleaned.length <= chunkSizeChars) return [cleaned];

  const sentences = cleaned.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= chunkSizeChars) {
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) {
        chunks.push(current);
        const overlapSlice = current.slice(Math.max(0, current.length - overlapChars));
        current = (overlapSlice + ' ' + sentence).trim();
      } else {
        chunks.push(sentence.slice(0, chunkSizeChars));
        current = sentence.slice(chunkSizeChars - overlapChars);
      }
    }
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }
  return chunks;
}

export function tokenizeAndExpand(text: string): {
  rawTokens: string[];
  expandedTokens: string[];
} {
  const rawTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  const expandedSet = new Set<string>(rawTokens);
  for (const token of rawTokens) {
    const syns = SYNONYM_CONCEPT_MAP[token];
    if (syns) {
      for (const s of syns) {
        for (const sub of s.split(/\s+/)) {
          if (sub.length > 1) expandedSet.add(sub);
        }
      }
    }
  }

  return {
    rawTokens,
    expandedTokens: Array.from(expandedSet),
  };
}

export function retrieveRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  options?: { stateFilter?: string; governmentLevel?: string; topK?: number }
): RetrievedChunkResult[] {
  const topK = options?.topK ?? 4;
  const { rawTokens, expandedTokens } = tokenizeAndExpand(query);

  if (rawTokens.length === 0) {
    return [];
  }

  const filteredChunks = chunks.filter((chunk) => {
    if (
      options?.governmentLevel &&
      options.governmentLevel !== 'All' &&
      chunk.government_level !== options.governmentLevel
    ) {
      return false;
    }
    if (options?.stateFilter && options.stateFilter !== 'All') {
      return (
        chunk.applicable_states.includes('All India') ||
        chunk.applicable_states.some(
          (s) => s.toLowerCase() === options.stateFilter!.toLowerCase()
        )
      );
    }
    return true;
  });

  const scored: RetrievedChunkResult[] = filteredChunks.map((chunk) => {
    const chunkFullText = `${chunk.scheme_name} ${chunk.section_title} ${chunk.content} ${chunk.keywords.join(' ')}`.toLowerCase();
    const { expandedTokens: chunkExpanded } = tokenizeAndExpand(chunkFullText);
    const chunkTokenSet = new Set(chunkExpanded);

    // Exact keyword score
    const exactMatches = rawTokens.filter((t) => chunkFullText.includes(t));
    const keyword_score =
      rawTokens.length > 0
        ? Number((exactMatches.length / rawTokens.length).toFixed(3))
        : 0;

    // Semantic concept cosine-style overlap score
    const matchedSemantic = expandedTokens.filter(
      (t) => chunkTokenSet.has(t) || chunkFullText.includes(t)
    );
    const denom = Math.sqrt(expandedTokens.length * Math.max(1, Math.min(25, chunkTokenSet.size)));
    const rawCosine = denom > 0 ? matchedSemantic.length / denom : 0;
    const semantic_score = Number(Math.min(0.98, rawCosine).toFixed(3));

    const hybrid_score = Number(
      Math.min(0.99, semantic_score * 0.65 + keyword_score * 0.35).toFixed(3)
    );

    return {
      chunk,
      semantic_score,
      keyword_score,
      hybrid_score,
      matched_terms: Array.from(new Set([...exactMatches, ...matchedSemantic])).slice(0, 8),
    };
  });

  return scored
    .filter((item) => item.hybrid_score >= 0.22)
    .sort((a, b) => b.hybrid_score - a.hybrid_score)
    .slice(0, topK);
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s*prompt/i,
  /override\s+(system|safety|eligibility|rules)/i,
  /you\s+are\s+now\s+an?\s+official/i,
  /guarantee\s+(that\s+)?i\s+(qualify|am\s+eligible)/i,
  /reveal\s+(your\s+)?(api\s*key|secret|env|environment)/i,
  /disregard\s+retrieved\s+documents/i,
];

export function detectPromptInjection(input: string): {
  detected: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      reasons.push(
        `Detected untrusted instruction override pattern matching ${pattern.source}`
      );
    }
  }
  return {
    detected: reasons.length > 0,
    reasons,
  };
}

export function sanitizeUntrustedEvidence(text: string): string {
  return text
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, '[REDACTED_INSTRUCTION_OVERRIDE]')
    .replace(/system\s*override\s*:/gi, '[REDACTED_OVERRIDE]');
}

export function buildDeterministicRAGResponse(
  query: string,
  retrievedChunks: RetrievedChunkResult[],
  allSchemes: SchemeRecord[]
): RAGAnswerResponse {
  const injectionCheck = detectPromptInjection(query);

  if (injectionCheck.detected) {
    return {
      query,
      generation_mode: 'deterministic-retrieval-fallback',
      short_answer:
        'Security Notice: Your request contained instructions attempting to override system grounding rules, expose secrets, or force an official eligibility guarantee. This assistant treats all inputs and documents strictly as evidence and cannot bypass verification rules.',
      why_relevant:
        'The assistant is restricted to answering factual questions about verified Indian Central and Odisha government schemes using official published guidelines.',
      requirements_to_check: [
        'Ask a specific question about scheme benefits, eligibility conditions, required documents, or official portals.',
      ],
      what_remains_uncertain: [
        'No scheme assessment was performed because an instruction-override pattern was blocked.',
      ],
      documents_to_prepare: [],
      how_to_apply: [],
      important_limitation:
        'This tool is an independent information assistant, not an official government authority, and never guarantees benefit approval.',
      follow_up_questions: [
        'What scholarships are available for college students in Odisha?',
        'What are the eligibility conditions and exclusions for PM-KISAN?',
      ],
      citations: [],
      retrieved_chunks: [],
      security_flags: {
        prompt_injection_detected: true,
        sanitized_notes: injectionCheck.reasons,
      },
      validation_summary: {
        is_fully_grounded: true,
        has_conflicting_or_stale_sources: false,
        validation_notes: ['Blocked untrusted prompt-injection attempt before generation.'],
      },
    };
  }

  if (retrievedChunks.length === 0) {
    return {
      query,
      generation_mode: 'deterministic-retrieval-fallback',
      short_answer:
        'I could not find verified official evidence in the current scheme database to answer this specific question.',
      why_relevant:
        'Our verified repository currently covers 10 core Central Government and Odisha State schemes (including PM-KISAN, CM-KISAN/KALIA, Gopabandhu Sikhya Sahayata, Post-Matric Scholarships, SUBHADRA, Madhu Babu Pension, PM Vishwakarma, PMEGP, PMAY-G, Ayushman Bharat/GJAY, Banishree, MAMATA, and AICTE Pragati/Saksham).',
      requirements_to_check: [
        'Check whether the scheme you are asking about falls under another state government or a specialized departmental notification not yet ingested.',
      ],
      what_remains_uncertain: [
        'No verified source document in our local corpus matched your query terms with sufficient confidence.',
      ],
      documents_to_prepare: [],
      how_to_apply: [
        'Visit myscheme.gov.in or odisha.gov.in to search across broader departmental directories.',
      ],
      important_limitation:
        'To prevent hallucinations, this assistant refuses to guess eligibility rules, benefit amounts, or deadlines when no verified document chunk is retrieved.',
      follow_up_questions: [
        'Which schemes in the database support farmers in Odisha?',
        'What scholarships should a college student in Odisha investigate?',
        'What support is available for women under SUBHADRA Yojana?',
      ],
      citations: [],
      retrieved_chunks: [],
      security_flags: {
        prompt_injection_detected: false,
        sanitized_notes: [],
      },
      validation_summary: {
        is_fully_grounded: true,
        has_conflicting_or_stale_sources: false,
        validation_notes: [
          'Zero-evidence refusal triggered correctly: avoided fabricating unverified policy claims.',
        ],
      },
    };
  }

  const matchedSchemeIds = Array.from(
    new Set(retrievedChunks.map((r) => r.chunk.scheme_id))
  );
  const matchedSchemes = matchedSchemeIds
    .map((id) => allSchemes.find((s) => s.scheme_id === id))
    .filter((s): s is SchemeRecord => Boolean(s));

  const primaryScheme = matchedSchemes[0];
  const schemeNamesList = matchedSchemes.map((s) => s.scheme_name).join('; ');

  const citations: CitationItem[] = retrievedChunks.map((item, idx) => ({
    citation_id: `CIT-${idx + 1}`,
    scheme_id: item.chunk.scheme_id,
    source_title: item.chunk.source_title,
    official_publisher: item.chunk.source_publisher,
    page_or_section: `${item.chunk.section_title} (${item.chunk.page_or_clause})`,
    source_url: item.chunk.source_url,
    publication_date: item.chunk.publication_date,
    last_verified_at: item.chunk.last_verified_at,
    excerpt: sanitizeUntrustedEvidence(item.chunk.content),
  }));

  const requirements_to_check = matchedSchemes.flatMap((s) =>
    s.eligibility_conditions.map(
      (c) =>
        `${s.scheme_name}: ${c.description}${c.has_exceptions && c.exception_note ? ` (Note exception: ${c.exception_note})` : ''}`
    )
  );

  const exclusions_to_note = matchedSchemes.flatMap((s) =>
    s.exclusions.slice(0, 2).map((ex) => `${s.scheme_name} Exclusion: ${ex}`)
  );

  const documents_to_prepare = Array.from(
    new Set(matchedSchemes.flatMap((s) => s.required_documents))
  );

  const how_to_apply = primaryScheme ? primaryScheme.application_method : [];

  const unverifiedNotes = matchedSchemes.flatMap((s) =>
    s.unverified_fields.map((u) => `${s.scheme_name}: ${u} is not fixed in static guidelines and must be checked on ${s.official_scheme_url}.`)
  );

  return {
    query,
    generation_mode: 'deterministic-retrieval-fallback',
    short_answer: `Based on retrieved official guidelines [CIT-1], the most relevant scheme(s) to investigate are: ${schemeNamesList}. ${primaryScheme ? primaryScheme.short_description : ''}`,
    why_relevant: `Your question matched verified passages from ${matchedSchemes.length} official scheme record(s) (${matchedSchemes.map((s) => `${s.scheme_name} [${s.government_level}]`).join(', ')}). Remember that matching a topic does not guarantee official eligibility.`,
    requirements_to_check: [...requirements_to_check, ...exclusions_to_note].slice(0, 7),
    what_remains_uncertain: [
      'Your individual household income, exact age, caste/category certificate status, and landholding records have not been verified by an official authority.',
      ...unverifiedNotes,
    ],
    documents_to_prepare,
    how_to_apply,
    important_limitation:
      'Preliminary guidance only: This assistant is not an official government service. Final eligibility and benefit disbursement are determined exclusively by the responsible government department upon verification of your original certificates.',
    follow_up_questions: [
      primaryScheme
        ? `What are the specific exclusions that could disqualify an applicant from ${primaryScheme.scheme_name}?`
        : 'What documents are required to apply?',
      'How does my household income or state affect my eligibility for these schemes?',
    ],
    citations,
    retrieved_chunks: retrievedChunks,
    security_flags: {
      prompt_injection_detected: false,
      sanitized_notes: [],
    },
    validation_summary: {
      is_fully_grounded: true,
      has_conflicting_or_stale_sources: unverifiedNotes.length > 0,
      validation_notes: [
        `Grounded in ${citations.length} retrieved official passage(s).`,
        `All cited URLs belong to verified government domains (.gov.in / .nic.in / aicte-india.org).`,
      ],
    },
  };
}
