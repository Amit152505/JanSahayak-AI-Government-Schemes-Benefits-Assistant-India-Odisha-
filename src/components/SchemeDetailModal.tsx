import React from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { SchemeRecord } from '../domain/types';

interface SchemeDetailModalProps {
  scheme: SchemeRecord | null;
  onClose: () => void;
  onAskAssistantAboutScheme: (scheme: SchemeRecord) => void;
}

export const SchemeDetailModal: React.FC<SchemeDetailModalProps> = ({
  scheme,
  onClose,
  onAskAssistantAboutScheme,
}) => {
  if (!scheme) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scheme-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FBF9F5] border border-[#D6CEBE] rounded-xl shadow-xl p-6 md:p-8 text-[#1C1917]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#E7E2D8]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] mb-2">
              <span className="font-medium text-[#1E3A8A]">
                {scheme.government_level}
              </span>
              <span aria-hidden="true">·</span>
              <span>{scheme.scheme_category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Status: {scheme.scheme_effective_status}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Last Checked: {scheme.source_last_verified_at}
              </span>
            </div>
            <h2
              id="scheme-detail-title"
              className="font-display text-2xl md:text-3xl font-semibold text-[#1C1917]"
            >
              {scheme.scheme_name}
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              Responsible Department: {scheme.responsible_department}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scheme details"
            className="p-2 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3EFE6] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary & Preliminary Notice */}
        <div className="mt-6 space-y-6">
          <div className="p-4 bg-[#F3EFE6] border border-[#E7E2D8] rounded-lg text-xs text-[#44403C] leading-relaxed">
            <strong className="text-[#1C1917]">
              Preliminary Information Notice:
            </strong>{' '}
            This summary is compiled from official published guidelines (
            {scheme.source_title}). Final eligibility and benefit sanction are
            determined exclusively by the responsible authority (
            {scheme.responsible_department}).
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold text-[#1C1917] mb-2">
              Overview & Detailed Description
            </h3>
            <p className="text-sm text-[#292524] leading-relaxed">
              {scheme.detailed_description}
            </p>
          </div>

          {/* Benefits & Geographical Scope Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="p-5 bg-white border border-[#E7E2D8] rounded-lg">
              <div className="text-xs font-medium text-[#57534E] mb-1">
                Published Benefit Quantum
              </div>
              <div className="font-mono text-xl font-semibold text-[#14532D] tabular-nums">
                {scheme.benefit_amount !== null
                  ? `₹${scheme.benefit_amount.toLocaleString('en-IN')} (${scheme.benefit_frequency})`
                  : scheme.benefit_frequency}
              </div>
              <p className="text-xs text-[#44403C] mt-2 leading-relaxed">
                {scheme.benefit_description}
              </p>
            </div>

            <div className="p-5 bg-white border border-[#E7E2D8] rounded-lg">
              <div className="text-xs font-medium text-[#57534E] mb-1">
                Geographical Scope & Target Groups
              </div>
              <div className="text-sm font-semibold text-[#1C1917]">
                States: {scheme.applicable_states.join(', ')} (
                {scheme.applicable_districts.join(', ')})
              </div>
              <p className="text-xs text-[#44403C] mt-2 leading-relaxed">
                Intended Beneficiary Groups:{' '}
                {scheme.target_beneficiaries.join(' · ')}
              </p>
            </div>
          </div>

          {/* Eligibility Conditions & Exclusions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-white border border-[#E7E2D8] rounded-lg">
              <h3 className="font-display text-base font-semibold text-[#1C1917] mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#14532D] shrink-0" />
                <span>Published Eligibility Conditions</span>
              </h3>
              <ul className="space-y-3 text-xs text-[#292524] leading-relaxed">
                {scheme.eligibility_conditions.map((cond) => (
                  <li
                    key={cond.criterion_id}
                    className="pb-2.5 border-b border-[#F3EFE6] last:border-none last:pb-0"
                  >
                    <div className="font-medium text-[#1C1917]">
                      {cond.description}
                    </div>
                    <div className="text-[#57534E] mt-0.5 font-mono">
                      Rule: {cond.field} {cond.operator}{' '}
                      {JSON.stringify(cond.value)} ·{' '}
                      {cond.is_mandatory ? 'Mandatory' : 'Conditional'}
                    </div>
                    {cond.has_exceptions && cond.exception_note && (
                      <div className="mt-1 text-[#9A3412] bg-[#FEF3C7]/50 p-2 rounded border border-[#FDE68A]">
                        <strong>Documented Exception:</strong>{' '}
                        {cond.exception_note}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-white border border-[#E7E2D8] rounded-lg">
              <h3 className="font-display text-base font-semibold text-[#1C1917] mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#9A3412] shrink-0" />
                <span>Documented Exclusions (Disqualifiers)</span>
              </h3>
              {scheme.exclusions.length > 0 ? (
                <ul className="space-y-2.5 text-xs text-[#292524] leading-relaxed list-disc pl-4">
                  {scheme.exclusions.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#57534E]">
                  No specific exclusions documented in summary record; verify full
                  departmental guideline.
                </p>
              )}
            </div>
          </div>

          {/* Required Documents & Application Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-white border border-[#E7E2D8] rounded-lg">
              <h3 className="font-display text-base font-semibold text-[#1C1917] mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1E3A8A] shrink-0" />
                <span>Documents to Prepare</span>
              </h3>
              <ul className="space-y-2 text-xs text-[#292524] leading-relaxed list-disc pl-4">
                {scheme.required_documents.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-white border border-[#E7E2D8] rounded-lg">
              <h3 className="font-display text-base font-semibold text-[#1C1917] mb-3">
                Official Application Method
              </h3>
              <ol className="space-y-2.5 text-xs text-[#292524] leading-relaxed list-decimal pl-4">
                {scheme.application_method.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Source Provenance, Dates & Unknown Fields */}
          <div className="p-5 bg-[#F3EFE6] border border-[#D6CEBE] rounded-lg space-y-3">
            <h3 className="font-display text-base font-semibold text-[#1C1917]">
              Source Provenance, Freshness Dates & Unverified Fields
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <dt className="text-[#57534E]">Official Source Title</dt>
                <dd className="font-medium text-[#1C1917] mt-0.5">
                  {scheme.source_title}
                </dd>
              </div>
              <div>
                <dt className="text-[#57534E]">Publisher</dt>
                <dd className="font-medium text-[#1C1917] mt-0.5">
                  {scheme.source_publisher}
                </dd>
              </div>
              <div>
                <dt className="text-[#57534E]">Source Publication Date</dt>
                <dd className="font-mono font-medium text-[#1C1917] mt-0.5 tabular-nums">
                  {scheme.source_publication_date}
                </dd>
              </div>
              <div>
                <dt className="text-[#57534E]">Last Verified by App</dt>
                <dd className="font-mono font-medium text-[#14532D] mt-0.5 tabular-nums">
                  {scheme.source_last_verified_at}
                </dd>
              </div>
            </dl>

            <div className="pt-2 border-t border-[#E7E2D8] text-xs text-[#44403C]">
              <strong>Limitations & Validity Note:</strong>{' '}
              {scheme.notes_and_limitations} ({scheme.scheme_validity_information})
            </div>

            {scheme.unverified_fields.length > 0 ? (
              <div className="flex items-start gap-2 p-3 bg-white border border-[#E7E2D8] rounded text-xs text-[#9A3412]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Unknown / Dynamically Changing Fields:</strong>{' '}
                  {scheme.unverified_fields.join('; ')}. Please confirm current
                  cycle dates directly on the official portal below.
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#14532D]">
                All core eligibility and benefit parameters verified against
                published guidelines.
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E7E2D8]">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={scheme.official_scheme_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172554] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Official Scheme Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={scheme.official_application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1C1917] bg-white border border-[#D6CEBE] rounded-lg hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Application Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={scheme.source_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#57534E] hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Inspect Source Guideline</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onAskAssistantAboutScheme(scheme)}
                className="px-4 py-2 text-xs font-semibold text-[#1E3A8A] bg-[#1E3A8A]/10 rounded-lg hover:bg-[#1E3A8A]/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ask AI Assistant About This Scheme
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#57534E] bg-[#F3EFE6] rounded-lg hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
