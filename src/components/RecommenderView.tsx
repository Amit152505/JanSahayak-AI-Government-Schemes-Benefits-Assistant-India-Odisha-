import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { SchemeRecord, UserProfile, EligibilityState } from '../domain/types';
import { recommendSchemes } from '../domain/engine';

interface RecommenderViewProps {
  schemes: SchemeRecord[];
  onInspectScheme: (scheme: SchemeRecord) => void;
  onAskAssistantAboutScheme: (scheme: SchemeRecord) => void;
}

const PERSONA_PRESETS: { label: string; profile: UserProfile }[] = [
  {
    label: 'Odisha College Student (Low Income)',
    profile: {
      state: 'Odisha',
      age: 20,
      occupation: 'Student',
      is_student: true,
      annual_income: 120000,
      gender: 'Female',
      social_category: 'OBC',
      has_disability: false,
      primary_need: 'Higher Education & Scholarships',
    },
  },
  {
    label: 'Odisha Small Farmer (Cultivable Land)',
    profile: {
      state: 'Odisha',
      age: 42,
      occupation: 'Farmer',
      is_student: false,
      annual_income: 95000,
      landholding_status: 'Cultivable Landholder',
      primary_need: 'Agriculture & Rural Livelihood',
    },
  },
  {
    label: 'Odisha Woman (Age 32, NFSA Household)',
    profile: {
      state: 'Odisha',
      age: 32,
      gender: 'Female',
      occupation: 'Homemaker / Self-Employed',
      is_student: false,
      annual_income: 140000,
      primary_need: 'Women & Child Empowerment',
    },
  },
  {
    label: 'Senior Citizen in Odisha (Age 68)',
    profile: {
      state: 'Odisha',
      age: 68,
      occupation: 'Retired / Unorganized Sector',
      is_student: false,
      annual_income: 48000,
      primary_need: 'Social Security & Pensions',
    },
  },
  {
    label: 'Student with Disability (Partial Info - Income Skipped)',
    profile: {
      state: 'Odisha',
      age: 19,
      is_student: true,
      has_disability: true,
      annual_income: null,
      primary_need: 'Disability Support',
    },
  },
];

export const RecommenderView: React.FC<RecommenderViewProps> = ({
  schemes,
  onInspectScheme,
  onAskAssistantAboutScheme,
}) => {
  const [profile, setProfile] = useState<UserProfile>({
    state: 'Odisha',
    age: 20,
    occupation: 'Student',
    is_student: true,
    annual_income: 120000,
    gender: '',
    social_category: '',
    has_disability: null,
    landholding_status: '',
    primary_need: 'Higher Education & Scholarships',
    search_query: '',
  });

  const [stateFilterTab, setStateFilterTab] = useState<'all' | 'consistent_or_partial' | 'inconsistent'>('consistent_or_partial');

  const recommendations = useMemo(() => {
    return recommendSchemes(schemes, profile);
  }, [schemes, profile]);

  const displayedRecommendations = useMemo(() => {
    if (stateFilterTab === 'all') return recommendations;
    if (stateFilterTab === 'inconsistent') {
      return recommendations.filter(
        (r) =>
          r.eligibility_state ===
          'One or more stated criteria appear inconsistent'
      );
    }
    return recommendations.filter(
      (r) =>
        r.eligibility_state !==
        'One or more stated criteria appear inconsistent'
    );
  }, [recommendations, stateFilterTab]);

  const handleClearProfile = () => {
    setProfile({
      state: '',
      age: null,
      occupation: '',
      is_student: null,
      annual_income: null,
      gender: '',
      social_category: '',
      has_disability: null,
      landholding_status: '',
      primary_need: 'Any',
      search_query: '',
    });
  };

  const renderStateIndicator = (state: EligibilityState) => {
    switch (state) {
      case 'Some stated criteria appear consistent':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>State: Some stated criteria appear consistent</span>
          </div>
        );
      case 'Additional information required':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A3412]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>State: Additional information required</span>
          </div>
        );
      case 'One or more stated criteria appear inconsistent':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#991B1B]">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>State: One or more stated criteria appear inconsistent</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E]">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>State: Unable to assess with available information</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Three-Concept Separation Explanation */}
      <section className="bg-[#F3EFE6] border border-[#E7E2D8] rounded-xl p-6 md:p-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-[#1C1917]">
          Two-Stage Transparent Scheme Recommendation Engine
        </h1>
        <p className="mt-2 text-sm text-[#44403C] max-w-3xl leading-relaxed">
          Provide only the profile details you wish to share (or skip any field).
          Our engine uses deterministic Python rules for hard constraints and
          transparent scoring for relevance—never treating a skipped question as
          a failed requirement.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#D6CEBE] text-xs">
          <div>
            <strong className="text-[#1C1917] block">
              1. Relevance (Topic Match)
            </strong>
            <span className="text-[#57534E]">
              How closely a scheme aligns with your stated need, state, and
              life circumstance.
            </span>
          </div>
          <div>
            <strong className="text-[#1C1917] block">
              2. Eligibility Evidence (3-State Check)
            </strong>
            <span className="text-[#57534E]">
              Whether your provided facts are consistent, inconsistent, or leave
              published rules unknown.
            </span>
          </div>
          <div>
            <strong className="text-[#1C1917] block">
              3. Official Determination
            </strong>
            <span className="text-[#57534E]">
              Only the responsible government department makes the final
              decision upon verifying original documents.
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Optional Profile Form */}
        <section
          aria-label="Optional Citizen Profile"
          className="lg:col-span-5 bg-white border border-[#E7E2D8] rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F3EFE6]">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                Optional User Profile
              </h2>
              <p className="text-xs text-[#57534E]">
                All fields are optional and stay in your browser session.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearProfile}
              className="px-3 py-1.5 text-xs font-medium text-[#57534E] bg-[#F3EFE6] hover:text-[#1C1917] rounded-md cursor-pointer whitespace-nowrap shrink-0"
            >
              Skip / Clear All
            </button>
          </div>

          {/* Preset Test Personas */}
          <div>
            <div className="text-xs font-medium text-[#57534E] mb-2">
              Load a representative test scenario (Phase 3 Evaluation):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERSONA_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setProfile(preset.profile)}
                  className="px-2.5 py-1 text-xs bg-[#FBF9F5] hover:bg-[#1E3A8A]/10 text-[#1C1917] border border-[#D6CEBE] rounded transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* State */}
            <div>
              <label
                htmlFor="prof-state"
                className="block font-semibold text-[#1C1917]"
              >
                State of Residence
              </label>
              <span className="block text-[#57534E] mb-1">
                Why needed: Distinguishes Odisha state schemes from Central
                all-India schemes.
              </span>
              <select
                id="prof-state"
                value={profile.state || ''}
                onChange={(e) =>
                  setProfile({ ...profile, state: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917]"
              >
                <option value="">-- Skip / Not Provided --</option>
                <option value="Odisha">Odisha</option>
                <option value="All India">Other Indian State (Maharashtra, Bihar, etc.)</option>
              </select>
            </div>

            {/* Primary Need */}
            <div>
              <label
                htmlFor="prof-need"
                className="block font-semibold text-[#1C1917]"
              >
                Primary Area of Support Needed
              </label>
              <span className="block text-[#57534E] mb-1">
                Why needed: Ranks relevant departmental categories higher.
              </span>
              <select
                id="prof-need"
                value={profile.primary_need || 'Any'}
                onChange={(e) =>
                  setProfile({ ...profile, primary_need: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917]"
              >
                <option value="Any">Any / Explore All Categories</option>
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
                <option value="Skill, Artisans & Self-Employment">
                  Skill, Artisans & Self-Employment
                </option>
                <option value="Housing & Rural Shelter">
                  Housing & Rural Shelter
                </option>
                <option value="Healthcare & Insurance">
                  Healthcare & Insurance
                </option>
                <option value="Disability Support">Disability Support</option>
              </select>
            </div>

            {/* Age & Income */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prof-age"
                  className="block font-semibold text-[#1C1917]"
                >
                  Age (Years)
                </label>
                <span className="block text-[#57534E] mb-1">
                  Checks 18+, 21–59 (SUBHADRA), or 60+/70+ rules.
                </span>
                <input
                  id="prof-age"
                  type="number"
                  min={1}
                  max={110}
                  value={profile.age ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      age:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="Optional (e.g. 22)"
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-income"
                  className="block font-semibold text-[#1C1917]"
                >
                  Approx. Annual Family Income (₹)
                </label>
                <span className="block text-[#57534E] mb-1">
                  Checks ₹60k, ₹2.5L, or ₹8L thresholds.
                </span>
                <input
                  id="prof-income"
                  type="number"
                  min={0}
                  step={5000}
                  value={profile.annual_income ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      annual_income:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="Optional (e.g. 120000)"
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Student Status & Occupation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prof-student"
                  className="block font-semibold text-[#1C1917]"
                >
                  Enrolled Student Status
                </label>
                <select
                  id="prof-student"
                  value={
                    profile.is_student === null ||
                    profile.is_student === undefined
                      ? ''
                      : String(profile.is_student)
                  }
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      is_student:
                        e.target.value === ''
                          ? null
                          : e.target.value === 'true',
                    })
                  }
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg mt-1"
                >
                  <option value="">-- Skip / Unknown --</option>
                  <option value="true">Yes (Currently Enrolled Student)</option>
                  <option value="false">No (Not a Student)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="prof-occupation"
                  className="block font-semibold text-[#1C1917]"
                >
                  Occupation / Circumstance
                </label>
                <select
                  id="prof-occupation"
                  value={profile.occupation || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, occupation: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg mt-1"
                >
                  <option value="">-- Skip / Unknown --</option>
                  <option value="Student">Student</option>
                  <option value="Farmer">Farmer / Agriculture</option>
                  <option value="Agricultural Labourer">
                    Landless Agricultural Labourer
                  </option>
                  <option value="Artisan / Craftsperson">
                    Traditional Artisan / Craftsperson
                  </option>
                  <option value="Unemployed / Job Seeker">
                    Unemployed / Job Seeker
                  </option>
                  <option value="Small Business / Self-Employed">
                    Small Business / Self-Employed
                  </option>
                </select>
              </div>
            </div>

            {/* Optional Category-Specific Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prof-gender"
                  className="block font-semibold text-[#1C1917]"
                >
                  Gender (For Women-Specific Schemes)
                </label>
                <select
                  id="prof-gender"
                  value={profile.gender || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, gender: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg mt-1"
                >
                  <option value="">-- Skip / Any --</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="prof-pwd"
                  className="block font-semibold text-[#1C1917]"
                >
                  Benchmark Disability (≥40% UDID)
                </label>
                <select
                  id="prof-pwd"
                  value={
                    profile.has_disability === null ||
                    profile.has_disability === undefined
                      ? ''
                      : String(profile.has_disability)
                  }
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      has_disability:
                        e.target.value === ''
                          ? null
                          : e.target.value === 'true',
                    })
                  }
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg mt-1"
                >
                  <option value="">-- Skip / Unknown --</option>
                  <option value="true">Yes (≥40% Certified Disability)</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prof-social-cat"
                  className="block font-semibold text-[#1C1917]"
                >
                  Social Category (Only if checking SC/ST/OBC)
                </label>
                <select
                  id="prof-social-cat"
                  value={profile.social_category || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, social_category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg mt-1"
                >
                  <option value="">-- Skip / Prefer Not to Say --</option>
                  <option value="SC">Scheduled Caste (SC)</option>
                  <option value="ST">Scheduled Tribe (ST)</option>
                  <option value="OBC">OBC / SEBC</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="prof-land"
                  className="block font-semibold text-[#1C1917]"
                >
                  Landholding (For Farm Schemes)
                </label>
                <select
                  id="prof-land"
                  value={profile.landholding_status || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      landholding_status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg mt-1"
                >
                  <option value="">-- Skip / Unknown --</option>
                  <option value="Cultivable Landholder">
                    Cultivable Landholder (Patta/RoR)
                  </option>
                  <option value="Landless Agricultural Household">
                    Landless Agricultural Household
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-[#F3EFE6] border border-[#E7E2D8] rounded-lg flex items-start gap-2.5 text-xs text-[#44403C]">
            <ShieldCheck className="w-4 h-4 text-[#14532D] shrink-0 mt-0.5" />
            <div>
              <strong>Privacy Protection:</strong> No personal profile data is
              saved to a database or transmitted to advertising trackers. We
              never ask for Aadhaar, PAN, bank account numbers, or OTPs.
            </div>
          </div>
        </section>

        {/* Right Column: Explained Recommendations */}
        <section
          aria-label="Recommendation Results"
          className="lg:col-span-7 space-y-5"
        >
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                Evaluated Scheme Recommendations
              </h2>
              <p className="text-xs text-[#57534E]">
                Ranked by transparent rule alignment & relevance. Never rely on a
                score without reviewing the condition breakdown below.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg">
              <button
                type="button"
                onClick={() => setStateFilterTab('consistent_or_partial')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  stateFilterTab === 'consistent_or_partial'
                    ? 'bg-white text-[#1C1917] shadow-xs font-semibold'
                    : 'text-[#57534E]'
                }`}
              >
                Potentially Relevant (
                {
                  recommendations.filter(
                    (r) =>
                      r.eligibility_state !==
                      'One or more stated criteria appear inconsistent'
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setStateFilterTab('inconsistent')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  stateFilterTab === 'inconsistent'
                    ? 'bg-white text-[#1C1917] shadow-xs font-semibold'
                    : 'text-[#57534E]'
                }`}
              >
                Criteria Inconsistent (
                {
                  recommendations.filter(
                    (r) =>
                      r.eligibility_state ===
                      'One or more stated criteria appear inconsistent'
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setStateFilterTab('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  stateFilterTab === 'all'
                    ? 'bg-white text-[#1C1917] shadow-xs font-semibold'
                    : 'text-[#57534E]'
                }`}
              >
                All ({recommendations.length})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {displayedRecommendations.map((rec) => (
              <article
                key={rec.scheme.scheme_id}
                className="bg-white border border-[#E7E2D8] rounded-xl p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#57534E] mb-1">
                      <span className="font-medium text-[#1E3A8A]">
                        {rec.scheme.government_level}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{rec.scheme.scheme_category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Verified: {rec.scheme.source_last_verified_at}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-[#1C1917]">
                      {rec.scheme.scheme_name}
                    </h3>
                  </div>

                  <div className="text-right font-mono text-xs text-[#57534E] tabular-nums shrink-0">
                    Relevance Alignment: {rec.relevance_score}/100
                  </div>
                </div>

                {/* Explicit Eligibility Evidence State */}
                <div className="p-3 bg-[#FBF9F5] border border-[#E7E2D8] rounded-lg">
                  {renderStateIndicator(rec.eligibility_state)}
                </div>

                {/* Why Retrieved */}
                <div className="text-xs text-[#292524] space-y-1">
                  <div className="font-semibold text-[#1C1917]">
                    Why This Scheme Appeared:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[#44403C]">
                    {rec.relevance_reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>

                {/* Condition Breakdown: Consistent, Unknown, Exceptions, Inconsistent */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                  {/* Supporting Evidence */}
                  <div className="p-3.5 bg-[#F3EFE6]/60 border border-[#E7E2D8] rounded-lg space-y-1.5">
                    <div className="font-semibold text-[#14532D]">
                      Requirements With Supporting Evidence (
                      {rec.matched_criteria.length})
                    </div>
                    {rec.matched_criteria.length > 0 ? (
                      <ul className="space-y-1 text-[#292524]">
                        {rec.matched_criteria.map((c) => (
                          <li key={c.criterion_id}>• {c.reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[#57534E]">
                        No specific profile field matched yet.
                      </p>
                    )}
                  </div>

                  {/* Unknown or Exception Requirements */}
                  <div className="p-3.5 bg-[#F3EFE6]/60 border border-[#E7E2D8] rounded-lg space-y-1.5">
                    <div className="font-semibold text-[#9A3412]">
                      Unknown / Needs Verification (
                      {rec.unknown_criteria.length +
                        rec.flagged_exceptions.length}
                      )
                    </div>
                    {rec.unknown_criteria.length === 0 &&
                    rec.flagged_exceptions.length === 0 ? (
                      <p className="text-[#57534E]">
                        All structured fields provided; check general exclusions
                        and required documents.
                      </p>
                    ) : (
                      <ul className="space-y-1 text-[#292524]">
                        {rec.unknown_criteria.map((u) => (
                          <li key={u.criterion_id}>• {u.reason}</li>
                        ))}
                        {rec.flagged_exceptions.map((ex) => (
                          <li
                            key={ex.criterion_id}
                            className="text-[#9A3412] font-medium"
                          >
                            • Exception to verify: {ex.reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Inconsistent Criteria (if any) */}
                {rec.inconsistent_criteria.length > 0 && (
                  <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B] space-y-1">
                    <div className="font-semibold">
                      Requirements Appearing Inconsistent (
                      {rec.inconsistent_criteria.length}):
                    </div>
                    <ul className="space-y-1">
                      {rec.inconsistent_criteria.map((inc) => (
                        <li key={inc.criterion_id}>• {inc.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Source & Actions */}
                <div className="pt-3 border-t border-[#E7E2D8] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-[#57534E]">
                    Source: {rec.scheme.source_title} ({rec.scheme.source_publisher})
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onInspectScheme(rec.scheme)}
                      className="px-3.5 py-1.5 font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172554] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Open Scheme Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onAskAssistantAboutScheme(rec.scheme)}
                      className="px-3.5 py-1.5 font-semibold text-[#1E3A8A] bg-[#1E3A8A]/10 rounded-lg hover:bg-[#1E3A8A]/20 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Ask Follow-Up Question
                    </button>
                    <a
                      href={rec.scheme.official_scheme_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#57534E] hover:text-[#1C1917] whitespace-nowrap shrink-0"
                    >
                      <span>Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
