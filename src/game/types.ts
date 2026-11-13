export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type QuestId = 'speak_elder' | 'light_braziers' | 'recover_shards' | 'toll_bell';

export interface QuestStep {
  id: QuestId;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
}

export type EnemyArchetype = 'crawler' | 'weaver' | 'brute';

export type ResourceKind = 'herb' | 'ore' | 'wood';

export interface ResourceInventory {
  herb: number;
  ore: number;
  wood: number;
}

export type CraftCategory = 'potion' | 'weapon' | 'armor';

export type CraftRecipeId =
  | 'vitality_tonic'
  | 'sunoil_flask'
  | 'silver_blade_t2'
  | 'sun_blade_t3'
  | 'hunter_coat_t2'
  | 'oath_plate_t3';

export interface CraftRecipe {
  id: CraftRecipeId;
  name: string;
  category: CraftCategory;
  description: string;
  cost: Partial<ResourceInventory>;
  tier?: number;
}

export interface CraftProgressState {
  inventory: ResourceInventory;
  potions: {
    vitality: number;
    sunoil: number;
  };
  weaponTier: 1 | 2 | 3;
  armorTier: 1 | 2 | 3;
}

export type WeatherKind = 'clear' | 'fog' | 'rain' | 'storm';
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface EnvironmentState {
  timeOfDay: number; // 0..24 hours
  dayPhase: DayPhase;
  weather: WeatherKind;
  visibilityRange: number;
  enemySpawnRateMultiplier: number;
  elderLocation: { x: number; z: number; label: string };
}

export type SpatialCueKind =
  | 'ruin_wind'
  | 'distant_bell'
  | 'creature_whisper'
  | 'rain_gust'
  | 'thunder_clap';

export interface SpatialCueAnchor {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  category: 'ruin' | 'bell' | 'hollow';
}

export interface SpatialCueSpec {
  kind: SpatialCueKind;
  label: string;
  x: number;
  y: number;
  z: number;
  gain: number;
  pitch: number;
}

export interface SpatialAudioProfile {
  windBedGain: number;
  rainBedGain: number;
  windFilterHz: number;
  ruinWindInterval: [number, number];
  bellInterval: [number, number];
  whisperInterval: [number, number];
  rainGustInterval: [number, number] | null;
}

export type CodexCategory = 'lore' | 'enemy' | 'npc';

export interface CodexEntry {
  id: string;
  category: CodexCategory;
  title: string;
  subtitle: string;
  summary: string;
  details: string;
  locationHint: string;
  tacticsOrRole?: string;
}

export interface CodexProgressEntry {
  id: string;
  discoveredAtSec: number;
  encounters: number;
}

export type InteractableKind =
  | 'elder'
  | 'brazier'
  | 'shard'
  | 'lore'
  | 'bell'
  | 'campfire'
  | 'resource'
  | 'station'
  | 'door';

export interface InteractablePrompt {
  id: string;
  kind: InteractableKind;
  label: string;
  sublabel?: string;
}

export interface MinimapMarker {
  id: string;
  x: number;
  z: number;
  kind:
    | 'player'
    | 'objective'
    | 'brazier'
    | 'shard'
    | 'lore'
    | 'elder'
    | 'enemy'
    | 'landmark'
    | 'resource'
    | 'station'
    | 'bell'
    | 'shelter';
  active: boolean;
  label?: string;
}

export interface HudSnapshot {
  screen: GameScreenState;
  outcome: 'none' | 'victory' | 'defeat';
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  oil: number;
  maxOil: number;
  honor: number;
  banished: number;
  loreFound: number;
  loreTotal: number;
  elapsedSec: number;
  regionName: string;
  quests: QuestStep[];
  activeQuest: QuestStep;
  objectivePos: { x: number; z: number; label: string } | null;
  playerPos: { x: number; z: number; yaw: number };
  prompt: InteractablePrompt | null;
  dialogue: { speaker: string; text: string } | null;
  toast: string | null;
  muted: boolean;
  markers: MinimapMarker[];
  exploredCells: number[];
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  crafting: CraftProgressState;
  craftingOpen: boolean;
  atCraftingStation: boolean;
  nearestStationName: string | null;
  nearestStationDist: number;
  environment: EnvironmentState;
  codex: Record<string, CodexProgressEntry>;
  sheltered: boolean;
  shelterName: string | null;
}

export interface RunStatsSnapshot {
  outcome: 'victory' | 'defeat';
  elapsedSec: number;
  honor: number;
  banished: number;
  questsCompleted: number;
  questsTotal: number;
  loreFound: number;
  loreTotal: number;
  damageTaken: number;
}
