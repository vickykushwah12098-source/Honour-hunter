import React, { useEffect, useMemo, useState } from 'react';
import { CODEX_CATALOG, filterCodexEntries } from '../game/rules';
import { CodexCategory, CodexProgressEntry } from '../game/types';

interface CodexModalProps {
  codex: Record<string, CodexProgressEntry>;
  onClose: () => void;
}

const CATEGORY_TABS: Array<{ id: 'all' | CodexCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'lore', label: 'Lore' },
  { id: 'enemy', label: 'Enemies' },
  { id: 'npc', label: 'NPCs' },
];

const CATEGORY_NAME: Record<CodexCategory, string> = {
  lore: 'Lore Scroll',
  enemy: 'Enemy Profile',
  npc: 'NPC Bio',
};

function formatRecordedTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const CodexModal: React.FC<CodexModalProps> = ({ codex, onClose }) => {
  const [category, setCategory] = useState<'all' | CodexCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('npc_oathbound');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const discoveredCount = useMemo(
    () => CODEX_CATALOG.filter((entry) => Boolean(codex[entry.id])).length,
    [codex],
  );

  const visibleEntries = useMemo(
    () => filterCodexEntries(CODEX_CATALOG, codex, category, searchQuery),
    [codex, category, searchQuery],
  );

  const activeEntry = useMemo(() => {
    const matched = visibleEntries.find((item) => item.id === selectedId);
    if (matched) return matched;
    return visibleEntries.find((item) => item.discovered) ?? visibleEntries[0] ?? null;
  }, [visibleEntries, selectedId]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5"
      style={{ backgroundColor: 'rgba(6, 11, 17, 0.84)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ashhollow Codex"
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg border border-[#4a6479] overflow-hidden"
        style={{
          backgroundColor: 'rgba(13, 21, 29, 0.98)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.88)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 border-b border-[#2b3c4a]">
          <div>
            <h2 className="font-gothic text-lg sm:text-xl font-bold text-[#ece5d7] tracking-wider">
              ASHHOLLOW CODEX
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#a8bac7] mt-0.5 tabular-nums">
              <span className="text-[#d4a44a] font-semibold">
                {discoveredCount}/{CODEX_CATALOG.length} Recorded
              </span>
              <span aria-hidden="true">·</span>
              <span>Lore, Creatures &amp; Figures</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to Pause Menu"
            className="min-h-[40px] px-4 py-2 rounded border border-[#455c6e] bg-[#172430] hover:bg-[#223444] text-xs sm:text-sm font-semibold text-[#e6dfd3] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e3b764]"
          >
            Back
          </button>
        </div>

        {/* Search & Category Controls */}
        <div className="px-4 py-3 sm:px-6 border-b border-[#243442] flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lore, enemies, or NPCs..."
              aria-label="Search codex entries"
              className="w-full min-h-[40px] rounded border border-[#364b5c] bg-[#0b131b] pl-3 pr-14 py-2 text-sm text-[#ece5d7] placeholder-[#6c8191] focus:outline-none focus:border-[#c4923e]"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-[#a8bac7] hover:text-[#ece5d7] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Codex categories"
            className="flex items-center gap-1 p-1 rounded border border-[#2c3f4f] bg-[#0b131b] shrink-0"
          >
            {CATEGORY_TABS.map((tab) => {
              const active = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(tab.id)}
                  className={`min-h-[34px] px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#a86a24] text-[#faf6ee]'
                      : 'text-[#9eb2c0] hover:text-[#ece5d7] hover:bg-[#15222e]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split-Pane Body: Entry Index + Detailed Entry Reader */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[260px_1fr] overflow-hidden">
          {/* Entry List */}
          <div className="border-b md:border-b-0 md:border-r border-[#243442] overflow-y-auto max-h-[192px] md:max-h-none divide-y divide-[#1d2b36]">
            {visibleEntries.length === 0 ? (
              <div className="p-4 text-xs text-[#8da2b2]">
                No recorded entries match “{searchQuery.trim()}”.
              </div>
            ) : (
              visibleEntries.map((item) => {
                const isSelected = activeEntry?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left px-4 py-2.5 md:py-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c2a36]'
                        : 'bg-transparent hover:bg-[#131e28]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-gothic text-sm font-bold truncate ${
                          item.discovered ? 'text-[#f2ece0]' : 'text-[#6c7f8f]'
                        }`}
                      >
                        {item.discovered ? item.title : 'Unrecorded Entry'}
                      </span>
                      {isSelected && (
                        <span className="text-[11px] font-semibold text-[#e3b764] shrink-0">
                          Open
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8da2b2] mt-0.5 truncate">
                      <span>{CATEGORY_NAME[item.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {item.discovered ? item.subtitle : item.locationHint}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail Reader */}
          <div className="p-5 sm:p-6 overflow-y-auto">
            {!activeEntry ? (
              <div className="text-sm text-[#8da2b2]">
                Explore Ashhollow to record lore scrolls, encounters, and village biographies.
              </div>
            ) : activeEntry.discovered ? (
              <article className="space-y-4">
                <div className="border-b border-[#243442] pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#d4a44a]">
                    <span className="font-semibold">{CATEGORY_NAME[activeEntry.category]}</span>
                    <span aria-hidden="true" className="text-[#566b7c]">
                      ·
                    </span>
                    <span className="text-[#9eb2c0]">{activeEntry.locationHint}</span>
                    {activeEntry.discoveredAtSec !== null && (
                      <>
                        <span aria-hidden="true" className="text-[#566b7c]">
                          ·
                        </span>
                        <span className="text-[#8da2b2] tabular-nums">
                          Logged {formatRecordedTime(activeEntry.discoveredAtSec)}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="font-gothic text-xl sm:text-2xl font-bold text-[#f2ece0] mt-1">
                    {activeEntry.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#a8bac7] mt-0.5">
                    {activeEntry.subtitle}
                  </p>
                </div>

                <p className="text-sm font-medium text-[#e4dccd] leading-relaxed">
                  {activeEntry.summary}
                </p>

                <p className="text-sm text-[#b7c6d1] leading-relaxed">
                  {activeEntry.details}
                </p>

                {(activeEntry.tacticsOrRole || activeEntry.category === 'enemy') && (
                  <div className="pt-3 border-t border-[#243442] flex flex-wrap items-center justify-between gap-2 text-xs text-[#9eb2c0]">
                    {activeEntry.tacticsOrRole && (
                      <span>{activeEntry.tacticsOrRole}</span>
                    )}
                    {activeEntry.category === 'enemy' && (
                      <span className="tabular-nums text-[#8fd4f5]">
                        Encounters &amp; Banishments: {activeEntry.encounters}
                      </span>
                    )}
                  </div>
                )}
              </article>
            ) : (
              <div className="py-6 space-y-2">
                <div className="text-xs text-[#7c90a1]">
                  {CATEGORY_NAME[activeEntry.category]} · Unrecorded
                </div>
                <h3 className="font-gothic text-lg font-bold text-[#95a7b5]">
                  Entry Not Yet Logged
                </h3>
                <p className="text-sm text-[#8297a8] leading-relaxed">
                  Explore <span className="text-[#cfd9e0]">{activeEntry.locationHint}</span> to
                  automatically record this entry in your Codex.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
