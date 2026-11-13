import React, { useEffect, useRef, useState } from 'react';
import { formatClockTime } from '../game/rules';
import { DayPhase, HudSnapshot, WeatherKind } from '../game/types';
import { GothicMinimap } from './GothicMinimap';

interface GameHudProps {
  hud: HudSnapshot;
  onJoystick: (x: number, y: number) => void;
  onSlash: () => void;
  onFlare: () => void;
  onDash: () => void;
  onInteract: () => void;
  onUsePotion: (kind: 'vitality' | 'sunoil') => void;
  onOpenCrafting: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenJournal: () => void;
  onDismissDialogue: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const PHASE_LABELS: Record<DayPhase, string> = {
  dawn: 'Dawn',
  day: 'Day',
  dusk: 'Dusk',
  night: 'Night',
};

const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: 'Clear',
  fog: 'Mist',
  rain: 'Rain',
  storm: 'Storm',
};

const WeatherIcon: React.FC<{ weather: WeatherKind; phase: DayPhase }> = ({ weather, phase }) => {
  if (weather === 'storm') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#ffd166]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (weather === 'rain') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#7cc6ff]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 13v4M12 15v4M8 13v4" strokeLinecap="round" />
        <path d="M6 11a4 4 0 01.7-7.9A5 5 0 0116.5 4a3.5 3.5 0 01.5 7H6z" />
      </svg>
    );
  }
  if (weather === 'fog') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#9eb9cc]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10h16M3 14h18M5 18h14" strokeLinecap="round" />
      </svg>
    );
  }
  if (phase === 'night') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#b4d7ff]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#ffcb6b]" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onJoystick,
  onSlash,
  onFlare,
  onDash,
  onInteract,
  onUsePotion,
  onOpenCrafting,
  onToggleMute,
  onTogglePause,
  onOpenJournal,
  onDismissDialogue,
}) => {
  const [ghostHp, setGhostHp] = useState(hud.hp);
  useEffect(() => {
    const id = window.setTimeout(() => setGhostHp(hud.hp), 240);
    return () => window.clearTimeout(id);
  }, [hud.hp]);

  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyPointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const updateJoystickFromEvent = (clientX: number, clientY: number) => {
    const el = joyBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.4;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    onJoystick(dx / maxR, dy / maxR);
  };

  const resetJoystick = () => {
    joyPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystick(0, 0);
  };

  let objDistance = 0;
  if (hud.objectivePos) {
    objDistance = Math.round(
      Math.hypot(hud.objectivePos.x - hud.playerPos.x, hud.objectivePos.z - hud.playerPos.z),
    );
  }

  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const ghostPct = Math.max(hpPct, Math.min(100, (ghostHp / hud.maxHp) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));
  const oilPct = Math.max(0, Math.min(100, (hud.oil / hud.maxOil) * 100));

  const flareReady = hud.oil >= 30;
  const dashReady = hud.stamina >= 25;
  const { crafting, environment } = hud;
  const clockStr = formatClockTime(environment.timeOfDay);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {hpPct <= 30 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 90px rgba(185, 28, 28, 0.55)' }}
        />
      )}

      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left Status Cluster */}
        <div
          className="rounded-md px-2.5 py-2 sm:px-3 sm:py-2.5 border border-[#3a5163]/65 min-w-[154px] sm:min-w-[238px]"
          style={{ backgroundColor: 'rgba(11, 18, 25, 0.84)' }}
        >
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#9ab1c2] font-semibold whitespace-nowrap">
              {hud.regionName}
            </span>
            <span className="font-gothic text-xs sm:text-base font-bold text-[#e5b963] tabular-nums whitespace-nowrap">
              {hud.honor} <span className="text-[9px] text-[#a5b7c4] font-sans">HONOR</span>
            </span>
          </div>

          {/* Environment Time & Weather Line */}
          <div
            className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-[#b4c8d8] mb-1.5 pb-1 border-b border-[#263847]/80 tabular-nums"
            aria-label={`Time ${clockStr}, ${PHASE_LABELS[environment.dayPhase]}, ${WEATHER_LABELS[environment.weather]}`}
          >
            <WeatherIcon weather={environment.weather} phase={environment.dayPhase} />
            <span className="font-semibold text-[#e6dfd3]">{clockStr}</span>
            <span>·</span>
            <span>{PHASE_LABELS[environment.dayPhase]}</span>
            <span>·</span>
            <span className="text-[#8ec9f0]">{WEATHER_LABELS[environment.weather]}</span>
            <span className="hidden sm:inline text-[#7d95a6] ml-auto">
              Vis {environment.visibilityRange}m
            </span>
          </div>

          {hud.sheltered && (
            <div
              data-testid="shelter-badge"
              className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-[#ffd996] bg-[#3d2514]/85 border border-[#b87a3d]/75 rounded px-1.5 py-0.5 mb-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#ffba5a] shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V10.5z" />
              </svg>
              <span className="truncate">Sheltered · {hud.shelterName ?? 'Hearth Rest'}</span>
            </div>
          )}

          {/* HP Bar */}
          <div className="mb-1.5">
            <div className="flex justify-between text-[10px] font-semibold tracking-wider text-[#d9d2c5] mb-0.5 tabular-nums">
              <span>VITALITY</span>
              <span>
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="relative h-2.5 w-full rounded-sm bg-[#1b242c] overflow-hidden border border-[#2f414f]">
              <div
                className="absolute inset-y-0 left-0 bg-[#e88d5d] transition-all duration-300"
                style={{ width: `${ghostPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-[#c93832]"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Stamina + Oil */}
          <div className="grid grid-cols-2 gap-2 mb-1.5">
            <div>
              <div className="flex justify-between text-[9px] tracking-wider text-[#9db1bf] mb-0.5 tabular-nums">
                <span>STAMINA</span>
                <span>{hud.stamina}</span>
              </div>
              <div className="h-1.5 rounded-sm bg-[#1a232b] overflow-hidden">
                <div className="h-full bg-[#69b578]" style={{ width: `${stamPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] tracking-wider text-[#9db1bf] mb-0.5 tabular-nums">
                <span>OIL</span>
                <span>{hud.oil}</span>
              </div>
              <div className="h-1.5 rounded-sm bg-[#1a232b] overflow-hidden">
                <div className="h-full bg-[#e69b35]" style={{ width: `${oilPct}%` }} />
              </div>
            </div>
          </div>

          {/* Compact Resource & Gear Tier Strip */}
          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#263847]/80 text-[9px] sm:text-[10px] tabular-nums">
            <div className="flex items-center gap-2 text-[#d9e2e8]">
              <span title="Moonpetal Herbs" className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4be3b0]" />
                {crafting.inventory.herb}
              </span>
              <span title="Bog Iron Ore" className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7dc5ff]" />
                {crafting.inventory.ore}
              </span>
              <span title="Ironwood Timber" className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d69f56]" />
                {crafting.inventory.wood}
              </span>
            </div>
            <span className="text-[#9cb1c2] font-semibold">
              B{crafting.weaponTier} · A{crafting.armorTier}
            </span>
          </div>
        </div>

        {/* Top-Center Boss HP Bar */}
        {hud.bossActive && (
          <div
            className="hidden md:block rounded-md px-4 py-2 border border-[#7c2d2d] min-w-[280px]"
            style={{ backgroundColor: 'rgba(16, 12, 16, 0.88)' }}
          >
            <div className="flex justify-between items-center text-xs font-gothic font-bold text-[#f2b880] mb-1">
              <span>{hud.bossName}</span>
              <span className="tabular-nums text-[11px]">
                {hud.bossHp}/{hud.bossMaxHp}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-sm bg-[#241618] overflow-hidden border border-[#5e2323]">
              <div
                className="h-full bg-[#d13b2e]"
                style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Top-Right Controls, Quest Card & Minimap */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Open Crafting Workbench"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenCrafting();
              }}
              className={`h-10 px-2.5 rounded border flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                hud.atCraftingStation
                  ? 'border-[#e3b764] text-[#fce8be]'
                  : 'border-[#3a5163]/70 text-[#e6dfd3] hover:border-[#d4a44a]'
              }`}
              style={{
                backgroundColor: hud.atCraftingStation
                  ? 'rgba(120, 74, 24, 0.9)'
                  : 'rgba(11, 18, 25, 0.84)',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#e3b764]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
              </svg>
              <span className="hidden sm:inline">Craft</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Open Quest Journal"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenJournal();
              }}
              className="h-10 px-2.5 rounded border border-[#3a5163]/70 flex items-center gap-1.5 text-xs font-semibold text-[#e6dfd3] hover:border-[#d4a44a] cursor-pointer"
              style={{ backgroundColor: 'rgba(11, 18, 25, 0.84)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#d4a44a]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
              <span className="hidden sm:inline">Quests</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-10 h-10 rounded border border-[#3a5163]/70 flex items-center justify-center text-[#dce4ea] hover:border-[#d4a44a] cursor-pointer"
              style={{ backgroundColor: 'rgba(11, 18, 25, 0.84)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" fillOpacity="0.2" />
                {hud.muted ? (
                  <path d="M22 9l-6 6M16 9l6 6" stroke="#ff6b6b" strokeLinecap="round" />
                ) : (
                  <path d="M15.5 8.5a5 5 0 010 7" strokeLinecap="round" />
                )}
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause game"
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              className="w-10 h-10 rounded border border-[#3a5163]/70 flex items-center justify-center text-[#dce4ea] hover:border-[#d4a44a] cursor-pointer"
              style={{ backgroundColor: 'rgba(11, 18, 25, 0.84)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            </button>
          </div>

          {/* Active Quest Card + Radar Minimap */}
          <div className="flex items-start gap-1.5 sm:gap-2">
            <div
              className="rounded-md px-2.5 py-1.5 sm:px-3 sm:py-2 border border-[#3a5163]/65 max-w-[144px] sm:max-w-[235px] text-right"
              style={{ backgroundColor: 'rgba(11, 18, 25, 0.84)' }}
            >
              <div className="flex items-center justify-end gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-wider text-[#d4a44a] font-semibold">
                <span className="tabular-nums">{formatTime(hud.elapsedSec)}</span>
                <span>·</span>
                <span>
                  {hud.activeQuest.current}/{hud.activeQuest.target}
                </span>
              </div>
              <div className="font-gothic text-[11px] sm:text-sm font-bold text-[#f0eae0] leading-tight mt-0.5">
                {hud.activeQuest.title}
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#9eb2c0] leading-snug mt-0.5">
                {hud.objectivePos
                  ? `${hud.objectivePos.label} · ${objDistance}m`
                  : hud.activeQuest.description}
              </div>
            </div>

            <GothicMinimap hud={hud} />
          </div>
        </div>
      </div>

      {/* Mobile Boss Bar */}
      {hud.bossActive && (
        <div
          className="md:hidden mx-auto rounded-md px-3 py-1.5 border border-[#7c2d2d] w-[85%] max-w-[320px]"
          style={{ backgroundColor: 'rgba(16, 12, 16, 0.88)' }}
        >
          <div className="flex justify-between text-[11px] font-gothic font-bold text-[#f2b880] mb-1">
            <span>{hud.bossName}</span>
            <span className="tabular-nums">
              {hud.bossHp}/{hud.bossMaxHp}
            </span>
          </div>
          <div className="h-2 w-full rounded-sm bg-[#241618] overflow-hidden">
            <div
              className="h-full bg-[#d13b2e]"
              style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* MIDDLE: Toast */}
      <div className="flex flex-col items-center gap-2 my-auto pointer-events-none">
        {hud.toast && (
          <div
            className="px-4 py-1.5 rounded border border-[#d4a44a]/70 text-xs sm:text-sm font-medium text-[#f5efe4] text-center max-w-[90vw]"
            style={{ backgroundColor: 'rgba(13, 21, 29, 0.9)' }}
          >
            {hud.toast}
          </div>
        )}
      </div>

      {/* LOWER-CENTER DIALOGUE & INTERACT PROMPT (above thumb controls on mobile, centered above bottom edge) */}
      {(hud.dialogue || hud.prompt) && (
        <div className="flex flex-col items-center gap-2 mb-2 sm:mb-3 px-2 pointer-events-none">
          {hud.dialogue && (
            <button
              type="button"
              onClick={onDismissDialogue}
              className="pointer-events-auto text-left rounded-md px-3.5 py-2 sm:px-4 sm:py-2.5 border border-[#c4923e]/80 cursor-pointer max-w-[340px] sm:max-w-md"
              style={{ backgroundColor: 'rgba(11, 18, 25, 0.92)' }}
            >
              <div className="font-gothic text-xs font-bold text-[#e6b85c] uppercase tracking-wider mb-0.5">
                {hud.dialogue.speaker}
              </div>
              <p className="text-xs sm:text-sm text-[#e6dfd3] leading-snug">{hud.dialogue.text}</p>
            </button>
          )}

          {hud.prompt && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onInteract();
              }}
              className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded border border-[#e3b764] bg-[#1a2834]/95 hover:bg-[#233645] text-[#faf4e8] cursor-pointer max-w-[340px] sm:max-w-md"
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.6)' }}
            >
              <span className="px-1.5 py-0.5 rounded bg-[#d4a44a] text-[#0c141c] font-bold text-xs shrink-0">
                E
              </span>
              <span className="text-left min-w-0">
                <span className="block text-xs sm:text-sm font-bold leading-tight truncate">
                  {hud.prompt.label}
                </span>
                {hud.prompt.sublabel && (
                  <span className="block text-[10px] text-[#b4c4d0] truncate">{hud.prompt.sublabel}</span>
                )}
              </span>
            </button>
          )}
        </div>
      )}

      {/* BOTTOM CLUSTER */}
      <div className="flex items-end justify-between gap-2 pb-1">
        {/* Left Virtual Joystick */}
        <div
          ref={joyBaseRef}
          className="pointer-events-auto relative w-[104px] h-[104px] sm:w-[118px] sm:h-[118px] rounded-full border-2 border-[#4e697d]/70 flex items-center justify-center touch-none shrink-0"
          style={{ backgroundColor: 'rgba(11, 18, 25, 0.55)' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            joyPointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateJoystickFromEvent(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (joyPointerId.current !== e.pointerId) return;
            e.stopPropagation();
            updateJoystickFromEvent(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (joyPointerId.current === e.pointerId) {
              e.stopPropagation();
              resetJoystick();
            }
          }}
          onPointerCancel={resetJoystick}
          aria-label="Movement joystick"
        >
          <div className="w-8 h-8 rounded-full border border-[#4f697d]/40 pointer-events-none" />
          <div
            className="absolute w-11 h-11 rounded-full border-2 border-[#d4a44a] bg-[#243442]/90 pointer-events-none"
            style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
          />
        </div>

        {/* Bottom-Right Quick Potions + Combat Pad */}
        <div className="pointer-events-auto flex items-end gap-2 shrink-0">
          {/* Quick-Use Potion Belt */}
          <div className="flex flex-col gap-1.5 mb-0.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Drink Vitality Tonic (${crafting.potions.vitality})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                onUsePotion('vitality');
              }}
              className={`w-11 h-11 rounded-lg border flex flex-col items-center justify-center text-[9px] font-bold tabular-nums cursor-pointer ${
                crafting.potions.vitality > 0
                  ? 'border-[#d64e47] text-[#ffd4d1]'
                  : 'border-[#3a4752] text-[#667682] opacity-60'
              }`}
              style={{ backgroundColor: 'rgba(20, 22, 28, 0.9)' }}
            >
              <span>[1] HP</span>
              <span className="text-[10px] text-[#f7b2ae]">x{crafting.potions.vitality}</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={`Use Sun-Oil Flask (${crafting.potions.sunoil})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                onUsePotion('sunoil');
              }}
              className={`w-11 h-11 rounded-lg border flex flex-col items-center justify-center text-[9px] font-bold tabular-nums cursor-pointer ${
                crafting.potions.sunoil > 0
                  ? 'border-[#e09f3e] text-[#ffe5ba]'
                  : 'border-[#3a4752] text-[#667682] opacity-60'
              }`}
              style={{ backgroundColor: 'rgba(20, 22, 28, 0.9)' }}
            >
              <span>[2] OIL</span>
              <span className="text-[10px] text-[#ffd48f]">x{crafting.potions.sunoil}</span>
            </button>
          </div>

          {/* Primary Action Pad */}
          <div className="relative w-[124px] h-[118px] sm:w-[144px] sm:h-[132px]">
            {/* Flare [K] */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Lantern Flare (K)"
              onPointerDown={(e) => {
                e.stopPropagation();
                onFlare();
              }}
              className={`absolute left-0 top-1 w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer ${
                flareReady
                  ? 'border-[#e8a33a] text-[#ffe1a6]'
                  : 'border-[#44525e] text-[#6d7c87] opacity-60'
              }`}
              style={{ backgroundColor: 'rgba(18, 25, 33, 0.88)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                <circle cx="12" cy="12" r="3.5" fill="currentColor" />
              </svg>
              <span className="text-[8px] leading-none mt-0.5">K</span>
            </button>

            {/* Dash [Space] */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Dodge Dash (Space)"
              onPointerDown={(e) => {
                e.stopPropagation();
                onDash();
              }}
              className={`absolute left-1 bottom-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer ${
                dashReady
                  ? 'border-[#5fb482] text-[#b9f0cf]'
                  : 'border-[#44525e] text-[#6d7c87] opacity-60'
              }`}
              style={{ backgroundColor: 'rgba(18, 25, 33, 0.88)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[8px] leading-none mt-0.5">SPC</span>
            </button>

            {/* Primary Silver Blade Slash [J] */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Silver Blade Slash (J)"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSlash();
              }}
              className="absolute right-0 bottom-2 w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-full border-2 border-[#a8d1ec] text-[#eef8ff] flex flex-col items-center justify-center font-bold cursor-pointer active:scale-95"
              style={{
                backgroundColor: 'rgba(26, 42, 56, 0.92)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.55)',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />
              </svg>
              <span className="text-[9px] tracking-wider uppercase leading-none mt-0.5">Slash</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

