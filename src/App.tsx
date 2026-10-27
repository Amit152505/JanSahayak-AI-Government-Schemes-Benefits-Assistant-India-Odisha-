import React, { useState } from 'react';
import { TopBar, ActiveTab } from './components/TopBar';
import { SchemeCatalogueView } from './components/SchemeCatalogueView';
import { SchemeDetailModal } from './components/SchemeDetailModal';
import { RecommenderView } from './components/RecommenderView';
import { RagAssistantView } from './components/RagAssistantView';
import { SourcesAuditView } from './components/SourcesAuditView';
import {
  VERIFIED_SCHEMES,
  SOURCE_VERIFICATION_REGISTRY,
} from './domain/schemesData';
import { SchemeRecord } from './domain/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalogue');
  const [schemes, setSchemes] = useState<SchemeRecord[]>(VERIFIED_SCHEMES);
  const [inspectedScheme, setInspectedScheme] = useState<SchemeRecord | null>(
    null
  );
  const [showAddSchemeModal, setShowAddSchemeModal] = useState(false);
  const [pendingRagQuestion, setPendingRagQuestion] = useState<string | null>(
    null
  );

  const handleQuickAskRAG = (question: string) => {
    setPendingRagQuestion(question);
    setInspectedScheme(null);
    setActiveTab('assistant');
  };

  const handleAddValidatedScheme = async (newScheme: SchemeRecord) => {
    setSchemes((prev) => {
      const exists = prev.some((s) => s.scheme_id === newScheme.scheme_id);
      if (exists) {
        return prev.map((s) =>
          s.scheme_id === newScheme.scheme_id ? newScheme : s
        );
      }
      return [newScheme, ...prev];
    });

    try {
      await fetch('/api/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScheme),
      });
    } catch {
      // Local state already updated
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917]">
      {/* Strict 3-Zone Top Bar */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddSchemeModal={() => {
          setActiveTab('catalogue');
          setShowAddSchemeModal(true);
        }}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8">
        {activeTab === 'catalogue' && (
          <SchemeCatalogueView
            schemes={schemes}
            onInspectScheme={(scheme) => setInspectedScheme(scheme)}
            onQuickAskRAG={handleQuickAskRAG}
            onGoToRecommender={() => setActiveTab('recommender')}
            showAddModal={showAddSchemeModal}
            onCloseAddModal={() => setShowAddSchemeModal(false)}
            onAddValidatedScheme={handleAddValidatedScheme}
          />
        )}

        {activeTab === 'recommender' && (
          <RecommenderView
            schemes={schemes}
            onInspectScheme={(scheme) => setInspectedScheme(scheme)}
            onAskAssistantAboutScheme={(scheme) =>
              handleQuickAskRAG(
                `What are the eligibility requirements, exclusions, and documents needed for ${scheme.scheme_name}?`
              )
            }
          />
        )}

        {activeTab === 'assistant' && (
          <RagAssistantView
            schemes={schemes}
            initialQuestion={pendingRagQuestion}
            onClearInitialQuestion={() => setPendingRagQuestion(null)}
          />
        )}

        {activeTab === 'sources' && (
          <SourcesAuditView
            sources={SOURCE_VERIFICATION_REGISTRY}
            schemes={schemes}
          />
        )}
      </main>

      {/* Scheme Detail Modal */}
      <SchemeDetailModal
        scheme={inspectedScheme}
        onClose={() => setInspectedScheme(null)}
        onAskAssistantAboutScheme={(scheme) =>
          handleQuickAskRAG(
            `Explain the eligibility conditions, exclusions, and application steps for ${scheme.scheme_name}.`
          )
        }
      />

      {/* Quiet Institutional Footer */}
      <footer className="mt-16 border-t border-[#E7E2D8] bg-[#F3EFE6]/60 py-8 px-6 text-xs text-[#57534E]">
        <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="font-semibold text-[#1C1917]">
              JanSahayak — Independent Government Schemes & Benefits Assistant
              (India & Odisha)
            </div>
            <p className="leading-relaxed">
              This application is an independent educational discovery tool and
              is not affiliated with any Central or State Government ministry.
              All eligibility assessments are preliminary; verify current rules
              on the cited official government portals before applying.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className="hover:text-[#1C1917] underline cursor-pointer"
            >
              Source Verification Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
