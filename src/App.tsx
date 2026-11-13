import { useEffect, useRef, useState } from 'react';
import { CodexModal } from './components/CodexModal';
import { CraftingModal } from './components/CraftingModal';
import { GameHud } from './components/GameHud';
import { EndModal, PauseModal } from './components/Modals';
import { TitleOverlay } from './components/TitleOverlay';
import { AshhollowEngine } from './game/engine';
import {
  computeEnvironmentEffects,
  createInitialCodexState,
  createInitialCraftState,
  createInitialQuests,
} from './game/rules';
import { HudSnapshot, RunStatsSnapshot } from './game/types';

const INITIAL_QUESTS = createInitialQuests();

const INITIAL_HUD: HudSnapshot = {
  screen: 'title',
  outcome: 'none',
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  oil: 100,
  maxOil: 100,
  honor: 0,
  banished: 0,
  loreFound: 0,
  loreTotal: 5,
  elapsedSec: 0,
  regionName: 'Chapel Square',
  quests: INITIAL_QUESTS,
  activeQuest: INITIAL_QUESTS[0],
  objectivePos: { x: 5.3, z: 4.7, label: 'Elder Mirek' },
  playerPos: { x: 0, z: 16, yaw: Math.PI },
  prompt: null,
  dialogue: null,
  toast: null,
  muted: false,
  markers: [],
  exploredCells: [],
  bossActive: false,
  bossHp: 0,
  bossMaxHp: 220,
  bossName: 'The Hollow Warden',
  crafting: createInitialCraftState(),
  craftingOpen: false,
  atCraftingStation: false,
  nearestStationName: 'Sanctuary Alchemist Table',
  nearestStationDist: 9,
  environment: computeEnvironmentEffects(20.5, 'fog'),
  codex: createInitialCodexState(),
  sheltered: false,
  shelterName: null,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AshhollowEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [runStats, setRunStats] = useState<RunStatsSnapshot | null>(null);
  const [codexOpen, setCodexOpen] = useState(false);

  useEffect(() => {
    if (hud.screen !== 'paused' && codexOpen) {
      setCodexOpen(false);
    }
  }, [hud.screen, codexOpen]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    const engine = new AshhollowEngine(
      mount,
      (snapshot) => {
        setHud(snapshot);
      },
      (stats) => {
        setRunStats(stats);
      },
      autostart,
    );
    engineRef.current = engine;

    const onTab = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        engine.togglePause();
      }
    };
    window.addEventListener('keydown', onTab);

    return () => {
      window.removeEventListener('keydown', onTab);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setRunStats(null);
    engineRef.current?.startGame();
  };

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#0c161e]">
      {/* Isolated WebGL canvas mount */}
      <div
        ref={mountRef}
        data-testid="game-canvas-mount"
        className="absolute inset-0 w-full h-full"
      />

      {hud.screen === 'title' && (
        <TitleOverlay
          onStart={handleStart}
          muted={hud.muted}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      )}

      {hud.screen === 'playing' && (
        <GameHud
          hud={hud}
          onJoystick={(x, y) => engineRef.current?.setJoystick(x, y)}
          onSlash={() => engineRef.current?.triggerSlash()}
          onFlare={() => engineRef.current?.triggerFlare()}
          onDash={() => engineRef.current?.triggerDash()}
          onInteract={() => engineRef.current?.triggerInteract()}
          onUsePotion={(kind) => engineRef.current?.usePotion(kind)}
          onOpenCrafting={() => engineRef.current?.openCrafting()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onTogglePause={() => engineRef.current?.togglePause()}
          onOpenJournal={() => engineRef.current?.togglePause()}
          onDismissDialogue={() => engineRef.current?.dismissDialogue()}
        />
      )}

      {hud.screen === 'playing' && hud.craftingOpen && (
        <CraftingModal
          hud={hud}
          onCraft={(recipeId) => engineRef.current?.craftItem(recipeId)}
          onClose={() => engineRef.current?.closeCrafting()}
        />
      )}

      {hud.screen === 'paused' && !codexOpen && (
        <PauseModal
          hud={hud}
          onResume={() => engineRef.current?.togglePause()}
          onOpenCodex={() => setCodexOpen(true)}
          onRestart={() => {
            setCodexOpen(false);
            setRunStats(null);
            engineRef.current?.resetWorldState('playing');
          }}
          onTitle={() => {
            setCodexOpen(false);
            setRunStats(null);
            engineRef.current?.returnToTitle();
          }}
        />
      )}

      {hud.screen === 'paused' && codexOpen && (
        <CodexModal codex={hud.codex} onClose={() => setCodexOpen(false)} />
      )}

      {hud.screen === 'gameover' && runStats && (
        <EndModal
          stats={runStats}
          onPlayAgain={handleStart}
          onTitle={() => {
            setRunStats(null);
            engineRef.current?.returnToTitle();
          }}
        />
      )}
    </main>
  );
}
