import React from 'react';

export type ActiveTab =
  | 'catalogue'
  | 'recommender'
  | 'assistant'
  | 'sources';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAddSchemeModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddSchemeModal,
}) => {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'catalogue', label: 'Scheme Catalogue' },
    { id: 'recommender', label: 'Recommender' },
    { id: 'assistant', label: 'AI Assistant' },
    { id: 'sources', label: 'Sources & Audit' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur border-b border-[#E7E2D8]">
      <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#catalogue"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('catalogue');
          }}
          className="font-display text-xl font-bold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1E3A8A]"
        >
          JanSahayak
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectTab(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
                  isActive
                    ? 'border-[#1E3A8A] text-[#1C1917] font-semibold'
                    : 'border-transparent hover:text-[#1C1917] hover:border-[#D6CEBE]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenAddSchemeModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172554] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            Add Scheme Record
          </button>
        </div>
      </div>

      {/* Mobile accessible single-line scrollable nav bar */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden items-center gap-5 overflow-x-auto px-6 py-2.5 border-t border-[#E7E2D8] bg-[#F3EFE6]/60 text-xs font-medium text-[#57534E]"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors ${
                isActive
                  ? 'border-[#1E3A8A] text-[#1C1917] font-semibold'
                  : 'border-transparent text-[#57534E]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
