import {
  CodexCategory,
  CodexEntry,
  CodexProgressEntry,
  CraftProgressState,
  CraftRecipe,
  CraftRecipeId,
  DayPhase,
  EnemyArchetype,
  EnvironmentState,
  MinimapMarker,
  QuestId,
  QuestStep,
  ResourceInventory,
  ResourceKind,
  SpatialAudioProfile,
  SpatialCueAnchor,
  SpatialCueKind,
  SpatialCueSpec,
  WeatherKind,
} from './types';

export const WORLD_PLAYABLE_RADIUS = 72;
export const WORLD_TERRAIN_SIZE = 210;

export interface CircleCollider {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface BoxCollider {
  id: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  rotationY?: number;
  disabled?: boolean;
}

/**
 * Deterministic rolling gothic valley terrain height at (x, z).
 */
export function groundHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const villageBlend = Math.min(1, Math.max(0, (r - 12) / 28));
  const gentleRoll =
    Math.sin(x * 0.055) * Math.cos(z * 0.05) * 1.45 +
    Math.sin((x + z) * 0.032) * 0.95;

  const dWest = Math.hypot(x + 36, z - 10);
  const westHill = Math.max(0, 1 - dWest / 20);
  const westBump = westHill * westHill * 3.2;

  const dMill = Math.hypot(x + 26, z + 34);
  const millHill = Math.max(0, 1 - dMill / 22);
  const millBump = millHill * millHill * 2.4;

  const rimT = Math.max(0, (r - 60) / 36);
  const rimWall = rimT * rimT * 14.5;

  return gentleRoll * villageBlend + westBump + millBump + rimWall;
}

export const VILLAGE_ROAD_SEGMENTS: Array<[number, number, number, number]> = [
  [0, 18, 0, -2],
  [0, 6, -26, -28],
  [0, 6, 30, 14],
  [0, -2, 34, -26],
  [-8, 6, -34, 10],
];

/**
 * Returns 0..1 indicating how close (x, z) lies to the main village cobblestone trails.
 */
export function roadMaskAt(x: number, z: number): number {
  let bestDist = 999;
  for (const [ax, az, bx, bz] of VILLAGE_ROAD_SEGMENTS) {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq)) : 0;
    const px = ax + dx * t;
    const pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < bestDist) bestDist = d;
  }
  const width = 3.6;
  if (bestDist >= width) return 0;
  return 1 - bestDist / width;
}

export function getRegionNameAt(x: number, z: number): string {
  if (Math.hypot(x, z + 4) < 16) return 'Chapel Square';
  if (Math.hypot(x + 26, z + 34) < 20) return 'Windmill Ridge';
  if (Math.hypot(x - 30, z - 14) < 20) return 'Pumpkin Hollow';
  if (Math.hypot(x - 34, z + 26) < 20) return 'Sunken Graveyard';
  if (Math.hypot(x + 36, z - 10) < 18) return 'Watchtower Overlook';
  return 'Misty Outskirts';
}

export function createInitialQuests(): QuestStep[] {
  return [
    {
      id: 'speak_elder',
      title: "The Elder's Plea",
      description: 'Speak with Elder Mirek in Chapel Square.',
      current: 0,
      target: 1,
      completed: false,
    },
    {
      id: 'light_braziers',
      title: 'Push Back the Mist',
      description: 'Ignite the 3 Sanctuary Braziers around Ashhollow.',
      current: 0,
      target: 3,
      completed: false,
    },
    {
      id: 'recover_shards',
      title: 'Shards of Honor',
      description: 'Recover 3 Sacred Bell Shards from the cursed districts.',
      current: 0,
      target: 3,
      completed: false,
    },
    {
      id: 'toll_bell',
      title: 'Toll the Great Bell',
      description: 'Banish the Hollow Warden and ring the Chapel Bell.',
      current: 0,
      target: 1,
      completed: false,
    },
  ];
}

export function getActiveQuest(quests: QuestStep[]): QuestStep {
  return quests.find((q) => !q.completed) ?? quests[quests.length - 1];
}

export function advanceQuestProgress(
  quests: QuestStep[],
  questId: QuestId,
  amount = 1,
): { quests: QuestStep[]; justCompleted: boolean } {
  let justCompleted = false;
  const next = quests.map((q) => {
    if (q.id !== questId || q.completed) return q;
    const nextCurrent = Math.min(q.target, q.current + amount);
    const completed = nextCurrent >= q.target;
    if (completed && !q.completed) justCompleted = true;
    return { ...q, current: nextCurrent, completed };
  });
  return { quests: next, justCompleted };
}

export function areAllQuestsCompleted(quests: QuestStep[]): boolean {
  return quests.every((q) => q.completed);
}

export function calculateHonorScore(params: {
  banished: number;
  braziersLit: number;
  shardsFound: number;
  loreFound: number;
  bellTolled: boolean;
  craftedCount?: number;
}): number {
  return (
    params.banished * 40 +
    params.braziersLit * 120 +
    params.shardsFound * 200 +
    params.loreFound * 85 +
    (params.craftedCount ?? 0) * 35 +
    (params.bellTolled ? 500 : 0)
  );
}

// ---------------- DAY/NIGHT CYCLE & DYNAMIC WEATHER RULES ----------------

export const WEATHER_SEQUENCE: WeatherKind[] = ['clear', 'fog', 'rain', 'storm'];

export function getDayPhase(timeOfDay: number): DayPhase {
  const h = ((timeOfDay % 24) + 24) % 24;
  if (h >= 5.5 && h < 8.5) return 'dawn';
  if (h >= 8.5 && h < 17.5) return 'day';
  if (h >= 17.5 && h < 20.0) return 'dusk';
  return 'night';
}

export function formatClockTime(timeOfDay: number): string {
  const hNorm = ((timeOfDay % 24) + 24) % 24;
  const hours = Math.floor(hNorm);
  const mins = Math.floor((hNorm - hours) * 60);
  return `${hours < 10 ? '0' : ''}${hours}:${mins < 10 ? '0' : ''}${mins}`;
}

export function getElderScheduleWaypoint(timeOfDay: number): {
  x: number;
  z: number;
  label: string;
} {
  const phase = getDayPhase(timeOfDay);
  if (phase === 'day' || phase === 'dawn') {
    // Daytime: Elder Mirek tends the Chapel Steps / Village Square overlook
    return { x: 1.8, z: 3.4, label: 'Chapel Steps' };
  }
  // Dusk & Night: Elder Mirek warms by the Sanctuary Campfire
  return { x: 5.3, z: 4.7, label: 'Sanctuary Campfire' };
}

export function computeEnvironmentEffects(
  timeOfDay: number,
  weather: WeatherKind,
): EnvironmentState {
  const dayPhase = getDayPhase(timeOfDay);
  const elderLocation = getElderScheduleWaypoint(timeOfDay);

  // Base fog density & visibility range
  let fogDensity = dayPhase === 'day' ? 0.012 : dayPhase === 'night' ? 0.021 : 0.017;
  if (weather === 'fog') fogDensity += 0.017;
  if (weather === 'rain') fogDensity += 0.008;
  if (weather === 'storm') fogDensity += 0.015;

  const visibilityRange = Math.round(Math.max(18, Math.min(85, 1.15 / fogDensity)));

  // Enemy spawn rate multiplier (slower by day, intense at night & storms)
  let spawnMult = dayPhase === 'day' ? 0.6 : dayPhase === 'night' ? 1.65 : 1.05;
  if (weather === 'fog') spawnMult += 0.2;
  if (weather === 'storm') spawnMult += 0.35;

  return {
    timeOfDay: ((timeOfDay % 24) + 24) % 24,
    dayPhase,
    weather,
    visibilityRange,
    enemySpawnRateMultiplier: Number(spawnMult.toFixed(2)),
    elderLocation,
  };
}

export function getFogDensityFor(timeOfDay: number, weather: WeatherKind): number {
  const dayPhase = getDayPhase(timeOfDay);
  let density = dayPhase === 'day' ? 0.012 : dayPhase === 'night' ? 0.021 : 0.017;
  if (weather === 'fog') density += 0.017;
  if (weather === 'rain') density += 0.008;
  if (weather === 'storm') density += 0.015;
  return density;
}

// ---------------- CRAFTING & RESOURCE RULES ----------------

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'vitality_tonic',
    name: 'Crimson Vitality Tonic',
    category: 'potion',
    description: 'Restores +45 Vitality on use. Carry up to 5.',
    cost: { herb: 2, wood: 1 },
  },
  {
    id: 'sunoil_flask',
    name: 'Sun-Oil Flask',
    category: 'potion',
    description: 'Restores +60 Lantern Oil & +40 Stamina on use.',
    cost: { herb: 2, ore: 1 },
  },
  {
    id: 'silver_blade_t2',
    name: 'Tempered Silver Blade',
    category: 'weapon',
    description: 'Weapon Tier II · +45% Slash damage (35 / 46 finisher).',
    cost: { ore: 3, wood: 2 },
    tier: 2,
  },
  {
    id: 'sun_blade_t3',
    name: 'Sanctified Sun-Blade',
    category: 'weapon',
    description: 'Weapon Tier III · +90% Slash damage (46 / 60 finisher).',
    cost: { ore: 5, wood: 3, herb: 2 },
    tier: 3,
  },
  {
    id: 'hunter_coat_t2',
    name: 'Reinforced Hunter Coat',
    category: 'armor',
    description: 'Armor Tier II · 135 Max HP & 20% damage reduction.',
    cost: { wood: 3, ore: 2 },
    tier: 2,
  },
  {
    id: 'oath_plate_t3',
    name: 'Oathbound Plate Mantle',
    category: 'armor',
    description: 'Armor Tier III · 175 Max HP & 35% damage reduction.',
    cost: { ore: 4, wood: 3, herb: 2 },
    tier: 3,
  },
];

export function createInitialCraftState(): CraftProgressState {
  return {
    inventory: { herb: 1, ore: 0, wood: 1 },
    potions: { vitality: 1, sunoil: 1 },
    weaponTier: 1,
    armorTier: 1,
  };
}

export function addResource(
  inv: ResourceInventory,
  kind: ResourceKind,
  amount: number,
): ResourceInventory {
  return {
    ...inv,
    [kind]: Math.max(0, inv[kind] + amount),
  };
}

export function canCraftRecipe(
  state: CraftProgressState,
  recipeId: CraftRecipeId,
): { allowed: boolean; reason?: string } {
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return { allowed: false, reason: 'Unknown recipe' };

  if (recipe.id === 'vitality_tonic' && state.potions.vitality >= 5) {
    return { allowed: false, reason: 'Belt full (5/5)' };
  }
  if (recipe.id === 'sunoil_flask' && state.potions.sunoil >= 5) {
    return { allowed: false, reason: 'Belt full (5/5)' };
  }
  if (recipe.category === 'weapon' && recipe.tier && state.weaponTier >= recipe.tier) {
    return { allowed: false, reason: 'Already forged' };
  }
  if (recipe.id === 'sun_blade_t3' && state.weaponTier < 2) {
    return { allowed: false, reason: 'Requires Tier II Blade' };
  }
  if (recipe.category === 'armor' && recipe.tier && state.armorTier >= recipe.tier) {
    return { allowed: false, reason: 'Already forged' };
  }
  if (recipe.id === 'oath_plate_t3' && state.armorTier < 2) {
    return { allowed: false, reason: 'Requires Tier II Coat' };
  }

  for (const key of ['herb', 'ore', 'wood'] as const) {
    const req = recipe.cost[key] ?? 0;
    if (state.inventory[key] < req) {
      return { allowed: false, reason: `Needs ${req} ${key}` };
    }
  }
  return { allowed: true };
}

export function executeCraftRecipe(
  state: CraftProgressState,
  recipeId: CraftRecipeId,
): { nextState: CraftProgressState; crafted: boolean; message: string } {
  const check = canCraftRecipe(state, recipeId);
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
  if (!check.allowed || !recipe) {
    return { nextState: state, crafted: false, message: check.reason ?? 'Cannot craft' };
  }

  const nextInv: ResourceInventory = {
    herb: state.inventory.herb - (recipe.cost.herb ?? 0),
    ore: state.inventory.ore - (recipe.cost.ore ?? 0),
    wood: state.inventory.wood - (recipe.cost.wood ?? 0),
  };

  const nextPotions = { ...state.potions };
  let weaponTier = state.weaponTier;
  let armorTier = state.armorTier;

  if (recipe.id === 'vitality_tonic') nextPotions.vitality += 1;
  if (recipe.id === 'sunoil_flask') nextPotions.sunoil += 1;
  if (recipe.id === 'silver_blade_t2') weaponTier = 2;
  if (recipe.id === 'sun_blade_t3') weaponTier = 3;
  if (recipe.id === 'hunter_coat_t2') armorTier = 2;
  if (recipe.id === 'oath_plate_t3') armorTier = 3;

  return {
    nextState: {
      inventory: nextInv,
      potions: nextPotions,
      weaponTier,
      armorTier,
    },
    crafted: true,
    message: `Crafted ${recipe.name}!`,
  };
}

export function getCombatModifiers(weaponTier: 1 | 2 | 3, armorTier: 1 | 2 | 3): {
  baseDamage: number;
  finisherDamage: number;
  maxHp: number;
  damageMultiplier: number;
} {
  const baseDamage = weaponTier === 3 ? 46 : weaponTier === 2 ? 35 : 24;
  const finisherDamage = weaponTier === 3 ? 60 : weaponTier === 2 ? 46 : 32;
  const maxHp = armorTier === 3 ? 175 : armorTier === 2 ? 135 : 100;
  const damageMultiplier = armorTier === 3 ? 0.65 : armorTier === 2 ? 0.8 : 1.0;
  return { baseDamage, finisherDamage, maxHp, damageMultiplier };
}

/**
 * Resolves player circle collision against static circular and oriented-box obstacles,
 * plus keeps the player inside the natural valley perimeter.
 */
export function resolveWorldCollisions(
  x: number,
  z: number,
  playerRadius: number,
  circles: CircleCollider[],
  boxes: BoxCollider[],
  maxRadius = WORLD_PLAYABLE_RADIUS,
): { x: number; z: number } {
  let px = x;
  let pz = z;

  for (const c of circles) {
    const dx = px - c.x;
    const dz = pz - c.z;
    const dist = Math.hypot(dx, dz);
    const minDist = playerRadius + c.radius;
    if (dist < minDist) {
      if (dist > 0.0001) {
        const push = minDist - dist;
        px += (dx / dist) * push;
        pz += (dz / dist) * push;
      } else {
        px += minDist;
      }
    }
  }

  for (const b of boxes) {
    if (b.disabled) continue;
    const angle = -(b.rotationY ?? 0);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const relX = px - b.x;
    const relZ = pz - b.z;
    const localX = relX * cos - relZ * sin;
    const localZ = relX * sin + relZ * cos;

    const clampedX = Math.max(-b.halfW, Math.min(b.halfW, localX));
    const clampedZ = Math.max(-b.halfD, Math.min(b.halfD, localZ));
    const dx = localX - clampedX;
    const dz = localZ - clampedZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < playerRadius * playerRadius) {
      let pushLocalX = 0;
      let pushLocalZ = 0;
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const overlap = playerRadius - dist;
        pushLocalX = (dx / dist) * overlap;
        pushLocalZ = (dz / dist) * overlap;
      } else {
        const penX = b.halfW - Math.abs(localX);
        const penZ = b.halfD - Math.abs(localZ);
        if (penX < penZ) {
          pushLocalX = (localX >= 0 ? 1 : -1) * (penX + playerRadius);
        } else {
          pushLocalZ = (localZ >= 0 ? 1 : -1) * (penZ + playerRadius);
        }
      }
      const invCos = Math.cos(-angle);
      const invSin = Math.sin(-angle);
      px += pushLocalX * invCos - pushLocalZ * invSin;
      pz += pushLocalX * invSin + pushLocalZ * invCos;
    }
  }

  const r = Math.hypot(px, pz);
  if (r > maxRadius) {
    const scale = maxRadius / r;
    px *= scale;
    pz *= scale;
  }

  return { x: px, z: pz };
}

// ---------------- ENTERABLE SHELTER HOUSES & OPEN/CLOSE DOORS ----------------

export interface ShelterHouseSpec {
  id: string;
  name: string;
  x: number;
  z: number;
  rotationY: number;
  scale: number;
}

export function shelterLocalToWorld(
  spec: Pick<ShelterHouseSpec, 'x' | 'z' | 'rotationY'>,
  lx: number,
  lz: number,
): { x: number; z: number } {
  const cos = Math.cos(spec.rotationY);
  const sin = Math.sin(spec.rotationY);
  return {
    x: spec.x + lx * cos + lz * sin,
    z: spec.z - lx * sin + lz * cos,
  };
}

export function shelterWorldToLocal(
  spec: Pick<ShelterHouseSpec, 'x' | 'z' | 'rotationY'>,
  wx: number,
  wz: number,
): { lx: number; lz: number } {
  const relX = wx - spec.x;
  const relZ = wz - spec.z;
  const cos = Math.cos(spec.rotationY);
  const sin = Math.sin(spec.rotationY);
  return {
    lx: relX * cos - relZ * sin,
    lz: relX * sin + relZ * cos,
  };
}

export function getShelterDoorWorldPos(spec: ShelterHouseSpec): { x: number; z: number } {
  return shelterLocalToWorld(spec, 0, 3.3 * spec.scale);
}

export function isPointInsideShelter(x: number, z: number, spec: ShelterHouseSpec): boolean {
  const { lx, lz } = shelterWorldToLocal(spec, x, z);
  const sc = spec.scale;
  return Math.abs(lx) < 2.25 * sc && lz > -3.05 * sc && lz < 3.12 * sc;
}

export function getShelterFloorOffset(x: number, z: number, spec: ShelterHouseSpec): number {
  const { lx, lz } = shelterWorldToLocal(spec, x, z);
  const sc = spec.scale;
  if (Math.abs(lx) < 2.35 * sc && lz > -3.15 * sc && lz <= 3.18 * sc) {
    return 0.34 * sc;
  }
  if (Math.abs(lx) < 1.15 * sc && lz > 3.18 * sc && lz < 3.85 * sc) {
    const t = Math.max(0, Math.min(1, (3.85 * sc - lz) / (0.67 * sc)));
    return 0.34 * sc * t;
  }
  return 0;
}

export function buildShelterColliders(spec: ShelterHouseSpec): {
  wallColliders: BoxCollider[];
  doorCollider: BoxCollider;
} {
  const sc = spec.scale;
  const makeBox = (
    suffix: string,
    lx: number,
    lz: number,
    halfW: number,
    halfD: number,
    disabled = false,
  ): BoxCollider => {
    const w = shelterLocalToWorld(spec, lx, lz);
    return {
      id: `${spec.id}_${suffix}`,
      x: w.x,
      z: w.z,
      halfW,
      halfD,
      rotationY: spec.rotationY,
      disabled,
    };
  };

  const wallColliders: BoxCollider[] = [
    makeBox('back', 0, -3.25 * sc, 2.7 * sc, 0.25 * sc),
    makeBox('left', -2.45 * sc, 0, 0.25 * sc, 3.45 * sc),
    makeBox('right', 2.45 * sc, 0, 0.25 * sc, 3.45 * sc),
    makeBox('front_left', -1.8 * sc, 3.25 * sc, 0.85 * sc, 0.25 * sc),
    makeBox('front_right', 1.8 * sc, 3.25 * sc, 0.85 * sc, 0.25 * sc),
  ];

  const doorCollider = makeBox('door', 0, 3.25 * sc, 0.96 * sc, 0.22 * sc, false);
  return { wallColliders, doorCollider };
}

// ---------------- FOG OF WAR & MINIMAP VISIBILITY ----------------

export const FOG_GRID_CELL_SIZE = 8;
export const FOG_GRID_HALF_EXTENT = 76;
export const FOG_GRID_COLS = Math.ceil((FOG_GRID_HALF_EXTENT * 2) / FOG_GRID_CELL_SIZE); // 19
export const MINIMAP_VIEW_RADIUS = 44;

export function getFogCellIndex(x: number, z: number): number {
  const cx = Math.max(
    0,
    Math.min(FOG_GRID_COLS - 1, Math.floor((x + FOG_GRID_HALF_EXTENT) / FOG_GRID_CELL_SIZE)),
  );
  const cz = Math.max(
    0,
    Math.min(FOG_GRID_COLS - 1, Math.floor((z + FOG_GRID_HALF_EXTENT) / FOG_GRID_CELL_SIZE)),
  );
  return cz * FOG_GRID_COLS + cx;
}

export function getFogCellCenter(index: number): { x: number; z: number } {
  const cx = index % FOG_GRID_COLS;
  const cz = Math.floor(index / FOG_GRID_COLS);
  return {
    x: -FOG_GRID_HALF_EXTENT + (cx + 0.5) * FOG_GRID_CELL_SIZE,
    z: -FOG_GRID_HALF_EXTENT + (cz + 0.5) * FOG_GRID_CELL_SIZE,
  };
}

export function getMinimapSightRadius(visibilityRange: number): number {
  // Maps dynamic environment visibility (18..85m) to a balanced minimap lantern sight cone (16..32m)
  return Math.round(Math.max(16, Math.min(32, visibilityRange * 0.45 + 4)));
}

export function revealFogAround(
  explored: Set<number>,
  px: number,
  pz: number,
  sightRadius: number,
): boolean {
  let changed = false;
  const cellRange = Math.ceil(sightRadius / FOG_GRID_CELL_SIZE);
  const centerCx = Math.floor((px + FOG_GRID_HALF_EXTENT) / FOG_GRID_CELL_SIZE);
  const centerCz = Math.floor((pz + FOG_GRID_HALF_EXTENT) / FOG_GRID_CELL_SIZE);

  for (let dz = -cellRange; dz <= cellRange; dz++) {
    for (let dx = -cellRange; dx <= cellRange; dx++) {
      const cx = centerCx + dx;
      const cz = centerCz + dz;
      if (cx < 0 || cx >= FOG_GRID_COLS || cz < 0 || cz >= FOG_GRID_COLS) continue;
      const cellX = -FOG_GRID_HALF_EXTENT + (cx + 0.5) * FOG_GRID_CELL_SIZE;
      const cellZ = -FOG_GRID_HALF_EXTENT + (cz + 0.5) * FOG_GRID_CELL_SIZE;
      if (Math.hypot(cellX - px, cellZ - pz) <= sightRadius + FOG_GRID_CELL_SIZE * 0.45) {
        const idx = cz * FOG_GRID_COLS + cx;
        if (!explored.has(idx)) {
          explored.add(idx);
          changed = true;
        }
      }
    }
  }
  return changed;
}

export function isPointExplored(explored: Set<number>, x: number, z: number): boolean {
  return explored.has(getFogCellIndex(x, z));
}

export function isMarkerVisibleOnMinimap(
  marker: MinimapMarker,
  px: number,
  pz: number,
  sightRadius: number,
  explored: Set<number>,
): boolean {
  if (!marker.active && marker.kind !== 'landmark' && marker.kind !== 'station') return false;
  const dist = Math.hypot(marker.x - px, marker.z - pz);
  if (dist > MINIMAP_VIEW_RADIUS + 3) return false;
  // Enemies only appear inside live lantern/weather sight range
  if (marker.kind === 'enemy') {
    return dist <= sightRadius;
  }
  // Resources appear inside live sight or nearby explored area
  if (marker.kind === 'resource') {
    return dist <= sightRadius || (dist <= 32 && isPointExplored(explored, marker.x, marker.z));
  }
  // Interactive objectives, stations, and landmarks appear once explored or in live sight
  return dist <= sightRadius || isPointExplored(explored, marker.x, marker.z);
}

// ---------------- SPATIAL AUDIO SCHEDULING & ATTENUATION ----------------

export const SPATIAL_AUDIO_ANCHORS: SpatialCueAnchor[] = [
  { id: 'bell_tower', label: 'Chapel Bell Tower', x: 0, y: 9.5, z: -0.6, category: 'bell' },
  { id: 'chapel_ruins', label: 'Chapel Archway', x: 0, y: 4.5, z: -4, category: 'ruin' },
  { id: 'watchtower_ruins', label: 'Watchtower Overlook', x: -36, y: 6.5, z: 10, category: 'ruin' },
  { id: 'windmill_ridge', label: 'Windmill Ridge', x: -26, y: 7.0, z: -34, category: 'ruin' },
  { id: 'sunken_graveyard', label: 'Sunken Graveyard', x: 34, y: 2.4, z: -26, category: 'hollow' },
  { id: 'pumpkin_hollow', label: 'Pumpkin Hollow', x: 30, y: 2.0, z: 14, category: 'hollow' },
];

export function computeSpatialSoundProfile(
  weather: WeatherKind,
  dayPhase: DayPhase,
): SpatialAudioProfile {
  const isNightLike = dayPhase === 'night' || dayPhase === 'dusk';

  if (weather === 'storm') {
    return {
      windBedGain: 0.24,
      rainBedGain: 0.18,
      windFilterHz: 460,
      ruinWindInterval: [4.5, 8.0],
      bellInterval: [12.0, 20.0],
      whisperInterval: [8.5, 14.0],
      rainGustInterval: [4.0, 7.5],
    };
  }
  if (weather === 'rain') {
    return {
      windBedGain: 0.14,
      rainBedGain: 0.11,
      windFilterHz: 370,
      ruinWindInterval: [7.0, 12.0],
      bellInterval: [16.0, 26.0],
      whisperInterval: isNightLike ? [11.0, 18.0] : [18.0, 28.0],
      rainGustInterval: [6.0, 11.0],
    };
  }
  if (weather === 'fog') {
    return {
      windBedGain: 0.17,
      rainBedGain: 0.0,
      windFilterHz: 290,
      ruinWindInterval: [6.5, 11.5],
      bellInterval: [11.0, 18.0],
      whisperInterval: isNightLike ? [6.0, 10.5] : [10.0, 16.0],
      rainGustInterval: null,
    };
  }
  return {
    windBedGain: isNightLike ? 0.11 : 0.08,
    rainBedGain: 0.0,
    windFilterHz: isNightLike ? 260 : 320,
    ruinWindInterval: [11.0, 18.0],
    bellInterval: isNightLike ? [18.0, 28.0] : [24.0, 36.0],
    whisperInterval: isNightLike ? [12.0, 20.0] : [26.0, 40.0],
    rainGustInterval: null,
  };
}

export function computeSpatialAttenuation(
  listenerX: number,
  listenerZ: number,
  listenerYaw: number,
  sourceX: number,
  sourceZ: number,
  maxDistance = 68,
): { distance: number; gainMultiplier: number; pan: number } {
  const dx = sourceX - listenerX;
  const dz = sourceZ - listenerZ;
  const distance = Math.hypot(dx, dz);
  const clampedNorm = Math.max(0, Math.min(1, distance / Math.max(1, maxDistance)));
  const gainMultiplier = Number(((1 - clampedNorm) * (1 - clampedNorm * 0.45)).toFixed(3));

  // Listener right vector when yaw follows Three.js forward = (-sin(yaw), -cos(yaw)) or (sin(yaw), cos(yaw))
  // Compute signed horizontal projection onto listener's right axis
  const rightX = Math.cos(listenerYaw);
  const rightZ = -Math.sin(listenerYaw);
  const pan =
    distance > 0.001
      ? Math.max(-1, Math.min(1, Number(((dx * rightX + dz * rightZ) / distance).toFixed(3))))
      : 0;

  return { distance: Number(distance.toFixed(2)), gainMultiplier, pan };
}

export function selectSpatialCueForWeather(
  kind: SpatialCueKind,
  weather: WeatherKind,
  dayPhase: DayPhase,
  playerX: number,
  playerZ: number,
  enemyPositions: Array<{ x: number; z: number }>,
  rand01: number,
): SpatialCueSpec {
  const r = Math.max(0, Math.min(0.9999, rand01));

  if (kind === 'distant_bell') {
    const bellAnchor = SPATIAL_AUDIO_ANCHORS[0];
    const gain = weather === 'storm' ? 0.34 : weather === 'fog' ? 0.3 : 0.24;
    const pitch = weather === 'storm' ? 0.96 + r * 0.05 : 0.98 + r * 0.03;
    return {
      kind,
      label: bellAnchor.label,
      x: bellAnchor.x,
      y: bellAnchor.y,
      z: bellAnchor.z,
      gain,
      pitch,
    };
  }

  if (kind === 'creature_whisper') {
    // Prefer nearest active creature within 42m; otherwise choose a cursed hollow anchor
    let chosenEnemy: { x: number; z: number; dist: number } | null = null;
    for (const e of enemyPositions) {
      const d = Math.hypot(e.x - playerX, e.z - playerZ);
      if (d <= 42 && (!chosenEnemy || d < chosenEnemy.dist)) {
        chosenEnemy = { x: e.x, z: e.z, dist: d };
      }
    }
    if (chosenEnemy) {
      return {
        kind,
        label: 'Lurking Shadow',
        x: chosenEnemy.x,
        y: groundHeightAt(chosenEnemy.x, chosenEnemy.z) + 1.5,
        z: chosenEnemy.z,
        gain: weather === 'fog' || dayPhase === 'night' ? 0.3 : 0.22,
        pitch: 0.88 + r * 0.24,
      };
    }
    const hollows = SPATIAL_AUDIO_ANCHORS.filter((a) => a.category === 'hollow');
    const anchor = hollows[Math.floor(r * hollows.length)] ?? hollows[0];
    return {
      kind,
      label: anchor.label,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      gain: weather === 'fog' ? 0.28 : 0.2,
      pitch: 0.9 + r * 0.2,
    };
  }

  if (kind === 'rain_gust') {
    const angle = r * Math.PI * 2;
    const dist = 10 + ((r * 7) % 1) * 10;
    const x = playerX + Math.cos(angle) * dist;
    const z = playerZ + Math.sin(angle) * dist;
    return {
      kind,
      label: 'Sweeping Squall',
      x,
      y: groundHeightAt(x, z) + 3.0,
      z,
      gain: weather === 'storm' ? 0.3 : 0.2,
      pitch: 0.92 + r * 0.16,
    };
  }

  if (kind === 'thunder_clap') {
    const angle = r * Math.PI * 2;
    const dist = 28 + ((r * 13) % 1) * 18;
    const x = playerX + Math.cos(angle) * dist;
    const z = playerZ + Math.sin(angle) * dist;
    return {
      kind,
      label: 'Storm Sky',
      x,
      y: 22,
      z,
      gain: 0.42,
      pitch: 0.88 + r * 0.22,
    };
  }

  // 'ruin_wind': whistling wind anchored at ancient ruins
  const ruins = SPATIAL_AUDIO_ANCHORS.filter((a) => a.category === 'ruin');
  const anchor = ruins[Math.floor(r * ruins.length)] ?? ruins[0];
  const gain = weather === 'storm' ? 0.34 : weather === 'fog' ? 0.26 : weather === 'rain' ? 0.24 : 0.16;
  return {
    kind: 'ruin_wind',
    label: anchor.label,
    x: anchor.x,
    y: anchor.y,
    z: anchor.z,
    gain,
    pitch: 0.85 + r * 0.3,
  };
}

// ---------------- CODEX CATALOG & SEARCHABLE DISCOVERY LOG ----------------

export const CODEX_CATALOG: CodexEntry[] = [
  // NPC Bios
  {
    id: 'npc_oathbound',
    category: 'npc',
    title: 'The Oathbound',
    subtitle: 'Lantern-Bearer of the Silver Watch',
    summary: 'Sworn sentinel dispatched to Ashhollow after the Great Bell fell silent.',
    details:
      'Bearing a sanctified oil lantern and a silvered blade, the Oathbound patrols cursed settlements where mist has severed the roads. Lantern Flare bursts stun shadow-kin, while Sanctuary Campfires restore oil and vitality.',
    locationHint: 'Chapel Square Arrival',
    tacticsOrRole: 'Playable Hunter · Lantern & Blade',
  },
  {
    id: 'npc_elder_mirek',
    category: 'npc',
    title: 'Elder Mirek',
    subtitle: 'Keeper of Chapel Square',
    summary: 'Ashhollow’s last remaining village elder who tends the sanctuary fire by night.',
    details:
      'Mirek refused to flee when cursed fog rolled off Windmill Ridge. At dawn and midday he watches the Chapel Steps, returning to the warmth of the Sanctuary Campfire at dusk and night to guide hunters toward the Sacred Bell Shards.',
    locationHint: 'Chapel Steps (Day) · Campfire (Night)',
    tacticsOrRole: 'Quest Giver · Village Chronicler',
  },
  {
    id: 'npc_aldous',
    category: 'npc',
    title: 'Bell-Keeper Aldous',
    subtitle: 'Architect of the Sanctuary Braziers',
    summary: 'The vanished bell-ringer who forged three iron braziers to hold back the valley mist.',
    details:
      'Records etched onto the Sanctuary Braziers recount how Aldous scattered brass Bell Shards across the outer districts before the Hollow Warden sealed the belfry. Lighting his braziers weakens the mist around Chapel Square.',
    locationHint: 'Sanctuary Braziers',
    tacticsOrRole: 'Historical Figure · Smith & Ringer',
  },
  // Enemy Profiles
  {
    id: 'enemy_crawler',
    category: 'enemy',
    title: 'Fog Crawler',
    subtitle: 'Mist-Born Stalker',
    summary: 'Agile pack predator drawn to unlit lantern oil and wandering travelers.',
    details:
      'Hunched silhouettes formed where cursed fog clings to dead timber. Fog Crawlers close distance rapidly and telegraph a short lunge before striking. Defeated crawlers yield Ironwood Timber.',
    locationHint: 'Outskirts & Village Trails',
    tacticsOrRole: '48 HP · Fast Melee · Drops Ironwood',
  },
  {
    id: 'enemy_weaver',
    category: 'enemy',
    title: 'Wisp Weaver',
    subtitle: 'Arcane Graveyard Phantom',
    summary: 'Ranged spirit that strafes at mid-distance and hurls frost-wisp bolts.',
    details:
      'Floating above sunken earth and mill ruins, Wisp Weavers retreat if pressed too closely and fire glowing bolts after a brief windup ring. Dash sideways to evade and claim Moonpetal Herbs upon banishing them.',
    locationHint: 'Windmill Ridge & Pumpkin Hollow',
    tacticsOrRole: '55 HP · Ranged Kiter · Drops Moonpetal',
  },
  {
    id: 'enemy_brute',
    category: 'enemy',
    title: 'Cursed Revenant',
    subtitle: 'Iron-Bound Graveyard Sentinel',
    summary: 'Heavy armored husk wielding crushing blows across Sunken Graveyard.',
    details:
      'Bound in rusted tomb plates, Revenants endure basic slashes and wind up wide cleaver slams. Stagger them with Lantern Flare [K] or upgrade to a Tempered Silver Blade before engaging.',
    locationHint: 'Sunken Graveyard',
    tacticsOrRole: '115 HP · Heavy Bruiser · Drops Bog Iron',
  },
  {
    id: 'enemy_warden',
    category: 'enemy',
    title: 'The Hollow Warden',
    subtitle: 'Curse-Binder of the Great Bell',
    summary: 'Colossal revenant lord summoned to Chapel Square once all three Bell Shards are reclaimed.',
    details:
      'Manifesting in full dread regalia when the shards converge, the Hollow Warden guards the Chapel Bell Rope until banished. Craft Tier II–III gear and keep Vitality Tonics ready for its sweeping slams.',
    locationHint: 'Chapel Square (Final Encounter)',
    tacticsOrRole: '220 HP · Boss Sentinel',
  },
  // Discovered Lore Scrolls
  {
    id: 'lore_1',
    category: 'lore',
    title: 'Watchman Ledger',
    subtitle: 'Watchtower Overlook Scroll',
    summary: 'Entry dated the night the valley mist first swallowed the ridge.',
    details:
      '"The bell cracked at midnight when the fog rolled off the ridge. None on the western overlook saw a lantern return from the mill before the wind turned cold."',
    locationHint: 'Watchtower Overlook (West Hill)',
    tacticsOrRole: 'Recovered Chronicle · +85 Honor',
  },
  {
    id: 'lore_2',
    category: 'lore',
    title: 'Miller Note',
    subtitle: 'Windmill Ridge Scroll',
    summary: 'Scrap of parchment nailed beside the upper timber lattice.',
    details:
      '"The sails spin without wind. Shadows gather beneath the grain, whispering names from the hollow while the grindstone turns on its own."',
    locationHint: 'Windmill Ridge (Northwest)',
    tacticsOrRole: 'Recovered Chronicle · +85 Honor',
  },
  {
    id: 'lore_3',
    category: 'lore',
    title: 'Harvest Tithe',
    subtitle: 'Pumpkin Hollow Scroll',
    summary: 'Tattered harvest tally left among the lantern-lit pumpkin rows.',
    details:
      '"Every pumpkin left unharvested whispers with the names of the lost. We piled the market carts high, yet the eastern trail grew silent before dawn."',
    locationHint: 'Pumpkin Hollow (Southeast)',
    tacticsOrRole: 'Recovered Chronicle · +85 Honor',
  },
  {
    id: 'lore_4',
    category: 'lore',
    title: 'Gravekeeper Oath',
    subtitle: 'Sunken Graveyard Scroll',
    summary: 'Stone-rubbing transcription found beside the weathered headstones.',
    details:
      '"Only the three shards forged in chapel brass can bind the Warden. Keep them apart no longer, lest the hollow bell never toll again."',
    locationHint: 'Sunken Graveyard (Northeast)',
    tacticsOrRole: 'Recovered Chronicle · +85 Honor',
  },
  {
    id: 'lore_5',
    category: 'lore',
    title: 'Squire Diary',
    subtitle: 'Chapel Trail Scroll',
    summary: 'Field notes dropped by an earlier scout along the northern cobblestones.',
    details:
      '"Light the braziers first—their warmth weakens the mist creatures and refills lantern oil before stepping into the outer hollows."',
    locationHint: 'North Chapel Cobblestones',
    tacticsOrRole: 'Recovered Chronicle · +85 Honor',
  },
];

export function createInitialCodexState(): Record<string, CodexProgressEntry> {
  return {
    npc_oathbound: { id: 'npc_oathbound', discoveredAtSec: 0, encounters: 1 },
  };
}

export function getEnemyCodexId(archetype: EnemyArchetype, isBoss: boolean): string {
  if (isBoss) return 'enemy_warden';
  if (archetype === 'brute') return 'enemy_brute';
  if (archetype === 'weaver') return 'enemy_weaver';
  return 'enemy_crawler';
}

export function unlockCodexEntry(
  state: Record<string, CodexProgressEntry>,
  entryId: string,
  elapsedSec: number,
  incrementEncounter = false,
): { nextState: Record<string, CodexProgressEntry>; newlyUnlocked: boolean } {
  const existing = state[entryId];
  if (existing) {
    if (!incrementEncounter) {
      return { nextState: state, newlyUnlocked: false };
    }
    return {
      nextState: {
        ...state,
        [entryId]: { ...existing, encounters: existing.encounters + 1 },
      },
      newlyUnlocked: false,
    };
  }
  return {
    nextState: {
      ...state,
      [entryId]: {
        id: entryId,
        discoveredAtSec: Math.max(0, Math.round(elapsedSec)),
        encounters: 1,
      },
    },
    newlyUnlocked: true,
  };
}

export interface CodexViewItem extends CodexEntry {
  discovered: boolean;
  discoveredAtSec: number | null;
  encounters: number;
}

export function filterCodexEntries(
  catalog: CodexEntry[],
  discoveredMap: Record<string, CodexProgressEntry>,
  categoryFilter: 'all' | CodexCategory,
  searchQuery: string,
): CodexViewItem[] {
  const q = searchQuery.trim().toLowerCase();
  const items: CodexViewItem[] = [];

  for (const entry of catalog) {
    if (categoryFilter !== 'all' && entry.category !== categoryFilter) continue;
    const progress = discoveredMap[entry.id];
    const discovered = Boolean(progress);

    if (q.length > 0) {
      if (!discovered) continue;
      const haystack = `${entry.title} ${entry.subtitle} ${entry.summary} ${entry.details} ${entry.locationHint} ${entry.tacticsOrRole ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    items.push({
      ...entry,
      discovered,
      discoveredAtSec: progress ? progress.discoveredAtSec : null,
      encounters: progress ? progress.encounters : 0,
    });
  }

  return items;
}



