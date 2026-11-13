import React from 'react';
import { CODEX_CATALOG } from '../game/rules';
import { HudSnapshot, RunStatsSnapshot } from '../game/types';

interface PauseModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onOpenCodex: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  hud,
  onResume,
  onOpenCodex,
  onRestart,
  onTitle,
}) => {
  const codexCount = CODEX_CATALOG.filter((entry) => Boolean(hud.codex[entry.id])).length;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(7, 12, 18, 0.76)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Village Journal and Pause Menu"
        className="w-full max-w-md rounded-lg border border-[#4a6479] p-6"
        style={{
          backgroundColor: 'rgba(13, 21, 29, 0.97)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
        }}
      >
        <div className="flex items-center justify-between border-b border-[#2b3c4a] pb-3 mb-4">
          <h2 className="font-gothic text-xl font-bold text-[#ece5d7] tracking-wider">
            OATH JOURNAL
          </h2>
          <span className="text-xs text-[#d4a44a] font-semibold tabular-nums">
            {hud.loreFound}/{hud.loreTotal} Lore · {hud.honor} Honor
          </span>
        </div>

        {/* Quest checklist */}
        <div className="space-y-2.5 mb-5">
          {hud.quests.map((q) => (
            <div
              key={q.id}
              className={`rounded px-3 py-2 border ${
                q.completed
                  ? 'border-[#3d6b52] bg-[#13241d]'
                  : q.id === hud.activeQuest.id
                  ? 'border-[#c4923e] bg-[#1f2629]'
                  : 'border-[#253542] bg-[#101921] opacity-70'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={q.completed ? 'text-[#84d9a8] line-through' : 'text-[#f2ece0]'}>
                  {q.title}
                </span>
                <span className="tabular-nums text-[#d4a44a]">
                  {q.current}/{q.target}
                </span>
              </div>
              <p className="text-[11px] text-[#9eb2c0] mt-0.5">{q.description}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenCodex}
          aria-label="Open Ashhollow Codex"
          className="w-full mb-2.5 py-2.5 px-4 rounded border border-[#5f7d94] bg-[#15232f] hover:bg-[#1d3141] flex items-center justify-between text-sm font-semibold text-[#ece5d7] cursor-pointer"
        >
          <span className="font-gothic tracking-wide">Codex</span>
          <span className="text-xs text-[#d4a44a] tabular-nums">
            {codexCount}/{CODEX_CATALOG.length} Recorded
          </span>
        </button>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex-1 py-2.5 px-4 rounded border border-[#e3b764] bg-[#a86a24] hover:bg-[#bf7b2c] text-[#faf6ee] font-gothic font-bold text-sm uppercase tracking-wider cursor-pointer"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="py-2.5 px-4 rounded border border-[#455c6e] bg-[#172430] hover:bg-[#1f3140] text-[#dce4ea] font-semibold text-sm cursor-pointer"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="py-2.5 px-4 rounded border border-[#3a4d5c] bg-[#111b24] hover:bg-[#182633] text-[#a7b9c7] font-semibold text-sm cursor-pointer"
          >
            Title
          </button>
        </div>
      </div>
    </div>
  );
};

interface EndModalProps {
  stats: RunStatsSnapshot;
  onPlayAgain: () => void;
  onTitle: () => void;
}

export const EndModal: React.FC<EndModalProps> = ({ stats, onPlayAgain, onTitle }) => {
  const isVictory = stats.outcome === 'victory';
  const m = Math.floor(stats.elapsedSec / 60);
  const s = stats.elapsedSec % 60;
  const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(7, 12, 18, 0.8)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isVictory ? 'Victory Summary' : 'Defeat Summary'}
        className="w-full max-w-md rounded-lg border border-[#566e80] p-6 text-center"
        style={{
          backgroundColor: 'rgba(13, 21, 29, 0.97)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)',
        }}
      >
        <div
          className={`font-gothic text-2xl sm:text-3xl font-extrabold tracking-wider mb-1 ${
            isVictory ? 'text-[#f0c56e]' : 'text-[#e36259]'
          }`}
        >
          {isVictory ? 'CURSE SHATTERED' : 'SWALLOWED BY MIST'}
        </div>
        <p className="text-xs sm:text-sm text-[#a8bac7] mb-5">
          {isVictory
            ? 'The Chapel Great Bell tolls across Ashhollow. Honor is restored to the valley.'
            : 'The shadows claimed your lantern before the Great Bell could ring.'}
        </p>

        <div className="grid grid-cols-2 gap-2.5 mb-5 text-left">
          <div className="rounded border border-[#2d404f] bg-[#101a22] p-3">
            <div className="text-[10px] uppercase tracking-widest text-[#8ca2b2]">Honor Earned</div>
            <div className="font-gothic text-xl font-bold text-[#f0c56e] tabular-nums">
              {stats.honor}
            </div>
          </div>
          <div className="rounded border border-[#2d404f] bg-[#101a22] p-3">
            <div className="text-[10px] uppercase tracking-widest text-[#8ca2b2]">
              {isVictory ? 'Clear Time' : 'Quests Cleared'}
            </div>
            <div className="font-gothic text-xl font-bold text-[#ece6da] tabular-nums">
              {isVictory ? timeStr : `${stats.questsCompleted}/${stats.questsTotal}`}
            </div>
          </div>
          <div className="rounded border border-[#2d404f] bg-[#101a22] p-3">
            <div className="text-[10px] uppercase tracking-widest text-[#8ca2b2]">
              Creatures Banished
            </div>
            <div className="font-gothic text-lg font-bold text-[#8fd4f5] tabular-nums">
              {stats.banished}
            </div>
          </div>
          <div className="rounded border border-[#2d404f] bg-[#101a22] p-3">
            <div className="text-[10px] uppercase tracking-widest text-[#8ca2b2]">
              {isVictory ? 'Damage Taken' : 'Lore Found'}
            </div>
            <div className="font-gothic text-lg font-bold text-[#d5dde3] tabular-nums">
              {isVictory ? stats.damageTaken : `${stats.loreFound}/${stats.loreTotal}`}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-5 rounded border border-[#e3b764] bg-[#a86a24] hover:bg-[#bf7b2c] text-[#faf6ee] font-gothic font-bold text-sm uppercase tracking-wider cursor-pointer"
          >
            {isVictory ? 'Play Again' : 'Try Again'}
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="py-3 px-4 rounded border border-[#3a4d5c] bg-[#111b24] hover:bg-[#182633] text-[#a7b9c7] font-semibold text-sm cursor-pointer"
          >
            Title
          </button>
        </div>
      </div>
    </div>
  );
};
