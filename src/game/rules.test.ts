import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addResource,
  advanceQuestProgress,
  areAllQuestsCompleted,
  buildShelterColliders,
  calculateHonorScore,
  canCraftRecipe,
  CODEX_CATALOG,
  computeEnvironmentEffects,
  computeSpatialAttenuation,
  computeSpatialSoundProfile,
  createInitialCodexState,
  createInitialCraftState,
  createInitialQuests,
  executeCraftRecipe,
  filterCodexEntries,
  formatClockTime,
  getActiveQuest,
  getCombatModifiers,
  getDayPhase,
  getElderScheduleWaypoint,
  getEnemyCodexId,
  getFogCellCenter,
  getFogCellIndex,
  getMinimapSightRadius,
  getRegionNameAt,
  getShelterDoorWorldPos,
  getShelterFloorOffset,
  groundHeightAt,
  isMarkerVisibleOnMinimap,
  isPointExplored,
  isPointInsideShelter,
  resolveWorldCollisions,
  revealFogAround,
  roadMaskAt,
  selectSpatialCueForWeather,
  ShelterHouseSpec,
  shelterLocalToWorld,
  unlockCodexEntry,
} from './rules';

test('terrain height is smooth in village center and rises at valley rim', () => {
  const centerY = groundHeightAt(0, 0);
  const rimY = groundHeightAt(85, 0);
  assert.ok(Math.abs(centerY) < 0.5, 'Center village should be flat enough for chapel');
  assert.ok(rimY > 5, 'Outer rim should rise into natural cliffs');
});

test('road mask detects main cobblestone path near spawn', () => {
  assert.ok(roadMaskAt(0, 12) > 0.8, 'Spawn path should register on road');
  assert.equal(roadMaskAt(50, 50), 0, 'Far off-road should be 0');
});

test('region names map accurately to village districts', () => {
  assert.equal(getRegionNameAt(0, -4), 'Chapel Square');
  assert.equal(getRegionNameAt(-26, -34), 'Windmill Ridge');
  assert.equal(getRegionNameAt(30, 14), 'Pumpkin Hollow');
  assert.equal(getRegionNameAt(34, -26), 'Sunken Graveyard');
});

test('quest chain advances sequentially from Elder Plea to Toll Bell', () => {
  let quests = createInitialQuests();
  assert.equal(getActiveQuest(quests).id, 'speak_elder');
  assert.equal(areAllQuestsCompleted(quests), false);

  let res = advanceQuestProgress(quests, 'speak_elder', 1);
  quests = res.quests;
  assert.equal(res.justCompleted, true);
  assert.equal(getActiveQuest(quests).id, 'light_braziers');

  res = advanceQuestProgress(quests, 'light_braziers', 2);
  quests = res.quests;
  assert.equal(res.justCompleted, false);
  assert.equal(getActiveQuest(quests).current, 2);

  res = advanceQuestProgress(quests, 'light_braziers', 1);
  quests = res.quests;
  assert.equal(res.justCompleted, true);
  assert.equal(getActiveQuest(quests).id, 'recover_shards');

  quests = advanceQuestProgress(quests, 'recover_shards', 3).quests;
  assert.equal(getActiveQuest(quests).id, 'toll_bell');

  quests = advanceQuestProgress(quests, 'toll_bell', 1).quests;
  assert.equal(areAllQuestsCompleted(quests), true);
});

test('honor score scales with exploration, quests, crafting, and combat', () => {
  const score = calculateHonorScore({
    banished: 5,
    braziersLit: 3,
    shardsFound: 3,
    loreFound: 2,
    craftedCount: 2,
    bellTolled: true,
  });
  assert.equal(score, 5 * 40 + 3 * 120 + 3 * 200 + 2 * 85 + 2 * 35 + 500);
});

test('collision resolution pushes player out of buildings and keeps within valley', () => {
  const outBox = resolveWorldCollisions(
    0.5,
    0,
    0.6,
    [],
    [{ id: 'chapel', x: 0, z: 0, halfW: 3, halfD: 4 }],
  );
  assert.ok(Math.abs(outBox.x) >= 3.59 || Math.abs(outBox.z) >= 4.59);

  const outRim = resolveWorldCollisions(120, 0, 0.6, [], [], 72);
  assert.ok(Math.hypot(outRim.x, outRim.z) <= 72.001);
});

test('crafting system validates ingredients, prevents invalid tier skips, and upgrades combat stats', () => {
  let craft = createInitialCraftState();
  assert.equal(canCraftRecipe(craft, 'vitality_tonic').allowed, false);

  craft.inventory = addResource(craft.inventory, 'herb', 1);
  assert.equal(canCraftRecipe(craft, 'vitality_tonic').allowed, true);
  const potionRes = executeCraftRecipe(craft, 'vitality_tonic');
  assert.equal(potionRes.crafted, true);
  craft = potionRes.nextState;
  assert.equal(craft.potions.vitality, 2);
  assert.equal(craft.inventory.herb, 0);
  assert.equal(craft.inventory.wood, 0);

  craft.inventory = { herb: 10, ore: 10, wood: 10 };
  assert.equal(canCraftRecipe(craft, 'sun_blade_t3').allowed, false);

  craft = executeCraftRecipe(craft, 'silver_blade_t2').nextState;
  assert.equal(craft.weaponTier, 2);
  assert.equal(canCraftRecipe(craft, 'sun_blade_t3').allowed, true);
  craft = executeCraftRecipe(craft, 'sun_blade_t3').nextState;
  assert.equal(craft.weaponTier, 3);

  craft = executeCraftRecipe(craft, 'hunter_coat_t2').nextState;
  const mods = getCombatModifiers(craft.weaponTier, craft.armorTier);
  assert.equal(mods.baseDamage, 46);
  assert.equal(mods.maxHp, 135);
  assert.equal(mods.damageMultiplier, 0.8);
});

test('day/night cycle and weather govern NPC schedule, visibility, and spawn rates', () => {
  assert.equal(getDayPhase(6.5), 'dawn');
  assert.equal(getDayPhase(12.0), 'day');
  assert.equal(getDayPhase(18.5), 'dusk');
  assert.equal(getDayPhase(22.0), 'night');
  assert.equal(formatClockTime(21.5), '21:30');

  const dayElder = getElderScheduleWaypoint(12);
  const nightElder = getElderScheduleWaypoint(22);
  assert.equal(dayElder.label, 'Chapel Steps');
  assert.equal(nightElder.label, 'Sanctuary Campfire');

  const dayClear = computeEnvironmentEffects(12, 'clear');
  const nightStorm = computeEnvironmentEffects(22, 'storm');
  assert.ok(dayClear.visibilityRange > nightStorm.visibilityRange);
  assert.ok(nightStorm.enemySpawnRateMultiplier > dayClear.enemySpawnRateMultiplier);
});

test('fog-of-war exploration reveals nearby grid cells and filters minimap markers', () => {
  const explored = new Set<number>();
  const sight = getMinimapSightRadius(30); // ~18m
  assert.ok(sight >= 16 && sight <= 32);

  const revealed = revealFogAround(explored, 0, 16, sight);
  assert.equal(revealed, true);
  assert.equal(isPointExplored(explored, 0, 16), true);
  assert.equal(isPointExplored(explored, -34, -34), false);

  const center = getFogCellCenter(getFogCellIndex(0, 16));
  assert.ok(Math.hypot(center.x, center.z - 16) < 8);

  // Nearby station is visible, distant enemy outside sight is hidden
  assert.equal(
    isMarkerVisibleOnMinimap(
      { id: 'st', x: 1.4, z: 6.8, kind: 'station', active: true },
      0,
      16,
      sight,
      explored,
    ),
    true,
  );
  assert.equal(
    isMarkerVisibleOnMinimap(
      { id: 'e_far', x: 0, z: -15, kind: 'enemy', active: true },
      0,
      16,
      sight,
      explored,
    ),
    false,
  );

  // Even after exploring a cell, an enemy outside live sight stays hidden by mist
  revealFogAround(explored, 0, -15, sight);
  assert.equal(
    isMarkerVisibleOnMinimap(
      { id: 'e_far', x: 0, z: -15, kind: 'enemy', active: true },
      0,
      16,
      sight,
      explored,
    ),
    false,
  );
  assert.equal(
    isMarkerVisibleOnMinimap(
      { id: 'braz_far', x: 0, z: -15, kind: 'brazier', active: true },
      0,
      16,
      sight,
      explored,
    ),
    true,
  );
});

test('spatial audio manager profiles, attenuation, and weather cue selection', () => {
  const clearDay = computeSpatialSoundProfile('clear', 'day');
  const fogNight = computeSpatialSoundProfile('fog', 'night');
  const stormNight = computeSpatialSoundProfile('storm', 'night');

  assert.equal(clearDay.rainBedGain, 0);
  assert.equal(clearDay.rainGustInterval, null);
  assert.ok(stormNight.windBedGain > fogNight.windBedGain);
  assert.ok(stormNight.rainBedGain > 0);
  assert.ok(stormNight.rainGustInterval !== null);
  assert.ok(fogNight.whisperInterval[0] < clearDay.whisperInterval[0]);

  // Spatial attenuation and stereo panning relative to listener facing North (yaw = 0 -> right = +X)
  const rightSide = computeSpatialAttenuation(0, 0, 0, 12, 0, 60);
  const leftSide = computeSpatialAttenuation(0, 0, 0, -12, 0, 60);
  const farSide = computeSpatialAttenuation(0, 0, 0, 60, 0, 60);
  assert.ok(rightSide.pan > 0.9, 'Source to +X should pan right');
  assert.ok(leftSide.pan < -0.9, 'Source to -X should pan left');
  assert.ok(rightSide.gainMultiplier > farSide.gainMultiplier, 'Closer source should be louder');
  assert.equal(farSide.gainMultiplier, 0);

  // Bell tolls always originate from Chapel Bell Tower
  const bellCue = selectSpatialCueForWeather('distant_bell', 'fog', 'night', 0, 16, [], 0.4);
  assert.equal(bellCue.kind, 'distant_bell');
  assert.equal(bellCue.label, 'Chapel Bell Tower');
  assert.ok(bellCue.y > 5);

  // Creature whispers anchor on nearby enemy when within 42m, else fall back to cursed hollows
  const nearEnemyWhisper = selectSpatialCueForWeather(
    'creature_whisper',
    'fog',
    'night',
    0,
    16,
    [{ x: -12, z: -4 }, { x: 40, z: -30 }],
    0.2,
  );
  assert.equal(nearEnemyWhisper.label, 'Lurking Shadow');
  assert.equal(nearEnemyWhisper.x, -12);
  assert.equal(nearEnemyWhisper.z, -4);

  const hollowWhisper = selectSpatialCueForWeather(
    'creature_whisper',
    'fog',
    'night',
    0,
    16,
    [],
    0.1,
  );
  assert.ok(hollowWhisper.label === 'Sunken Graveyard' || hollowWhisper.label === 'Pumpkin Hollow');

  const ruinWind = selectSpatialCueForWeather('ruin_wind', 'storm', 'night', 0, 16, [], 0.5);
  assert.equal(ruinWind.kind, 'ruin_wind');
  assert.ok(ruinWind.gain >= 0.3);
});

test('codex automatically logs lore, enemies, and NPCs with category filtering and search', () => {
  let codex = createInitialCodexState();
  assert.ok(codex.npc_oathbound, 'Hunter bio should start recorded');

  // Unlock Elder Mirek & Lore Scroll & Enemy with encounter increment
  let res = unlockCodexEntry(codex, 'npc_elder_mirek', 12);
  codex = res.nextState;
  assert.equal(res.newlyUnlocked, true);

  res = unlockCodexEntry(codex, 'lore_1', 28);
  codex = res.nextState;
  assert.equal(res.newlyUnlocked, true);

  const crawlerId = getEnemyCodexId('crawler', false);
  assert.equal(crawlerId, 'enemy_crawler');
  assert.equal(getEnemyCodexId('brute', true), 'enemy_warden');

  codex = unlockCodexEntry(codex, crawlerId, 35, false).nextState;
  codex = unlockCodexEntry(codex, crawlerId, 42, true).nextState;
  assert.equal(codex[crawlerId].encounters, 2);

  // Filtering by category shows all entries in that category with accurate discovered flags
  const enemies = filterCodexEntries(CODEX_CATALOG, codex, 'enemy', '');
  assert.equal(enemies.length, 4);
  assert.equal(enemies.find((e) => e.id === 'enemy_crawler')?.discovered, true);
  assert.equal(enemies.find((e) => e.id === 'enemy_weaver')?.discovered, false);

  // Search only matches discovered entries (does not spoil undiscovered entries)
  const searchLore = filterCodexEntries(CODEX_CATALOG, codex, 'all', 'Watchtower');
  assert.equal(searchLore.length, 1);
  assert.equal(searchLore[0].id, 'lore_1');

  const searchHidden = filterCodexEntries(CODEX_CATALOG, codex, 'all', 'Miller');
  assert.equal(searchHidden.length, 0);
});

test('shelter houses block when door closed, allow entry when open, and detect interior even when rotated', () => {
  const house: ShelterHouseSpec = {
    id: 'cot_west',
    name: 'West Chapel Cottage',
    x: -15,
    z: -6,
    rotationY: 0.5,
    scale: 1.0,
  };

  const { wallColliders, doorCollider } = buildShelterColliders(house);
  const allBoxes = [...wallColliders, doorCollider];

  const doorPos = getShelterDoorWorldPos(house);
  // Approaching doorway from outside while closed pushes player cleanly outside
  const approachClosed = shelterLocalToWorld(house, 0, 3.55);
  const blocked = resolveWorldCollisions(approachClosed.x, approachClosed.z, 0.55, [], allBoxes);
  assert.equal(isPointInsideShelter(blocked.x, blocked.z, house), false);
  assert.ok(Math.hypot(blocked.x - house.x, blocked.z - house.z) > 3.9, 'Closed door should push player outside doorway');
  assert.ok(Math.hypot(doorPos.x - house.x, doorPos.z - house.z) > 3.0);

  // Opening the door disables the door collider so player passes straight inside
  doorCollider.disabled = true;
  const stepThreshold = shelterLocalToWorld(house, 0, 3.15);
  const entered = resolveWorldCollisions(stepThreshold.x, stepThreshold.z, 0.55, [], allBoxes);
  assert.ok(
    Math.hypot(entered.x - stepThreshold.x, entered.z - stepThreshold.z) < 0.01,
    'Open door should allow unobstructed entry through doorway',
  );

  // Move to center of interior and check interior detection & floor elevation
  const interiorSpot = shelterLocalToWorld(house, 0.4, -0.5);
  const insideResolved = resolveWorldCollisions(interiorSpot.x, interiorSpot.z, 0.55, [], allBoxes);
  assert.equal(isPointInsideShelter(insideResolved.x, insideResolved.z, house), true);
  assert.ok(getShelterFloorOffset(insideResolved.x, insideResolved.z, house) > 0.3);

  // Outside the house should not count as inside
  const outsideSpot = shelterLocalToWorld(house, 0, 4.5);
  assert.equal(isPointInsideShelter(outsideSpot.x, outsideSpot.z, house), false);
  assert.equal(getShelterFloorOffset(outsideSpot.x, outsideSpot.z, house), 0);

  // Side walls still block entry even when door is open
  const sideAttempt = shelterLocalToWorld(house, -2.3, 0);
  const sideBlocked = resolveWorldCollisions(sideAttempt.x, sideAttempt.z, 0.55, [], allBoxes);
  assert.ok(
    Math.hypot(sideBlocked.x - sideAttempt.x, sideBlocked.z - sideAttempt.z) > 0.1,
    'Solid side wall must still block movement when door is open',
  );
});



