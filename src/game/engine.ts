import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GothicAudio } from './audio';
import {
  addResource,
  advanceQuestProgress,
  BoxCollider,
  buildShelterColliders,
  calculateHonorScore,
  CircleCollider,
  computeEnvironmentEffects,
  CODEX_CATALOG,
  CRAFT_RECIPES,
  createInitialCodexState,
  createInitialCraftState,
  createInitialQuests,
  executeCraftRecipe,
  getActiveQuest,
  getCombatModifiers,
  getDayPhase,
  getElderScheduleWaypoint,
  getEnemyCodexId,
  getFogDensityFor,
  getMinimapSightRadius,
  getRegionNameAt,
  getShelterDoorWorldPos,
  getShelterFloorOffset,
  groundHeightAt,
  isPointInsideShelter,
  resolveWorldCollisions,
  revealFogAround,
  roadMaskAt,
  ShelterHouseSpec,
  unlockCodexEntry,
  WEATHER_SEQUENCE,
} from './rules';
import { createVillageTextures, VillageTextures } from './textures';
import {
  CodexProgressEntry,
  CraftProgressState,
  CraftRecipeId,
  EnemyArchetype,
  GameScreenState,
  HudSnapshot,
  InteractablePrompt,
  MinimapMarker,
  QuestStep,
  ResourceKind,
  RunStatsSnapshot,
  WeatherKind,
} from './types';
import {
  buildBellShard,
  buildBrazier,
  buildCampfire,
  buildChapel,
  buildCottage,
  buildCraftingStation,
  buildElderMirek,
  buildEnemyModel,
  buildFarmWindmill,
  buildFenceLine,
  buildInstancedForestAndRocks,
  buildLoreScroll,
  buildMarketTent,
  buildPlayerCharacter,
  buildPumpkin,
  buildResourceNode,
  buildWoodenCart,
  buildWoodenWindmill,
  CottageRig,
  createTerrainMesh,
  createWorldMaterials,
  EnemyRig,
  PlayerRig,
  WorldMaterials,
} from './worldBuilder';

interface BrazierEntity {
  id: string;
  name: string;
  x: number;
  z: number;
  lit: boolean;
  flameMesh: THREE.Mesh;
  beaconRing: THREE.Mesh;
}

interface ShardEntity {
  id: string;
  name: string;
  x: number;
  z: number;
  collected: boolean;
  group: THREE.Group;
  relicMesh: THREE.Mesh;
}

interface LoreEntity {
  id: string;
  title: string;
  text: string;
  x: number;
  z: number;
  collected: boolean;
  group: THREE.Group;
  scrollMesh: THREE.Mesh;
}

interface ResourceNodeEntity {
  id: string;
  kind: ResourceKind;
  name: string;
  x: number;
  z: number;
  collected: boolean;
  respawnTimer: number;
  group: THREE.Group;
}

interface CraftingStationEntity {
  id: string;
  variant: 'alchemy' | 'anvil';
  name: string;
  x: number;
  z: number;
  group: THREE.Group;
}

interface ShelterEntity {
  spec: ShelterHouseSpec;
  doorX: number;
  doorZ: number;
  doorOpen: boolean;
  doorAngle: number;
  doorCollider: BoxCollider;
  rig: CottageRig;
  hearthLight: THREE.PointLight;
}

interface EnemyEntity {
  id: string;
  archetype: EnemyArchetype;
  isBoss: boolean;
  name: string;
  rig: EnemyRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  homeX: number;
  homeZ: number;
  hp: number;
  maxHp: number;
  speed: number;
  aggroRadius: number;
  attackRange: number;
  damage: number;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  stateTimer: number;
  flashTimer: number;
  koTimer: number;
  cooldown: number;
  respawnTimer: number;
}

interface Projectile {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
  damage: number;
  mesh: THREE.Mesh;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const PARTICLE_COUNT = 160;
const RAIN_COUNT = 180;
const _v3 = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _rayDir = new THREE.Vector3();
const _cSky = new THREE.Color();
const _cTargetSky = new THREE.Color();
const _cHemiSky = new THREE.Color();
const _cHemiGround = new THREE.Color();
const _cMoon = new THREE.Color();

export class AshhollowEngine {
  private container: HTMLElement;
  private onHudUpdate: (hud: HudSnapshot) => void;
  private onRunEnd: (stats: RunStatsSnapshot) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private textures!: VillageTextures;
  private mats!: WorldMaterials;
  private audio = new GothicAudio();
  private isSoftwareGl = false;

  private frameId = 0;
  private disposed = false;
  private lastTime = 0;

  // World & animated props
  private playerRig!: PlayerRig;
  private elderGroup!: THREE.Group;
  private elderX = 5.3;
  private elderZ = 4.7;
  private elderYaw = -0.8;
  private hemiLight!: THREE.HemisphereLight;
  private moonKey!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private moonDiscMesh!: THREE.Mesh;
  private terrainMat!: THREE.MeshStandardMaterial;
  private mistMeshes: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number; speed: number }> = [];
  private mistMat!: THREE.MeshBasicMaterial;
  private rainMesh!: THREE.InstancedMesh;
  private rainDrops: Array<{ x: number; y: number; z: number; speed: number }> = [];
  private chapelBellPivot!: THREE.Group;
  private woodMillBlades!: THREE.Group;
  private farmMillWheel!: THREE.Group;
  private campfireFlame!: THREE.Mesh;
  private campfireLight!: THREE.PointLight;
  private playerLanternLight!: THREE.PointLight;
  private flareLight!: THREE.PointLight;
  private flareWaveMesh!: THREE.Mesh;
  private slashArcMesh!: THREE.Mesh;

  // Colliders & occluders
  private circles: CircleCollider[] = [];
  private boxes: BoxCollider[] = [];
  private cameraOccluders: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();

  // Entities
  private braziers: BrazierEntity[] = [];
  private shards: ShardEntity[] = [];
  private lores: LoreEntity[] = [];
  private resourceNodes: ResourceNodeEntity[] = [];
  private stations: CraftingStationEntity[] = [];
  private shelters: ShelterEntity[] = [];
  private activeShelter: ShelterEntity | null = null;
  private enemies: EnemyEntity[] = [];
  private projectiles: Projectile[] = [];
  private bossSpawned = false;
  private bossDefeated = false;

  // Pooled particle ring buffer
  private particles: Particle[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private particleCursor = 0;

  // Game state
  private screen: GameScreenState = 'title';
  private outcome: 'none' | 'victory' | 'defeat' = 'none';
  private quests: QuestStep[] = createInitialQuests();
  private craftState: CraftProgressState = createInitialCraftState();
  private craftingOpen = false;
  private craftedCount = 0;
  private codex: Record<string, CodexProgressEntry> = createInitialCodexState();
  private exploredCells = new Set<number>();
  private timeOfDay = 20.5;
  private weather: WeatherKind = 'fog';
  private weatherTimer = 38;
  private lightningTimer = 7;
  private lightningFlash = 0;
  private elapsedSec = 0;
  private banished = 0;
  private loreFound = 0;
  private damageTaken = 0;
  private bellTolled = false;
  private bellRingTimer = 0;
  private hitstopTimer = 0;
  private trauma = 0;
  private hudEmitAccum = 0;
  private endBeatTimer = 0;

  // Player state
  private px = 0;
  private py = 0;
  private pz = 16;
  private pvx = 0;
  private pvz = 0;
  private pYaw = Math.PI; // Facing North (-Z) toward Elder Mirek & Chapel!
  private hp = 100;
  private maxHp = 100;
  private stamina = 100;
  private maxStamina = 100;
  private oil = 100;
  private maxOil = 100;
  private walkPhase = 0;
  private stepAccum = 0;
  private invulnTimer = 0;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDirX = 0;
  private dashDirZ = -1;
  private attackTimer = 0;
  private attackCooldown = 0;
  private comboIndex = 0;
  private attackDidHit = false;
  private flareCooldown = 0;
  private squashX = 1;
  private squashY = 1;

  // Camera rig
  private camYaw = 0.16;
  private camPitch = 0.27;
  private camDist = 9.8;
  private camPos = new THREE.Vector3(1.5, 5, 25);
  private camLook = new THREE.Vector3(0, 2.2, 4);
  private titleOrbitAngle = 0.55;

  // Dialogue & toast
  private activeDialogue: { speaker: string; text: string; timer: number } | null = null;
  private activeToast: { text: string; timer: number } | null = null;
  private nearestPrompt: InteractablePrompt | null = null;
  private nearestAction: (() => void) | null = null;

  // Unified input state
  private keysHeld = new Set<string>();
  private joystick = { x: 0, y: 0 };
  private bufferedDash = 0;
  private bufferedAttack = 0;
  private bufferedInteract = 0;
  private bufferedFlare = 0;
  private dragPointerId: number | null = null;
  private lastDragX = 0;
  private lastDragY = 0;

  private resizeObserver: ResizeObserver | null = null;

  constructor(
    container: HTMLElement,
    onHudUpdate: (hud: HudSnapshot) => void,
    onRunEnd: (stats: RunStatsSnapshot) => void,
    autostart = false,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onRunEnd = onRunEnd;

    this.initRendererAndScene();
    this.buildWorld();
    this.initParticles();
    this.initRainSystem();
    this.initProjectiles();
    this.resetWorldState(autostart ? 'playing' : 'title');
    this.updateEnvironmentVisuals(1.0);
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTime = performance.now();
    if (this.screen === 'title') {
      this.updateTitleTour(0);
    } else {
      this.updateCamera(1.0);
    }
    this.renderer.render(this.scene, this.camera);
    this.emitHud();
    this.scheduleNextTick();
  }

  private detectSoftwareGl(): boolean {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initRendererAndScene(): void {
    this.isSoftwareGl = this.detectSoftwareGl();
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 0.65 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x132330);
    this.scene.fog = new THREE.FogExp2(0x132330, 0.022);

    this.camera = new THREE.PerspectiveCamera(56, w / h, 0.2, 260);

    // Studio environment reflections for metals & wet surfaces
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Moonlit chiaroscuro key + atmospheric hemisphere fill + cold rim backlight
    this.hemiLight = new THREE.HemisphereLight(0x6388ab, 0x161f26, 0.78);
    this.scene.add(this.hemiLight);

    this.moonKey = new THREE.DirectionalLight(0xaad0f5, 1.4);
    this.moonKey.position.set(-28, 38, 22);
    this.moonKey.castShadow = !this.isSoftwareGl;
    this.moonKey.shadow.mapSize.set(this.isSoftwareGl ? 1024 : 2048, this.isSoftwareGl ? 1024 : 2048);
    this.moonKey.shadow.radius = 3.0;
    this.moonKey.shadow.camera.near = 2;
    this.moonKey.shadow.camera.far = 115;
    const d = 34;
    this.moonKey.shadow.camera.left = -d;
    this.moonKey.shadow.camera.right = d;
    this.moonKey.shadow.camera.top = d;
    this.moonKey.shadow.camera.bottom = -d;
    this.moonKey.shadow.bias = -0.0004;
    this.moonKey.shadow.normalBias = 0.024;
    this.scene.add(this.moonKey);
    this.scene.add(this.moonKey.target);

    this.rimLight = new THREE.DirectionalLight(0x5282ab, 0.55);
    this.rimLight.position.set(25, 16, -32);
    this.scene.add(this.rimLight);
  }

  private buildWorld(): void {
    this.textures = createVillageTextures(this.renderer);
    this.mats = createWorldMaterials(this.textures);

    // Terrain
    const terrain = createTerrainMesh(this.textures);
    this.terrainMat = terrain.material as THREE.MeshStandardMaterial;
    this.scene.add(terrain);

    // 1. Central Bell-Tower Chapel at (0, y, -4)
    const chapel = buildChapel(this.mats);
    const chapelY = groundHeightAt(0, -4);
    chapel.group.position.set(0, chapelY, -4);
    this.scene.add(chapel.group);
    this.chapelBellPivot = chapel.bellPivot;
    this.cameraOccluders.push(chapel.group);
    this.boxes.push({ id: 'chapel_main', x: 0, z: -4, halfW: 4.1, halfD: 5.4 });
    this.boxes.push({ id: 'chapel_shed', x: -2.3, z: 1.8, halfW: 1.9, halfD: 2.1 });

    const chapelPorchLight = new THREE.PointLight(0xff8b36, 2.2, 12, 1.5);
    chapelPorchLight.position.set(1.5, chapelY + 2.85, 1.5);
    this.scene.add(chapelPorchLight);

    // 2. Elder Mirek & Warm Campfire Cauldron in Chapel Square (right in spawn sightline!)
    const camp = buildCampfire(this.mats);
    const campY = groundHeightAt(3.8, 4.5);
    camp.group.position.set(3.8, campY, 4.5);
    this.scene.add(camp.group);
    this.campfireFlame = camp.flameMesh;
    this.circles.push({ id: 'campfire', x: 3.8, z: 4.5, radius: 1.0 });

    this.campfireLight = new THREE.PointLight(0xff8429, 7.0, 24, 1.5);
    this.campfireLight.position.set(3.8, campY + 1.6, 4.5);
    this.scene.add(this.campfireLight);

    this.elderGroup = buildElderMirek(this.mats);
    this.elderGroup.position.set(this.elderX, groundHeightAt(this.elderX, this.elderZ), this.elderZ);
    this.elderGroup.rotation.y = this.elderYaw;
    this.scene.add(this.elderGroup);
    this.circles.push({ id: 'elder', x: this.elderX, z: this.elderZ, radius: 0.6 });

    // 3. Enterable Shelter Cottages around the Square & Trails
    const cottageSpecs: ShelterHouseSpec[] = [
      { id: 'cottage_west', name: 'West Chapel Cottage', x: -15, z: -6, rotationY: 0.5, scale: 1.0 },
      { id: 'cottage_east', name: 'East Chapel Cottage', x: 15.5, z: -6.5, rotationY: -0.55, scale: 0.95 },
      { id: 'cottage_mill', name: 'Windmill Trail Cottage', x: -12, z: -23, rotationY: 0.25, scale: 0.9 },
      { id: 'cottage_hollow', name: 'Pumpkin Hollow Cottage', x: 23, z: 14, rotationY: -1.1, scale: 1.0 },
    ];
    for (const spec of cottageSpecs) {
      const cot = buildCottage(this.mats, spec.scale);
      const cotY = groundHeightAt(spec.x, spec.z);
      cot.group.position.set(spec.x, cotY, spec.z);
      cot.group.rotation.y = spec.rotationY;
      this.scene.add(cot.group);
      this.cameraOccluders.push(cot.wallGroup);

      const { wallColliders, doorCollider } = buildShelterColliders(spec);
      this.boxes.push(...wallColliders, doorCollider);

      const doorPos = getShelterDoorWorldPos(spec);
      const hearthLight = new THREE.PointLight(0xff8e3c, 1.8, 9.0, 1.6);
      hearthLight.position.set(0, 1.55, -2.0);
      cot.group.add(hearthLight);

      this.shelters.push({
        spec,
        doorX: doorPos.x,
        doorZ: doorPos.z,
        doorOpen: false,
        doorAngle: 0,
        doorCollider,
        rig: cot,
        hearthLight,
      });
    }

    // 4. Two Iconic Windmills (Wooden Lattice Windmill + Farm Wheel Windmill)
    const woodMill = buildWoodenWindmill(this.mats);
    woodMill.group.position.set(-26, groundHeightAt(-26, -34), -34);
    woodMill.group.rotation.y = 0.45;
    this.scene.add(woodMill.group);
    this.woodMillBlades = woodMill.bladesPivot;
    this.cameraOccluders.push(woodMill.group);
    this.circles.push({ id: 'wood_mill', x: -26, z: -34, radius: 3.4 });

    const farmMill = buildFarmWindmill(this.mats);
    farmMill.group.position.set(18, groundHeightAt(18, -28), -28);
    farmMill.group.rotation.y = -0.4;
    this.scene.add(farmMill.group);
    this.farmMillWheel = farmMill.wheelPivot;
    this.circles.push({ id: 'farm_mill', x: 18, z: -28, radius: 1.5 });

    // 5. Watchtower Overlook on the Western Hill
    const tower = new THREE.Group();
    const towerPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.6, 4.0), this.mats.stone);
    towerPlinth.position.y = 0.3;
    towerPlinth.receiveShadow = true;
    tower.add(towerPlinth);
    const towerBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.9, 3.4), this.mats.wood);
    towerBase.position.y = 3.05;
    towerBase.castShadow = true;
    towerBase.receiveShadow = true;
    tower.add(towerBase);
    for (const tx of [-1.72, 1.72]) {
      for (const tz of [-1.72, 1.72]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.2, 0.24), this.mats.darkWood);
        post.position.set(tx, 3.1, tz);
        tower.add(post);
      }
    }
    const towerWalkway = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 4.2), this.mats.darkWood);
    towerWalkway.position.y = 5.55;
    tower.add(towerWalkway);
    const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.25, 4), this.mats.roof);
    towerRoof.position.y = 6.75;
    towerRoof.rotation.y = Math.PI / 4;
    towerRoof.castShadow = true;
    tower.add(towerRoof);
    tower.position.set(-36, groundHeightAt(-36, 10), 10);
    this.scene.add(tower);
    this.cameraOccluders.push(tower);
    this.boxes.push({ id: 'watchtower', x: -36, z: 10, halfW: 1.9, halfD: 1.9 });

    // 6. Market Tents, Wooden Carts, Fences & Pumpkin Clusters
    const tentCoords: Array<[number, number, number]> = [
      [-9.5, 8.2, 0.3],
      [11.5, 9.5, -0.5],
      [27, 17, 0.8],
    ];
    tentCoords.forEach(([tx, tz, rot], idx) => {
      const tent = buildMarketTent(this.mats);
      tent.position.set(tx, groundHeightAt(tx, tz), tz);
      tent.rotation.y = rot;
      this.scene.add(tent);
      this.boxes.push({ id: `tent_${idx}`, x: tx, z: tz, halfW: 1.6, halfD: 1.4, rotationY: rot });
    });

    const cartCoords: Array<[number, number, number]> = [
      [-6.8, 12.0, 0.7],
      [9.0, 14.0, -0.6],
      [-20, -25, 1.1],
      [25, 9, 0.2],
    ];
    cartCoords.forEach(([cx, cz, rot], idx) => {
      const cart = buildWoodenCart(this.mats);
      cart.position.set(cx, groundHeightAt(cx, cz), cz);
      cart.rotation.y = rot;
      this.scene.add(cart);
      this.boxes.push({ id: `cart_${idx}`, x: cx, z: cz, halfW: 1.0, halfD: 1.5, rotationY: rot });
    });

    // Split-rail fences lining the village square paths
    this.scene.add(buildFenceLine(this.mats, -10.5, 4, -4.5, 11, this.boxes, 'fence_sw'));
    this.scene.add(buildFenceLine(this.mats, 6.5, 10.5, 14, 5, this.boxes, 'fence_se'));
    this.scene.add(buildFenceLine(this.mats, 25, -18, 42, -18, this.boxes, 'fence_gy1'));
    this.scene.add(buildFenceLine(this.mats, 25, -34, 42, -34, this.boxes, 'fence_gy2'));

    // Pumpkin clusters around Chapel Square and Pumpkin Hollow
    const pumpkinPatches: Array<[number, number, number]> = [
      [-4.2, 7.2, 4],
      [6.2, 6.8, 3],
      [10.2, 11.2, 5],
      [28.5, 12.0, 6],
      [32.5, 15.5, 5],
      [-22.0, -29.0, 4],
    ];
    pumpkinPatches.forEach(([px, pz, count], pIdx) => {
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + pIdx;
        const dist = 0.55 + (i % 3) * 0.45;
        const x = px + Math.cos(ang) * dist;
        const z = pz + Math.sin(ang) * dist;
        const p = buildPumpkin(this.mats, 0.75 + (i % 3) * 0.25);
        p.position.set(x, groundHeightAt(x, z), z);
        p.rotation.y = ang;
        this.scene.add(p);
      }
    });

    // 7. Sunken Graveyard Headstones & Ritual Altar at (34, y, -26)
    const graveBaseY = groundHeightAt(34, -26);
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.45, 10), this.mats.stone);
    altar.position.set(34, graveBaseY + 0.22, -26);
    altar.receiveShadow = true;
    this.scene.add(altar);

    const altarLight = new THREE.PointLight(0x45b8ff, 2.4, 15, 1.5);
    altarLight.position.set(34, graveBaseY + 2.1, -26);
    this.scene.add(altarLight);

    for (let i = 0; i < 10; i++) {
      const gx = 27 + (i % 5) * 3.4;
      const gz = -21 - Math.floor(i / 5) * 9.5;
      const gy = groundHeightAt(gx, gz);
      const graveGroup = new THREE.Group();
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.42), this.mats.stone);
      plinth.position.y = 0.1;
      graveGroup.add(plinth);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.18, 0.24), this.mats.stone);
      slab.position.y = 0.72;
      slab.castShadow = true;
      graveGroup.add(slab);
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.24, 10), this.mats.stone);
      arch.rotation.x = Math.PI / 2;
      arch.position.y = 1.31;
      graveGroup.add(arch);
      graveGroup.position.set(gx, gy, gz);
      graveGroup.rotation.z = ((i % 3) - 1) * 0.08;
      this.scene.add(graveGroup);
    }

    // 7.5 Low-lying Drifting Ground Mist Layers across village & hollow
    this.mistMat = new THREE.MeshBasicMaterial({
      map: this.textures.mistMap,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mistCoords: Array<[number, number, number]> = [
      [-8, 12, 12],
      [9, 11, 11],
      [0, -14, 14],
      [-16, -2, 12],
      [17, -4, 12],
      [-23, -24, 15],
      [-27, -34, 14],
      [27, -22, 15],
      [35, -27, 16],
      [29, 13, 14],
      [-33, 9, 14],
      [-5, 22, 13],
      [12, 22, 13],
      [-18, -12, 12],
      [18, -18, 13],
      [4, -26, 14],
      [-12, -32, 15],
      [22, 2, 13],
      [34, 6, 14],
      [-32, -12, 14],
    ];
    const mistGeo = new THREE.PlaneGeometry(1, 1);
    mistGeo.rotateX(-Math.PI / 2);
    mistCoords.forEach(([mx, mz, scale], idx) => {
      const m = new THREE.Mesh(mistGeo, this.mistMat);
      m.position.set(mx, groundHeightAt(mx, mz) + 0.45 + (idx % 3) * 0.22, mz);
      m.scale.set(scale, 1, scale * 0.85);
      m.rotation.y = idx * 0.7;
      this.scene.add(m);
      this.mistMeshes.push({
        mesh: m,
        baseX: mx,
        baseZ: mz,
        phase: idx * 0.9,
        speed: 0.22 + (idx % 4) * 0.08,
      });
    });

    // Soft cloud-diffused pale moon halo in upper sky
    this.moonDiscMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34),
      new THREE.MeshBasicMaterial({
        color: 0xd9ecff,
        map: this.textures.mistMap,
        transparent: true,
        opacity: 0.42,
        fog: false,
        depthWrite: false,
      }),
    );
    this.moonDiscMesh.position.set(-34, 44, -98);
    this.moonDiscMesh.lookAt(0, 0, 0);
    this.scene.add(this.moonDiscMesh);

    // 8. Instanced Gnarled Dead Forest & Perimeter Boulders
    buildInstancedForestAndRocks(this.scene, this.mats, this.circles);

    // 9. Sanctuary Braziers (Quest 2)
    const brazierDefs: Array<[string, string, number, number]> = [
      ['braz_chapel', 'Chapel Gate Brazier', -6.8, 3.8],
      ['braz_market', 'Market Crossroad Brazier', 16.5, 5.5],
      ['braz_mill', 'Windmill Trail Brazier', -17.0, -18.5],
    ];
    for (const [id, name, bx, bz] of brazierDefs) {
      const b = buildBrazier(this.mats);
      b.group.position.set(bx, groundHeightAt(bx, bz), bz);
      this.scene.add(b.group);
      this.circles.push({ id, x: bx, z: bz, radius: 0.75 });
      this.braziers.push({
        id,
        name,
        x: bx,
        z: bz,
        lit: false,
        flameMesh: b.flameMesh,
        beaconRing: b.beaconRing,
      });
    }

    // 10. Sacred Bell Shards (Quest 3)
    const shardDefs: Array<[string, string, number, number]> = [
      ['shard_mill', 'Windmill Ridge Shard', -26, -28.5],
      ['shard_pumpkin', 'Pumpkin Hollow Shard', 30, 14],
      ['shard_grave', 'Graveyard Altar Shard', 34, -26],
    ];
    for (const [id, name, sx, sz] of shardDefs) {
      const s = buildBellShard(this.mats);
      s.group.position.set(sx, groundHeightAt(sx, sz), sz);
      this.scene.add(s.group);
      this.shards.push({
        id,
        name,
        x: sx,
        z: sz,
        collected: false,
        group: s.group,
        relicMesh: s.relicMesh,
      });
    }

    // 11. Optional Exploration Lore Scrolls (5 across the valley)
    const loreDefs: Array<[string, string, string, number, number]> = [
      ['lore_1', 'Watchman Ledger', 'The bell cracked at midnight when the fog rolled off the ridge.', -34.5, 13.5],
      ['lore_2', 'Miller Note', 'The sails spin without wind. Shadows gather beneath the grain.', -21, -37],
      ['lore_3', 'Harvest Tithe', 'Every pumpkin left unharvested whispers with the names of the lost.', 33, 18],
      ['lore_4', 'Gravekeeper Oath', 'Only the three shards forged in chapel brass can bind the Warden.', 27, -28],
      ['lore_5', 'Squire Diary', 'Light the braziers first—their warmth weakens the mist creatures.', 11, -13],
    ];
    for (const [id, title, text, lx, lz] of loreDefs) {
      const l = buildLoreScroll(this.mats);
      l.group.position.set(lx, groundHeightAt(lx, lz), lz);
      this.scene.add(l.group);
      this.lores.push({
        id,
        title,
        text,
        x: lx,
        z: lz,
        collected: false,
        group: l.group,
        scrollMesh: l.scrollMesh,
      });
    }

    // 11.5 Crafting Stations (Alchemist Table + Anvil Forges)
    const stationDefs: Array<[string, 'alchemy' | 'anvil', string, number, number, number]> = [
      ['station_alchemy', 'alchemy', 'Sanctuary Alchemist Table', 1.4, 6.8, 0.25],
      ['station_anvil_sq', 'anvil', 'Crossroad Anvil Forge', -10.5, 2.2, 0.6],
      ['station_anvil_mill', 'anvil', 'Windmill Ridge Forge', -21.5, -28.0, -0.4],
    ];
    for (const [id, variant, name, sx, sz, rot] of stationDefs) {
      const st = buildCraftingStation(variant, this.mats);
      st.position.set(sx, groundHeightAt(sx, sz), sz);
      st.rotation.y = rot;
      this.scene.add(st);
      this.boxes.push({ id, x: sx, z: sz, halfW: 1.05, halfD: 0.72, rotationY: rot });
      this.stations.push({ id, variant, name, x: sx, z: sz, group: st });
    }

    // 11.6 Gatherable Resource Nodes (Moonpetal Herbs, Bog Iron Ore, Ironwood Timber)
    const resourceDefs: Array<[string, ResourceKind, string, number, number]> = [
      ['res_h1', 'herb', 'Moonpetal Herb', -7.2, 11.2],
      ['res_h2', 'herb', 'Moonpetal Herb', 13.5, -1.5],
      ['res_h3', 'herb', 'Moonpetal Herb', -20.0, -14.0],
      ['res_h4', 'herb', 'Moonpetal Herb', 26.5, 7.5],
      ['res_h5', 'herb', 'Moonpetal Herb', 29.0, -19.0],
      ['res_o1', 'ore', 'Bog Iron Ore', 10.5, -3.8],
      ['res_o2', 'ore', 'Bog Iron Ore', -15.5, 5.2],
      ['res_o3', 'ore', 'Bog Iron Ore', -31.5, 5.0],
      ['res_o4', 'ore', 'Bog Iron Ore', 31.5, -31.0],
      ['res_o5', 'ore', 'Bog Iron Ore', -29.0, -25.0],
      ['res_w1', 'wood', 'Ironwood Timber', -10.5, -1.8],
      ['res_w2', 'wood', 'Ironwood Timber', 8.5, 16.5],
      ['res_w3', 'wood', 'Ironwood Timber', -18.5, -31.0],
      ['res_w4', 'wood', 'Ironwood Timber', 22.0, 21.0],
      ['res_w5', 'wood', 'Ironwood Timber', -32.0, 15.5],
    ];
    for (const [id, kind, name, rx, rz] of resourceDefs) {
      const nodeGroup = buildResourceNode(kind, this.mats);
      nodeGroup.position.set(rx, groundHeightAt(rx, rz), rz);
      nodeGroup.rotation.y = (rx * 0.7 + rz * 0.3) % (Math.PI * 2);
      this.scene.add(nodeGroup);
      this.resourceNodes.push({
        id,
        kind,
        name,
        x: rx,
        z: rz,
        collected: false,
        respawnTimer: 0,
        group: nodeGroup,
      });
    }

    // 12. Player Character & Dynamic Lantern / Combat VFX Meshes
    this.playerRig = buildPlayerCharacter(this.mats);
    this.scene.add(this.playerRig.group);

    this.playerLanternLight = new THREE.PointLight(0xff9b3d, 3.0, 14, 1.5);
    this.scene.add(this.playerLanternLight);

    this.flareLight = new THREE.PointLight(0xffc966, 0, 18, 1.4);
    this.scene.add(this.flareLight);

    this.flareWaveMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 1.0, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffb84d,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.flareWaveMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.flareWaveMesh);

    this.slashArcMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.52, 1.82, 24, 1, -Math.PI * 0.36, Math.PI * 0.72),
      new THREE.MeshBasicMaterial({
        color: 0xcbeeff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.slashArcMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.slashArcMesh);

    // 13. Enemy Roster (Crawlers, Weavers, and Graveyard Brute + Boss Warden)
    this.spawnInitialEnemies();
  }

  private createEnemy(
    id: string,
    archetype: EnemyArchetype,
    x: number,
    z: number,
    isBoss = false,
  ): EnemyEntity {
    const rig = buildEnemyModel(archetype, this.mats);
    const y = groundHeightAt(x, z);
    rig.group.position.set(x, y, z);
    if (isBoss) rig.group.scale.setScalar(1.32);
    this.scene.add(rig.group);

    const maxHp = isBoss ? 220 : archetype === 'brute' ? 115 : archetype === 'weaver' ? 55 : 48;
    const speed = isBoss ? 4.3 : archetype === 'brute' ? 3.3 : archetype === 'weaver' ? 3.5 : 5.1;
    const damage = isBoss ? 26 : archetype === 'brute' ? 20 : archetype === 'weaver' ? 14 : 11;

    return {
      id,
      archetype,
      isBoss,
      name: isBoss
        ? 'The Hollow Warden'
        : archetype === 'brute'
        ? 'Cursed Revenant'
        : archetype === 'weaver'
        ? 'Wisp Weaver'
        : 'Fog Crawler',
      rig,
      x,
      y,
      z,
      vx: 0,
      vz: 0,
      yaw: 0,
      homeX: x,
      homeZ: z,
      hp: maxHp,
      maxHp,
      speed,
      aggroRadius: isBoss ? 24 : 15,
      attackRange: archetype === 'weaver' ? 9.5 : isBoss ? 3.1 : 2.1,
      damage,
      state: 'idle',
      stateTimer: 0,
      flashTimer: 0,
      koTimer: 0,
      cooldown: 0.4,
      respawnTimer: 0,
    };
  }

  private spawnInitialEnemies(): void {
    const specs: Array<[string, EnemyArchetype, number, number]> = [
      ['e_c1', 'crawler', -12, -14],
      ['e_c2', 'crawler', 14, 12],
      ['e_c3', 'crawler', -24, -22],
      ['e_c4', 'crawler', 25, 18],
      ['e_w1', 'weaver', -28, -32],
      ['e_w2', 'weaver', 32, 11],
      ['e_w3', 'weaver', 31, -22],
      ['e_b1', 'brute', 35, -29],
    ];
    for (const [id, arch, x, z] of specs) {
      this.enemies.push(this.createEnemy(id, arch, x, z, false));
    }
  }

  private initParticles(): void {
    const geo = new THREE.OctahedronGeometry(0.11, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 1,
        color: new THREE.Color(0xffffff),
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);
  }

  private initRainSystem(): void {
    const geo = new THREE.BoxGeometry(0.025, 0.75, 0.025);
    geo.rotateZ(0.14);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaad4f5,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.rainMesh = new THREE.InstancedMesh(geo, mat, RAIN_COUNT);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;

    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainDrops.push({
        x: (Math.random() - 0.5) * 34,
        y: Math.random() * 16,
        z: (Math.random() - 0.5) * 34,
        speed: 19 + Math.random() * 8,
      });
    }
    this.scene.add(this.rainMesh);
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    colorHex: number,
    speed = 3.2,
    upBias = 2.0,
    scale = 1.0,
    life = 0.55,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_COUNT;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.3;
      p.y = y + (Math.random() - 0.5) * 0.3;
      p.z = z + (Math.random() - 0.5) * 0.3;
      const a = Math.random() * Math.PI * 2;
      const sp = (0.3 + Math.random() * 0.7) * speed;
      p.vx = Math.cos(a) * sp;
      p.vy = upBias * (0.4 + Math.random() * 0.8);
      p.vz = Math.sin(a) * sp;
      p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.life = p.maxLife;
      p.scale = scale * (0.7 + Math.random() * 0.6);
      p.color.setHex(colorHex);
    }
  }

  private initProjectiles(): void {
    const geo = new THREE.SphereGeometry(0.24, 8, 8);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x6ce5ff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vz: 0,
        life: 0,
        damage: 12,
        mesh,
      });
    }
  }

  private spawnProjectile(x: number, y: number, z: number, dirX: number, dirZ: number, damage: number): void {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = dirX * 11.5;
    slot.vz = dirZ * 11.5;
    slot.life = 2.4;
    slot.damage = damage;
    slot.mesh.position.set(x, y, z);
    slot.mesh.visible = true;
  }

  public resetWorldState(targetScreen: GameScreenState): void {
    this.screen = targetScreen;
    document.body.dataset.state = targetScreen;
    this.outcome = 'none';
    this.quests = createInitialQuests();
    this.craftState = createInitialCraftState();
    this.craftingOpen = false;
    this.craftedCount = 0;
    this.codex = createInitialCodexState();
    this.timeOfDay = 20.5;
    this.weather = 'fog';
    this.weatherTimer = 38;
    this.lightningTimer = 7;
    this.lightningFlash = 0;
    this.elapsedSec = 0;
    this.banished = 0;
    this.loreFound = 0;
    this.damageTaken = 0;
    this.bellTolled = false;
    this.bellRingTimer = 0;
    this.hitstopTimer = 0;
    this.trauma = 0;
    this.endBeatTimer = 0;

    // Reset player on open cobblestone path facing Elder Mirek & Chapel!
    this.px = 0;
    this.pz = 16;
    this.py = groundHeightAt(this.px, this.pz);
    this.pvx = 0;
    this.pvz = 0;
    this.pYaw = Math.PI;
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.oil = this.maxOil;
    this.applyGearVisuals();
    this.invulnTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.flareCooldown = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.camYaw = 0;
    this.camPitch = 0.42;

    this.playerRig.group.position.set(this.px, this.py, this.pz);
    this.playerRig.group.rotation.y = this.pYaw;

    // Reset Fog-of-War exploration around player starting position
    this.exploredCells.clear();
    const startEnv = computeEnvironmentEffects(this.timeOfDay, this.weather);
    revealFogAround(this.exploredCells, this.px, this.pz, getMinimapSightRadius(startEnv.visibilityRange));

    // Reset Elder Mirek to schedule waypoint
    const elderWp = getElderScheduleWaypoint(this.timeOfDay);
    this.elderX = elderWp.x;
    this.elderZ = elderWp.z;
    this.elderGroup.position.set(this.elderX, groundHeightAt(this.elderX, this.elderZ), this.elderZ);
    const elderCol = this.circles.find((c) => c.id === 'elder');
    if (elderCol) {
      elderCol.x = this.elderX;
      elderCol.z = this.elderZ;
    }

    // Reset braziers
    for (const b of this.braziers) {
      b.lit = false;
      b.flameMesh.visible = false;
      (b.beaconRing.material as THREE.MeshBasicMaterial).color.setHex(0x6ba6ff);
      (b.beaconRing.material as THREE.MeshBasicMaterial).opacity = 0.45;
    }

    // Reset shards
    for (const s of this.shards) {
      s.collected = false;
      s.group.visible = true;
    }

    // Reset lore
    for (const l of this.lores) {
      l.collected = false;
      l.group.visible = true;
    }

    // Reset resource nodes
    for (const r of this.resourceNodes) {
      r.collected = false;
      r.respawnTimer = 0;
      r.group.visible = true;
    }

    // Reset shelter cottages & doors
    this.activeShelter = null;
    for (const sh of this.shelters) {
      sh.doorOpen = false;
      sh.doorAngle = 0;
      sh.doorCollider.disabled = false;
      sh.rig.doorPivot.rotation.y = 0;
      sh.rig.roofGroup.visible = true;
    }

    // Reset enemies (and remove boss if previously spawned)
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.enemies = this.enemies.filter((e) => {
      if (e.isBoss) {
        this.scene.remove(e.rig.group);
        return false;
      }
      e.x = e.homeX;
      e.z = e.homeZ;
      e.y = groundHeightAt(e.x, e.z);
      e.hp = e.maxHp;
      e.state = 'idle';
      e.stateTimer = 0;
      e.cooldown = 0.5;
      e.respawnTimer = 0;
      e.rig.group.visible = true;
      e.rig.group.position.set(e.x, e.y, e.z);
      e.rig.bodyGroup.rotation.set(0, 0, 0);
      e.rig.bodyGroup.scale.setScalar(1);
      (e.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
      return true;
    });

    for (const proj of this.projectiles) {
      proj.active = false;
      proj.mesh.visible = false;
    }

    this.activeDialogue = null;
    this.activeToast = null;
    this.nearestPrompt = null;
    this.nearestAction = null;

    if (targetScreen === 'playing') {
      this.camYaw = 0.16;
      this.camPos.set(1.5, this.py + 4.4, this.pz + 9.2);
      this.camLook.set(0, this.py + 2.2, 4);
    } else {
      this.audio.setAmbienceActive(false);
    }

    this.updateEnvironmentVisuals(1.0);
    this.emitHud();
  }

  public startGame(): void {
    this.audio.unlock();
    if (this.screen === 'gameover') {
      this.resetWorldState('playing');
      return;
    }
    this.screen = 'playing';
    document.body.dataset.state = 'playing';
    this.keysHeld.clear();
    this.camYaw = 0.16;
    this.camPos.set(this.px + 1.5, this.py + 4.4, this.pz + 9.2);
    this.camLook.set(this.px - 0.5, this.py + 2.2, this.pz - 6);
    this.audio.setAmbienceActive(true, this.weather, getDayPhase(this.timeOfDay));
    this.showToast('Speak with Elder Mirek or gather herbs & ore to craft gear.');
    this.emitHud();
  }

  public togglePause(): void {
    if (this.craftingOpen) {
      this.closeCrafting();
      return;
    }
    if (this.screen === 'playing') {
      this.screen = 'paused';
      document.body.dataset.state = 'paused';
      this.keysHeld.clear();
      this.audio.setAmbienceActive(false);
      this.emitHud();
    } else if (this.screen === 'paused') {
      this.screen = 'playing';
      document.body.dataset.state = 'playing';
      this.keysHeld.clear();
      this.audio.setAmbienceActive(true, this.weather, getDayPhase(this.timeOfDay));
      this.emitHud();
    }
  }

  public openCrafting(): void {
    if (this.screen !== 'playing') return;
    this.audio.unlock();
    this.craftingOpen = true;
    this.keysHeld.clear();
    this.joystick = { x: 0, y: 0 };
    this.emitHud();
  }

  public closeCrafting(): void {
    if (!this.craftingOpen) return;
    this.craftingOpen = false;
    this.keysHeld.clear();
    this.emitHud();
  }

  public craftItem(recipeId: CraftRecipeId): void {
    if (this.screen !== 'playing') return;
    this.audio.unlock();
    const { atStation, nearestStation } = this.getStationProximity();
    if (!atStation || !nearestStation) {
      this.showToast('Move close to an Alchemist Table or Anvil Forge to craft!');
      this.emitHud();
      return;
    }
    const res = executeCraftRecipe(this.craftState, recipeId);
    if (!res.crafted) {
      this.showToast(res.message);
      this.emitHud();
      return;
    }
    const prevArmor = this.craftState.armorTier;
    this.craftState = res.nextState;
    this.craftedCount += 1;

    const mods = getCombatModifiers(this.craftState.weaponTier, this.craftState.armorTier);
    const prevMaxHp = this.maxHp;
    this.maxHp = mods.maxHp;
    if (this.craftState.armorTier > prevArmor) {
      this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - prevMaxHp) + 20);
    }
    this.applyGearVisuals();

    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    this.audio.playCraft(recipe?.category !== 'potion');
    this.spawnParticles(
      nearestStation.x,
      groundHeightAt(nearestStation.x, nearestStation.z) + 1.4,
      nearestStation.z,
      18,
      recipe?.category === 'potion' ? 0x6ce5ff : 0xffbe55,
      3.8,
      2.6,
      1.1,
      0.65,
    );
    this.showToast(res.message);
    this.emitHud();
  }

  public usePotion(kind: 'vitality' | 'sunoil'): void {
    if (this.screen !== 'playing' || this.craftingOpen) return;
    this.audio.unlock();
    if (kind === 'vitality') {
      if (this.craftState.potions.vitality <= 0) {
        this.showToast('No Vitality Tonics left! Craft more at a station.');
        this.emitHud();
        return;
      }
      if (this.hp >= this.maxHp) {
        this.showToast('Vitality is already full.');
        this.emitHud();
        return;
      }
      this.craftState = {
        ...this.craftState,
        potions: { ...this.craftState.potions, vitality: this.craftState.potions.vitality - 1 },
      };
      this.hp = Math.min(this.maxHp, this.hp + 45);
      this.audio.playPotionUse();
      this.spawnParticles(this.px, this.py + 1.1, this.pz, 14, 0xff5a52, 2.8, 2.4, 0.95, 0.55);
      this.showToast('Drank Crimson Vitality Tonic (+45 HP)');
    } else {
      if (this.craftState.potions.sunoil <= 0) {
        this.showToast('No Sun-Oil Flasks left! Craft more at a station.');
        this.emitHud();
        return;
      }
      this.craftState = {
        ...this.craftState,
        potions: { ...this.craftState.potions, sunoil: this.craftState.potions.sunoil - 1 },
      };
      this.oil = Math.min(this.maxOil, this.oil + 60);
      this.stamina = Math.min(this.maxStamina, this.stamina + 40);
      this.audio.playPotionUse();
      this.spawnParticles(this.px, this.py + 1.1, this.pz, 14, 0xffbe55, 2.8, 2.4, 0.95, 0.55);
      this.showToast('Used Sun-Oil Flask (+60 Oil & +40 Stamina)');
    }
    this.emitHud();
  }

  private applyGearVisuals(): void {
    if (!this.playerRig) return;
    if (this.craftState.weaponTier === 3) {
      this.playerRig.bladeMat.color.setHex(0xffe194);
      this.playerRig.bladeMat.emissive.setHex(0xc97b18);
      this.playerRig.bladeMat.emissiveIntensity = 0.65;
    } else if (this.craftState.weaponTier === 2) {
      this.playerRig.bladeMat.color.setHex(0xcceeff);
      this.playerRig.bladeMat.emissive.setHex(0x286a99);
      this.playerRig.bladeMat.emissiveIntensity = 0.35;
    } else {
      this.playerRig.bladeMat.color.setHex(0xdce6ee);
      this.playerRig.bladeMat.emissive.setHex(0x000000);
      this.playerRig.bladeMat.emissiveIntensity = 0;
    }

    if (this.craftState.armorTier === 3) {
      this.playerRig.capeMat.color.setHex(0x6e2028);
      this.playerRig.capeMat.emissive.setHex(0x3a1208);
      this.playerRig.capeMat.emissiveIntensity = 0.25;
    } else if (this.craftState.armorTier === 2) {
      this.playerRig.capeMat.color.setHex(0x28434a);
      this.playerRig.capeMat.emissive.setHex(0x000000);
      this.playerRig.capeMat.emissiveIntensity = 0;
    } else {
      this.playerRig.capeMat.color.setHex(0x3b1b1e);
      this.playerRig.capeMat.emissive.setHex(0x000000);
      this.playerRig.capeMat.emissiveIntensity = 0;
    }
  }

  private getStationProximity(): {
    atStation: boolean;
    nearestStation: CraftingStationEntity | null;
    dist: number;
  } {
    let best: CraftingStationEntity | null = null;
    let bestDist = Infinity;
    for (const s of this.stations) {
      const d = Math.hypot(this.px - s.x, this.pz - s.z);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return {
      atStation: bestDist <= 3.8,
      nearestStation: best,
      dist: Math.round(bestDist),
    };
  }

  public returnToTitle(): void {
    this.resetWorldState('title');
  }

  public toggleMute(): boolean {
    const m = this.audio.toggleMute();
    this.emitHud();
    return m;
  }

  public setJoystick(x: number, y: number): void {
    this.joystick.x = Math.max(-1, Math.min(1, x));
    this.joystick.y = Math.max(-1, Math.min(1, y));
  }

  public triggerSlash(): void {
    if (this.screen !== 'playing' || this.craftingOpen) return;
    this.audio.unlock();
    this.bufferedAttack = 0.14;
  }

  public triggerFlare(): void {
    if (this.screen !== 'playing' || this.craftingOpen) return;
    this.audio.unlock();
    this.bufferedFlare = 0.14;
  }

  public triggerDash(): void {
    if (this.screen !== 'playing' || this.craftingOpen) return;
    this.audio.unlock();
    this.bufferedDash = 0.14;
  }

  public triggerInteract(): void {
    if (this.screen !== 'playing' || this.craftingOpen) return;
    this.audio.unlock();
    this.bufferedInteract = 0.14;
  }

  public dismissDialogue(): void {
    this.activeDialogue = null;
    this.emitHud();
  }

  private showToast(text: string): void {
    this.activeToast = { text, timer: 3.4 };
  }

  private bindEvents(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) {
        this.keysHeld.add(e.code);
        return;
      }

      if (this.screen === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        this.startGame();
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.screen === 'playing' || this.screen === 'paused') {
          e.preventDefault();
          this.togglePause();
          return;
        }
      }

      if (e.code === 'KeyB' && this.screen === 'playing') {
        e.preventDefault();
        if (this.craftingOpen) this.closeCrafting();
        else this.openCrafting();
        return;
      }

      if (e.code === 'KeyM') {
        this.toggleMute();
        return;
      }

      if (this.screen !== 'playing' || this.craftingOpen) return;

      this.keysHeld.add(e.code);
      if (e.code === 'Space' || e.code === 'ShiftLeft') {
        e.preventDefault();
        this.triggerDash();
      } else if (e.code === 'KeyJ') {
        this.triggerSlash();
      } else if (e.code === 'KeyK') {
        this.triggerFlare();
      } else if (e.code === 'KeyE' || e.code === 'KeyF') {
        this.triggerInteract();
      } else if (e.code === 'Digit1') {
        this.usePotion('vitality');
      } else if (e.code === 'Digit2') {
        this.usePotion('sunoil');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysHeld.delete(e.code);
    };

    const clearHeld = () => {
      this.keysHeld.clear();
      this.joystick.x = 0;
      this.joystick.y = 0;
      this.dragPointerId = null;
    };

    const canvas = this.renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      if (this.screen !== 'playing') return;
      this.audio.unlock();
      if (e.button === 2) {
        this.triggerFlare();
        return;
      }
      this.dragPointerId = e.pointerId;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.dragPointerId !== e.pointerId || this.screen !== 'playing') return;
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      this.camYaw -= dx * 0.0065;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0045, 0.18, 1.05);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.dragPointerId === e.pointerId) {
        this.dragPointerId = null;
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeld);
    document.addEventListener('visibilitychange', clearHeld);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);

    this.resizeObserver = new ResizeObserver(() => {
      if (this.disposed) return;
      const w = Math.max(1, this.container.clientWidth);
      const h = Math.max(1, this.container.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.render(this.scene, this.camera);
    });
    this.resizeObserver.observe(this.container);

    this.cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeld);
      document.removeEventListener('visibilitychange', clearHeld);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      this.resizeObserver?.disconnect();
    };
  }

  private cleanupListeners: () => void = () => {};

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (this.disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            this.frameId = window.setTimeout(() => this.tick(), 16);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
      } else {
        this.frameId = window.setTimeout(() => this.tick(), 16);
      }
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick(): void {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const maxDt = this.isSoftwareGl ? 0.1 : 0.05;
    const dt = Math.min(Math.max(rawDt, 0.001), maxDt);

    this.updateAmbientAnimations(dt, now * 0.001);

    if (this.screen === 'title') {
      this.updateTitleTour(dt);
    } else if (this.screen === 'playing') {
      if (this.endBeatTimer > 0) {
        this.endBeatTimer -= dt;
        if (this.endBeatTimer <= 0) {
          this.finishRun('defeat');
        }
      } else if (!this.craftingOpen) {
        // Hitstop freezes simulation physics briefly on heavy strikes while camera shake & VFX tick
        if (this.hitstopTimer > 0) {
          this.hitstopTimer -= dt;
        } else {
          this.updateGameplay(dt);
        }
      }
      this.updateCamera(dt);
      this.updateParticles(dt);
    } else if (this.screen === 'paused' || this.screen === 'gameover') {
      this.updateParticles(dt * 0.25);
    }

    this.renderer.render(this.scene, this.camera);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.1) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    this.scheduleNextTick();
  }

  private updateAmbientAnimations(dt: number, elapsed: number): void {
    const windSpeedMult =
      this.weather === 'storm' ? 2.25 : this.weather === 'rain' ? 1.45 : this.weather === 'fog' ? 0.85 : 1.0;
    this.woodMillBlades.rotation.z -= dt * 0.42 * windSpeedMult;
    this.farmMillWheel.rotation.z += dt * 1.15 * windSpeedMult;

    // Flickering campfire, shelter hearths & lantern warmth
    const flicker = Math.sin(elapsed * 13) * 0.14 + Math.cos(elapsed * 21) * 0.1;
    this.campfireFlame.scale.set(1 + flicker * 0.2, 1 + flicker * 0.45, 1 + flicker * 0.2);
    this.campfireLight.intensity = 4.5 + flicker * 1.6;
    this.playerLanternLight.intensity = 2.9 + Math.sin(elapsed * 9) * 0.25;
    for (const sh of this.shelters) {
      sh.rig.hearthFlame.scale.set(1 + flicker * 0.16, 1 + flicker * 0.35, 1 + flicker * 0.16);
      sh.hearthLight.intensity = (sh === this.activeShelter ? 3.2 : 1.5) + flicker * 0.7;
    }

    // Swinging Chapel Great Bell
    if (this.bellRingTimer > 0) {
      this.bellRingTimer = Math.max(0, this.bellRingTimer - dt);
      this.chapelBellPivot.rotation.z = Math.sin(elapsed * 10) * 0.48 * Math.min(1, this.bellRingTimer);
    } else {
      this.chapelBellPivot.rotation.z = Math.sin(elapsed * 1.1) * 0.04;
    }

    // Floating shards & lore scrolls
    for (const s of this.shards) {
      if (!s.collected) {
        s.relicMesh.rotation.y += dt * 1.6;
        s.relicMesh.position.y = 1.55 + Math.sin(elapsed * 2.4) * 0.16;
      }
    }
    for (const l of this.lores) {
      if (!l.collected) {
        l.scrollMesh.rotation.y += dt * 1.2;
        l.scrollMesh.position.y = 1.25 + Math.sin(elapsed * 2.1 + l.x) * 0.1;
      }
    }

    // Subtle mist motes in title & playing
    if (Math.random() < (this.isSoftwareGl ? 0.15 : 0.35)) {
      const rx = this.px + (Math.random() - 0.5) * 18;
      const rz = this.pz + (Math.random() - 0.5) * 18;
      this.spawnParticles(rx, groundHeightAt(rx, rz) + 0.4, rz, 1, 0x628eb0, 0.35, 0.65, 0.7, 1.4);
    }
    // Campfire embers
    if (Math.random() < 0.35) {
      this.spawnParticles(3.8, groundHeightAt(3.8, 4.5) + 0.7, 4.5, 1, 0xff8c2b, 0.5, 1.8, 0.65, 0.9);
    }

    // Animated 3D rain streaks during rain & storm
    const isRaining = this.weather === 'rain' || this.weather === 'storm';
    this.rainMesh.visible = isRaining;
    if (isRaining) {
      const speedBoost = this.weather === 'storm' ? 1.4 : 1.0;
      const cx = this.screen === 'title' ? 0 : this.px;
      const cz = this.screen === 'title' ? 0 : this.pz;
      for (let i = 0; i < RAIN_COUNT; i++) {
        const drop = this.rainDrops[i];
        drop.y -= drop.speed * speedBoost * dt;
        drop.x -= 2.2 * speedBoost * dt;
        if (drop.y < -1) {
          drop.y = 14 + Math.random() * 4;
          drop.x = (Math.random() - 0.5) * 34;
          drop.z = (Math.random() - 0.5) * 34;
        }
        const dropX = cx + drop.x;
        const dropZ = cz + drop.z;
        const insideRoof =
          this.activeShelter !== null && isPointInsideShelter(dropX, dropZ, this.activeShelter.spec);
        _dummy.position.set(dropX, this.py + drop.y, dropZ);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(
          insideRoof ? 0.001 : 1,
          insideRoof ? 0.001 : this.weather === 'storm' ? 1.35 : 1.0,
          insideRoof ? 0.001 : 1,
        );
        _dummy.updateMatrix();
        this.rainMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.rainMesh.instanceMatrix.needsUpdate = true;
    }

    // Gentle drift of low-lying ground mist wisps
    for (const m of this.mistMeshes) {
      const driftX = Math.sin(elapsed * m.speed + m.phase) * 2.2;
      const driftZ = Math.cos(elapsed * m.speed * 0.8 + m.phase) * 1.6;
      m.mesh.position.x = m.baseX + driftX;
      m.mesh.position.z = m.baseZ + driftZ;
      m.mesh.rotation.y += dt * 0.04;
    }
  }

  private updateTitleTour(dt: number): void {
    this.titleOrbitAngle += dt * 0.12;
    const radius = 19.5;
    const tx = Math.sin(this.titleOrbitAngle) * radius;
    const tz = Math.cos(this.titleOrbitAngle) * radius + 2;
    const ty = groundHeightAt(tx, tz) + 6.4 + Math.sin(this.titleOrbitAngle * 0.7) * 0.9;
    this.camera.position.set(tx, ty, tz);
    this.camera.lookAt(0, 4.2, -3.5);
  }

  private updateGameplay(dt: number): void {
    this.elapsedSec += dt;

    // Advance Day/Night cycle & Dynamic Weather + Elder Mirek Schedule
    this.timeOfDay = (this.timeOfDay + dt * 0.12) % 24;
    const liveDayPhase = getDayPhase(this.timeOfDay);
    const activeEnemyPositions = this.enemies
      .filter((e) => e.hp > 0 && e.rig.group.visible)
      .map((e) => ({ x: e.x, z: e.z }));

    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 38;
      const nextIdx = (WEATHER_SEQUENCE.indexOf(this.weather) + 1) % WEATHER_SEQUENCE.length;
      this.weather = WEATHER_SEQUENCE[nextIdx];
      this.audio.triggerWeatherTransitionCue(
        this.weather,
        liveDayPhase,
        this.px,
        this.pz,
        activeEnemyPositions,
      );
      const label =
        this.weather === 'storm'
          ? 'A violent thunderstorm sweeps across Ashhollow!'
          : this.weather === 'rain'
          ? 'Cold rain begins falling over the valley.'
          : this.weather === 'fog'
          ? 'Thick cursed mist rolls into the hollow.'
          : 'The skies clear over Ashhollow.';
      this.showToast(label);
    }

    if (this.weather === 'storm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7 + Math.random() * 7;
        this.lightningFlash = 1.0;
        const strikeAngle = Math.random() * Math.PI * 2;
        const strikeDist = 26 + Math.random() * 20;
        this.audio.playSpatialThunder(
          this.px + Math.cos(strikeAngle) * strikeDist,
          22,
          this.pz + Math.sin(strikeAngle) * strikeDist,
        );
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
    }

    // Update 3D spatial audio listener & weather-driven atmospheric sound cues
    _v3.copy(this.camLook).sub(this.camPos);
    if (_v3.lengthSq() > 0.0001) {
      _v3.normalize();
    } else {
      _v3.set(0, 0, -1);
    }
    this.audio.updateSpatialAudio(dt, {
      weather: this.weather,
      dayPhase: liveDayPhase,
      listenerX: this.px,
      listenerY: this.py + 1.65,
      listenerZ: this.pz,
      forwardX: _v3.x,
      forwardY: _v3.y * 0.25,
      forwardZ: _v3.z,
      playerX: this.px,
      playerZ: this.pz,
      enemyPositions: activeEnemyPositions,
    });

    this.updateEnvironmentVisuals(dt);
    this.updateElderSchedule(dt);
    this.updateResourceRespawns(dt);
    const liveEnv = computeEnvironmentEffects(this.timeOfDay, this.weather);
    revealFogAround(this.exploredCells, this.px, this.pz, getMinimapSightRadius(liveEnv.visibilityRange));

    // Timers & cooldowns
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.flareCooldown > 0) this.flareCooldown -= dt;
    if (this.bufferedDash > 0) this.bufferedDash -= dt;
    if (this.bufferedAttack > 0) this.bufferedAttack -= dt;
    if (this.bufferedInteract > 0) this.bufferedInteract -= dt;
    if (this.bufferedFlare > 0) this.bufferedFlare -= dt;
    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - dt * 1.9);

    if (this.activeToast) {
      this.activeToast.timer -= dt;
      if (this.activeToast.timer <= 0) this.activeToast = null;
    }
    if (this.activeDialogue) {
      this.activeDialogue.timer -= dt;
      if (this.activeDialogue.timer <= 0) this.activeDialogue = null;
    }

    // Q/E keyboard camera orbit
    if (this.keysHeld.has('KeyQ')) this.camYaw += dt * 2.1;
    if (this.keysHeld.has('KeyR') || this.keysHeld.has('KeyC')) this.camYaw -= dt * 2.1;

    // Stamina & Lantern Oil natural recovery (faster near campfire or inside a shelter!)
    const nearCamp = Math.hypot(this.px - 3.8, this.pz - 4.5) < 5.0;
    const isSheltered = Boolean(this.activeShelter);
    const closedDoorBonus = this.activeShelter && !this.activeShelter.doorOpen ? 1.5 : 1.0;
    this.stamina = Math.min(
      this.maxStamina,
      this.stamina + dt * (this.dashTimer > 0 ? 0 : isSheltered ? 38 : 28),
    );
    this.oil = Math.min(
      this.maxOil,
      this.oil + dt * (nearCamp ? 24 : isSheltered ? 16 : 5.5),
    );
    if ((nearCamp || isSheltered) && this.hp < this.maxHp) {
      const healRate = nearCamp ? 5 : 4.5 * closedDoorBonus;
      this.hp = Math.min(this.maxHp, this.hp + dt * healRate);
    }

    // Input movement vector in camera-relative XZ plane
    let moveX = this.joystick.x;
    let moveZ = this.joystick.y;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) moveZ -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) moveZ += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveX += 1;

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 1) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    const cosY = Math.cos(this.camYaw);
    const sinY = Math.sin(this.camYaw);
    const worldDirX = moveX * cosY + moveZ * sinY;
    const worldDirZ = -moveX * sinY + moveZ * cosY;

    // Trigger Dash
    if (this.bufferedDash > 0 && this.dashCooldown <= 0 && this.stamina >= 25) {
      this.bufferedDash = 0;
      this.stamina -= 25;
      this.dashTimer = 0.19;
      this.dashCooldown = 0.55;
      this.invulnTimer = 0.28;
      if (inputLen > 0.15) {
        const dl = Math.hypot(worldDirX, worldDirZ) || 1;
        this.dashDirX = worldDirX / dl;
        this.dashDirZ = worldDirZ / dl;
      } else {
        this.dashDirX = Math.sin(this.pYaw);
        this.dashDirZ = Math.cos(this.pYaw);
      }
      this.squashX = 0.8;
      this.squashY = 1.24;
      this.audio.playDash();
      this.spawnParticles(this.px, this.py + 0.4, this.pz, 8, 0x89b4d4, 2.5, 0.8, 0.9, 0.38);
    }

    // Trigger Silver Blade Slash
    if (this.bufferedAttack > 0 && this.attackCooldown <= 0 && this.dashTimer <= 0) {
      this.bufferedAttack = 0;
      this.attackTimer = 0.22;
      this.attackCooldown = 0.34;
      this.attackDidHit = false;
      this.comboIndex = (this.comboIndex + 1) % 3;
      this.audio.playSlash(this.comboIndex);
    }

    // Trigger Lantern Flare
    if (this.bufferedFlare > 0 && this.flareCooldown <= 0 && this.oil >= 30) {
      this.bufferedFlare = 0;
      this.executeLanternFlare();
    }

    // Movement integration
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.pvx = this.dashDirX * 16.5;
      this.pvz = this.dashDirZ * 16.5;
      this.pYaw = Math.atan2(this.dashDirX, this.dashDirZ);
    } else {
      const targetSpeed = inputLen > 0.05 ? 7.6 * Math.min(1, inputLen) : 0;
      const tvx = worldDirX * targetSpeed;
      const tvz = worldDirZ * targetSpeed;
      const accel = 1 - Math.exp(-14 * dt);
      this.pvx += (tvx - this.pvx) * accel;
      this.pvz += (tvz - this.pvz) * accel;
      if (inputLen > 0.12) {
        const targetYaw = Math.atan2(worldDirX, worldDirZ);
        let diff = targetYaw - this.pYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.pYaw += diff * (1 - Math.exp(-15 * dt));
      }
    }

    const nextPos = resolveWorldCollisions(
      this.px + this.pvx * dt,
      this.pz + this.pvz * dt,
      0.55,
      this.circles,
      this.boxes,
    );
    const movedDist = Math.hypot(nextPos.x - this.px, nextPos.z - this.pz);
    this.px = nextPos.x;
    this.pz = nextPos.z;

    // Detect shelter entry/exit, animate hinged house doors, and handle cutaway roof + floor step-up
    let enteredShelter: ShelterEntity | null = null;
    let floorOffset = 0;
    const doorLerp = 1 - Math.exp(-9 * dt);
    for (const sh of this.shelters) {
      const targetAngle = sh.doorOpen ? 1.65 : 0;
      sh.doorAngle += (targetAngle - sh.doorAngle) * doorLerp;
      sh.rig.doorPivot.rotation.y = sh.doorAngle;

      if (isPointInsideShelter(this.px, this.pz, sh.spec)) {
        enteredShelter = sh;
      }
      const off = getShelterFloorOffset(this.px, this.pz, sh.spec);
      if (off > floorOffset) floorOffset = off;
    }
    if (enteredShelter !== this.activeShelter) {
      this.activeShelter = enteredShelter;
      if (enteredShelter) {
        this.showToast(`Sheltered inside ${enteredShelter.spec.name}`);
      }
    }
    for (const sh of this.shelters) {
      sh.rig.roofGroup.visible = sh !== this.activeShelter;
    }

    this.py = groundHeightAt(this.px, this.pz) + floorOffset;

    // Distance-synced walk gait & footsteps
    if (movedDist > 0.002 && this.dashTimer <= 0) {
      this.walkPhase += movedDist * 2.5;
      this.stepAccum += movedDist;
      if (this.stepAccum >= 1.55) {
        this.stepAccum = 0;
        this.audio.playFootstep(roadMaskAt(this.px, this.pz) > 0.35);
      }
    }

    // Exponentially damp squash-stretch back to 1
    this.squashX += (1 - this.squashX) * (1 - Math.exp(-12 * dt));
    this.squashY += (1 - this.squashY) * (1 - Math.exp(-12 * dt));

    // Update Player Rig transforms & attack arc
    this.playerRig.group.position.set(this.px, this.py, this.pz);
    this.playerRig.group.rotation.y = this.pYaw;
    this.playerRig.bodyPivot.scale.set(this.squashX, this.squashY, this.squashX);
    const speedRatio = Math.min(1, Math.hypot(this.pvx, this.pvz) / 7.5);
    this.playerRig.leftLeg.rotation.x = Math.sin(this.walkPhase) * 0.55 * speedRatio;
    this.playerRig.rightLeg.rotation.x = -Math.sin(this.walkPhase) * 0.55 * speedRatio;
    this.playerRig.lanternArm.rotation.x = -0.35 + Math.cos(this.walkPhase) * 0.14 * speedRatio;

    // Lantern light position
    this.playerLanternLight.position.set(
      this.px - Math.cos(this.pYaw) * 0.5,
      this.py + 1.45,
      this.pz + Math.sin(this.pYaw) * 0.5,
    );

    // Attack swing animation & active hit frames
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      const t = 1 - this.attackTimer / 0.22;
      const swingDir = this.comboIndex % 2 === 0 ? 1 : -1;
      this.playerRig.swordArm.rotation.x = -1.15;
      this.playerRig.swordArm.rotation.y = swingDir * (-1.2 + t * 2.4);

      this.slashArcMesh.position.set(this.px, this.py + 1.05, this.pz);
      this.slashArcMesh.rotation.z = -this.pYaw + Math.PI / 2;
      (this.slashArcMesh.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.42;

      if (t > 0.2 && t < 0.75 && !this.attackDidHit) {
        this.attackDidHit = true;
        this.performMeleeHitCheck();
      }
    } else {
      this.playerRig.swordArm.rotation.x = -0.15;
      this.playerRig.swordArm.rotation.y = 0;
      (this.slashArcMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // Lantern Flare decay
    if (this.flareLight.intensity > 0.05) {
      this.flareLight.intensity *= Math.exp(-5.5 * dt);
      const waveMat = this.flareWaveMesh.material as THREE.MeshBasicMaterial;
      waveMat.opacity = Math.max(0, waveMat.opacity - dt * 1.9);
      this.flareWaveMesh.scale.addScalar(dt * 11.5);
    } else {
      this.flareLight.intensity = 0;
      (this.flareWaveMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // Nearby interactables & contextual prompt
    this.updateInteractables();
    if (this.bufferedInteract > 0) {
      this.bufferedInteract = 0;
      if (this.nearestAction) {
        this.nearestAction();
      }
    }

    // Update enemies & projectiles
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
  }

  private performMeleeHitCheck(): void {
    const fwdX = Math.sin(this.pYaw);
    const fwdZ = Math.cos(this.pYaw);
    let landed = false;

    const combatMods = getCombatModifiers(this.craftState.weaponTier, this.craftState.armorTier);
    for (const e of this.enemies) {
      if (e.state === 'ko') continue;
      const dx = e.x - this.px;
      const dz = e.z - this.pz;
      const dist = Math.hypot(dx, dz);
      const maxRange = e.isBoss ? 3.5 : 2.95;
      if (dist > maxRange) continue;

      const dot = dist > 0.01 ? (dx * fwdX + dz * fwdZ) / dist : 1;
      if (dot < -0.15) continue; // Generous 190-deg front arc

      landed = true;
      const dmg = this.comboIndex === 2 ? combatMods.finisherDamage : combatMods.baseDamage;
      this.damageEnemy(e, dmg, dx / (dist || 1), dz / (dist || 1), 6.5);
    }

    if (landed) {
      this.audio.playHit(this.comboIndex === 2);
      this.hitstopTimer = 0.042;
      this.trauma = Math.min(1, this.trauma + 0.34);
    }
  }

  private executeLanternFlare(): void {
    this.oil -= 30;
    this.flareCooldown = 1.6;
    this.audio.playLanternFlare();
    this.trauma = Math.min(1, this.trauma + 0.45);

    this.flareLight.position.set(this.px, this.py + 1.6, this.pz);
    this.flareLight.intensity = 14;
    this.flareWaveMesh.position.set(this.px, this.py + 0.15, this.pz);
    this.flareWaveMesh.scale.setScalar(1);
    (this.flareWaveMesh.material as THREE.MeshBasicMaterial).opacity = 0.85;

    this.spawnParticles(this.px, this.py + 1.1, this.pz, 24, 0xffaa33, 6.2, 2.5, 1.35, 0.7);

    let hitAny = false;
    for (const e of this.enemies) {
      if (e.state === 'ko') continue;
      const dx = e.x - this.px;
      const dz = e.z - this.pz;
      const dist = Math.hypot(dx, dz);
      if (dist <= 6.8) {
        hitAny = true;
        this.damageEnemy(e, 44, dx / (dist || 1), dz / (dist || 1), 10.5);
        if (e.hp > 0) {
          e.state = 'recover';
          e.stateTimer = 1.1; // Stunned by sacred lantern light!
        }
      }
    }
    if (hitAny) {
      this.hitstopTimer = 0.055;
    }
  }

  private damageEnemy(e: EnemyEntity, dmg: number, dirX: number, dirZ: number, knockback: number): void {
    e.hp = Math.max(0, e.hp - dmg);
    e.flashTimer = 0.07;
    e.vx += dirX * knockback;
    e.vz += dirZ * knockback;
    this.spawnParticles(e.x, e.y + 1.0, e.z, 12, 0xbbe8ff, 4.2, 2.2, 0.9, 0.45);

    if (e.hp <= 0) {
      e.state = 'ko';
      e.koTimer = 0.42;
      (e.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
      this.banished += 1;
      this.logCodex(getEnemyCodexId(e.archetype, e.isBoss), true, false);
      this.oil = Math.min(this.maxOil, this.oil + 15);
      // Enemies drop crafting materials on defeat
      const dropKind: ResourceKind = e.archetype === 'brute' ? 'ore' : e.archetype === 'weaver' ? 'herb' : 'wood';
      this.craftState = {
        ...this.craftState,
        inventory: addResource(this.craftState.inventory, dropKind, 1),
      };
      this.spawnParticles(e.x, e.y + 1.1, e.z, 22, 0x56c8ff, 4.8, 3.0, 1.25, 0.75);
      if (e.isBoss) {
        this.bossDefeated = true;
        this.showToast('The Hollow Warden falls! Ring the Chapel Great Bell!');
      }
    }
  }

  private logCodex(id: string, incrementEncounter = false, notifyIfNew = true): void {
    const res = unlockCodexEntry(this.codex, id, this.elapsedSec, incrementEncounter);
    this.codex = res.nextState;
    if (res.newlyUnlocked && notifyIfNew && !this.activeToast) {
      const entry = CODEX_CATALOG.find((c) => c.id === id);
      if (entry) {
        this.showToast(`Codex Logged: ${entry.title}`);
      }
    }
  }

  private updateInteractables(): void {
    this.nearestPrompt = null;
    this.nearestAction = null;
    let bestDist = 3.6;

    // 1. Elder Mirek (follows dynamic schedule!)
    const elderDist = Math.hypot(this.px - this.elderX, this.pz - this.elderZ);
    if (elderDist < bestDist) {
      bestDist = elderDist;
      const wp = getElderScheduleWaypoint(this.timeOfDay);
      this.nearestPrompt = {
        id: 'elder',
        kind: 'elder',
        label: 'Speak with Elder Mirek',
        sublabel: `At ${wp.label}`,
      };
      this.nearestAction = () => this.interactWithElder();
    }

    // 2. Crafting Stations
    for (const st of this.stations) {
      const d = Math.hypot(this.px - st.x, this.pz - st.z);
      if (d < bestDist) {
        bestDist = d;
        this.nearestPrompt = {
          id: st.id,
          kind: 'station',
          label: `Use ${st.name}`,
          sublabel: 'Craft Potions, Weapons & Armor',
        };
        this.nearestAction = () => this.openCrafting();
      }
    }

    // 3. Gatherable Resource Nodes
    for (const res of this.resourceNodes) {
      if (res.collected) continue;
      const d = Math.hypot(this.px - res.x, this.pz - res.z);
      if (d < bestDist) {
        bestDist = d;
        this.nearestPrompt = {
          id: res.id,
          kind: 'resource',
          label: `Gather ${res.name}`,
          sublabel: `+1–2 ${res.kind.toUpperCase()}`,
        };
        this.nearestAction = () => this.gatherResource(res);
      }
    }

    // 4. Unlit Braziers
    for (const b of this.braziers) {
      if (b.lit) continue;
      const d = Math.hypot(this.px - b.x, this.pz - b.z);
      if (d < bestDist) {
        bestDist = d;
        this.nearestPrompt = {
          id: b.id,
          kind: 'brazier',
          label: `Ignite ${b.name}`,
          sublabel: '+25 HP · +40 Lantern Oil',
        };
        this.nearestAction = () => this.igniteBrazier(b);
      }
    }

    // 5. Bell Shards
    for (const s of this.shards) {
      if (s.collected) continue;
      const d = Math.hypot(this.px - s.x, this.pz - s.z);
      if (d < bestDist) {
        bestDist = d;
        this.nearestPrompt = {
          id: s.id,
          kind: 'shard',
          label: `Claim ${s.name}`,
          sublabel: 'Sacred Bell Shard',
        };
        this.nearestAction = () => this.collectShard(s);
      }
    }

    // 6. Lore Scrolls
    for (const l of this.lores) {
      if (l.collected) continue;
      const d = Math.hypot(this.px - l.x, this.pz - l.z);
      if (d < bestDist) {
        bestDist = d;
        this.nearestPrompt = {
          id: l.id,
          kind: 'lore',
          label: `Read ${l.title}`,
          sublabel: 'Lost Lore (+85 Honor)',
        };
        this.nearestAction = () => this.collectLore(l);
      }
    }

    // 7. Shelter Cottage Doors (open/close from outside OR inside doorway)
    for (const sh of this.shelters) {
      const d = Math.hypot(this.px - sh.doorX, this.pz - sh.doorZ);
      if (d < bestDist) {
        bestDist = d;
        this.nearestPrompt = {
          id: `${sh.spec.id}_door`,
          kind: 'door',
          label: sh.doorOpen ? `Close ${sh.spec.name} Door` : `Open ${sh.spec.name} Door`,
          sublabel: sh.doorOpen ? 'Seal against the storm' : 'Step inside for shelter',
        };
        this.nearestAction = () => this.toggleShelterDoor(sh);
      }
    }

    // 8. Chapel Bell Rope (at front of Chapel entrance x: 1.5, z: 2.3)
    const activeQ = getActiveQuest(this.quests);
    const bellDist = Math.hypot(this.px - 1.5, this.pz - 2.3);
    if (bellDist < 3.6 && activeQ.id === 'toll_bell' && !this.bellTolled) {
      this.nearestPrompt = {
        id: 'chapel_bell',
        kind: 'bell',
        label: this.bossDefeated ? 'Toll the Great Bell' : 'Defeat the Hollow Warden First!',
        sublabel: this.bossDefeated ? 'Banish the Ashhollow Curse' : 'Guarding Chapel Square',
      };
      this.nearestAction = () => {
        if (!this.bossDefeated) {
          this.showToast('Banish the Hollow Warden before tolling the bell!');
          return;
        }
        this.tollGreatBell();
      };
    }
  }

  private toggleShelterDoor(sh: ShelterEntity): void {
    sh.doorOpen = !sh.doorOpen;
    sh.doorCollider.disabled = sh.doorOpen;
    this.audio.playDoorToggle(sh.doorOpen);
    this.showToast(
      sh.doorOpen
        ? `Opened ${sh.spec.name} door — step inside for shelter`
        : `Closed ${sh.spec.name} door`,
    );
    this.emitHud();
  }

  private gatherResource(res: ResourceNodeEntity): void {
    if (res.collected) return;
    res.collected = true;
    res.respawnTimer = 42;
    res.group.visible = false;
    const amount = res.kind === 'herb' ? 2 : 1 + (Math.random() < 0.45 ? 1 : 0);
    this.craftState = {
      ...this.craftState,
      inventory: addResource(this.craftState.inventory, res.kind, amount),
    };
    this.audio.playGather();
    const particleColor =
      res.kind === 'herb' ? 0x5be8b8 : res.kind === 'ore' ? 0x80c8ff : 0xd4a45e;
    this.spawnParticles(res.x, groundHeightAt(res.x, res.z) + 0.7, res.z, 14, particleColor, 3.0, 2.2, 0.9, 0.55);
    this.showToast(`Gathered +${amount} ${res.name}`);
    this.emitHud();
  }

  private updateResourceRespawns(dt: number): void {
    for (const res of this.resourceNodes) {
      if (res.collected && res.respawnTimer > 0) {
        res.respawnTimer -= dt;
        if (res.respawnTimer <= 0) {
          res.collected = false;
          res.group.visible = true;
        }
      }
    }
  }

  private updateElderSchedule(dt: number): void {
    const wp = getElderScheduleWaypoint(this.timeOfDay);
    const dx = wp.x - this.elderX;
    const dz = wp.z - this.elderZ;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.08) {
      const step = Math.min(dist, dt * 1.45);
      this.elderX += (dx / dist) * step;
      this.elderZ += (dz / dist) * step;
      this.elderYaw = Math.atan2(dx, dz);
    } else {
      this.elderYaw = getDayPhase(this.timeOfDay) === 'night' ? -0.8 : 0.05;
    }
    this.elderGroup.position.set(this.elderX, groundHeightAt(this.elderX, this.elderZ), this.elderZ);
    this.elderGroup.rotation.y = this.elderYaw;
    const col = this.circles.find((c) => c.id === 'elder');
    if (col) {
      col.x = this.elderX;
      col.z = this.elderZ;
    }
  }

  private updateEnvironmentVisuals(dt: number): void {
    const phase = getDayPhase(this.timeOfDay);
    const env = computeEnvironmentEffects(this.timeOfDay, this.weather);
    const lerpT = Math.min(1, dt * 2.5);

    // Target atmosphere colors by time-of-day & weather
    let targetHex = 0x132330;
    let sunHex = 0xaad0f5;
    let hemiSkyHex = 0x6388ab;
    let hemiGroundHex = 0x161f26;
    let moonIntensity = 1.35;
    let hemiIntensity = 0.78;
    let windowGlowIntensity = 1.65;

    if (phase === 'day') {
      targetHex = this.weather === 'storm' ? 0x263847 : this.weather === 'rain' ? 0x3b5366 : this.weather === 'fog' ? 0x5c7382 : 0x5b7c96;
      sunHex = this.weather === 'clear' ? 0xffe4bc : 0xbdd1e0;
      hemiSkyHex = 0x99bad6;
      hemiGroundHex = 0x293338;
      moonIntensity = this.weather === 'storm' ? 0.95 : 1.85;
      hemiIntensity = 1.05;
      windowGlowIntensity = 0.45;
    } else if (phase === 'dawn') {
      targetHex = 0x2f4354;
      sunHex = 0xffbd8a;
      hemiSkyHex = 0x8fa8c2;
      hemiGroundHex = 0x1e252c;
      moonIntensity = 1.45;
      hemiIntensity = 0.88;
      windowGlowIntensity = 1.0;
    } else if (phase === 'dusk') {
      targetHex = 0x243040;
      sunHex = 0xe89b74;
      hemiSkyHex = 0x7189a6;
      hemiGroundHex = 0x181f26;
      moonIntensity = 1.25;
      hemiIntensity = 0.82;
      windowGlowIntensity = 1.5;
    } else {
      targetHex = this.weather === 'storm' ? 0x0c1620 : 0x132330;
      sunHex = 0xaad0f5;
      hemiSkyHex = 0x6388ab;
      hemiGroundHex = 0x161f26;
      moonIntensity = this.weather === 'storm' ? 1.05 : 1.35;
      hemiIntensity = 0.78;
      windowGlowIntensity = 1.85;
    }

    // Lightning flash boost during storms
    const flashBoost = this.lightningFlash * 2.6;
    if (this.lightningFlash > 0.15) {
      targetHex = 0x456078;
    }

    _cTargetSky.setHex(targetHex);
    _cSky.copy(this.scene.background as THREE.Color).lerp(_cTargetSky, lerpT);
    (this.scene.background as THREE.Color).copy(_cSky);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_cSky);
      const targetDensity = getFogDensityFor(this.timeOfDay, this.weather);
      this.scene.fog.density += (targetDensity - this.scene.fog.density) * lerpT;
    }

    _cMoon.setHex(sunHex);
    this.moonKey.color.lerp(_cMoon, lerpT);
    this.moonKey.intensity += (moonIntensity + flashBoost - this.moonKey.intensity) * Math.min(1, dt * 8);

    // Modulate moon halo visibility by day phase & weather
    const moonDiscMat = this.moonDiscMesh.material as THREE.MeshBasicMaterial;
    const targetMoonAlpha = phase === 'night' || phase === 'dusk' ? (this.weather === 'storm' ? 0.14 : 0.46) : 0.06;
    moonDiscMat.opacity += (targetMoonAlpha - moonDiscMat.opacity) * lerpT;

    // Modulate ground mist layer opacity by weather & day phase
    const targetMistOpacity =
      this.weather === 'fog' ? 0.28 : this.weather === 'storm' ? 0.2 : this.weather === 'rain' ? 0.16 : phase === 'night' ? 0.17 : 0.07;
    this.mistMat.opacity += (targetMistOpacity - this.mistMat.opacity) * lerpT;

    // Sun / moon orbital arc centered around player neighborhood (texel-snapped for crisp shadows)
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const focusX = this.screen === 'title' ? 0 : Math.round(this.px * 0.5) * 2;
    const focusZ = this.screen === 'title' ? 0 : Math.round(this.pz * 0.5) * 2;
    this.moonKey.target.position.set(focusX, 0, focusZ);
    this.moonKey.target.updateMatrixWorld();
    this.moonKey.position.set(
      focusX + Math.cos(sunAngle) * -32,
      Math.max(14, Math.abs(Math.sin(sunAngle)) * 38 + 14),
      focusZ + 22,
    );

    _cHemiSky.setHex(hemiSkyHex);
    _cHemiGround.setHex(hemiGroundHex);
    this.hemiLight.color.lerp(_cHemiSky, lerpT);
    this.hemiLight.groundColor.lerp(_cHemiGround, lerpT);
    this.hemiLight.intensity += (hemiIntensity + flashBoost * 0.55 - this.hemiLight.intensity) * Math.min(1, dt * 8);

    this.mats.windowGlow.emissiveIntensity += (windowGlowIntensity - this.mats.windowGlow.emissiveIntensity) * lerpT;

    // Wet ground sheen during rain/storm
    const targetRoughness = this.weather === 'rain' || this.weather === 'storm' ? 0.34 : 0.92;
    this.terrainMat.roughness += (targetRoughness - this.terrainMat.roughness) * lerpT;

    // Scale player lantern warmth by visibility
    const lanternScale = env.dayPhase === 'day' ? 0.55 : 1.0;
    this.playerLanternLight.distance = 14 * lanternScale;
  }

  private interactWithElder(): void {
    this.logCodex('npc_elder_mirek', false, false);
    const activeQ = getActiveQuest(this.quests);
    const phase = getDayPhase(this.timeOfDay);
    const scheduleNote =
      phase === 'night' || phase === 'dusk'
        ? 'The mist thickens at night—forge weapons at the Anvil or brew tonics at the Alchemist Table.'
        : 'Daylight slows the cursed horde. Gather Moonpetal Herbs and Bog Iron while visibility holds!';
    if (activeQ.id === 'speak_elder') {
      const res = advanceQuestProgress(this.quests, 'speak_elder', 1);
      this.quests = res.quests;
      this.audio.playIgnite();
      this.activeDialogue = {
        speaker: 'Elder Mirek',
        text: `Welcome, Oathbound. Ignite our 3 Sanctuary Braziers, then reclaim the 3 Bell Shards. ${scheduleNote}`,
        timer: 6.5,
      };
      this.showToast('New Quest: Push Back the Mist (0/3 Braziers)');
    } else if (activeQ.id === 'light_braziers') {
      this.activeDialogue = {
        speaker: 'Elder Mirek',
        text: `Ignite the ${3 - activeQ.current} remaining braziers at Chapel Gate, Market Crossroad, and Windmill Trail. ${scheduleNote}`,
        timer: 4.8,
      };
    } else if (activeQ.id === 'recover_shards') {
      this.activeDialogue = {
        speaker: 'Elder Mirek',
        text: `Seek the Bell Shards at Windmill Ridge, Pumpkin Hollow, and the Sunken Graveyard. ${scheduleNote}`,
        timer: 5.0,
      };
    } else {
      this.activeDialogue = {
        speaker: 'Elder Mirek',
        text: 'The Hollow Warden stalks the square! Strike it down and toll the Chapel Bell!',
        timer: 4.5,
      };
    }
    this.emitHud();
  }

  private igniteBrazier(b: BrazierEntity): void {
    if (b.lit) return;
    b.lit = true;
    b.flameMesh.visible = true;
    (b.beaconRing.material as THREE.MeshBasicMaterial).color.setHex(0xff9b38);
    (b.beaconRing.material as THREE.MeshBasicMaterial).opacity = 0.7;

    this.hp = Math.min(this.maxHp, this.hp + 25);
    this.oil = Math.min(this.maxOil, this.oil + 40);
    this.audio.playIgnite();
    this.spawnParticles(b.x, groundHeightAt(b.x, b.z) + 2.1, b.z, 22, 0xff942e, 4.0, 3.6, 1.2, 0.8);
    this.logCodex('npc_aldous', false, false);

    // Ensure Elder Plea auto-completes if player explores directly first!
    if (!this.quests[0].completed) {
      this.quests = advanceQuestProgress(this.quests, 'speak_elder', 1).quests;
    }
    const res = advanceQuestProgress(this.quests, 'light_braziers', 1);
    this.quests = res.quests;
    if (res.justCompleted) {
      this.showToast('All Braziers Lit! Quest: Recover 3 Bell Shards');
    } else {
      const q = this.quests[1];
      this.showToast(`${b.name} Ignited (${q.current}/${q.target})`);
    }
    this.emitHud();
  }

  private collectShard(s: ShardEntity): void {
    if (s.collected) return;
    s.collected = true;
    s.group.visible = false;
    this.audio.playPickup();
    this.spawnParticles(s.x, groundHeightAt(s.x, s.z) + 1.4, s.z, 24, 0xffd27a, 4.5, 3.2, 1.25, 0.75);

    // Auto-complete earlier milestones if player explored ahead
    if (!this.quests[0].completed) {
      this.quests = advanceQuestProgress(this.quests, 'speak_elder', 1).quests;
    }
    const res = advanceQuestProgress(this.quests, 'recover_shards', 1);
    this.quests = res.quests;

    if (res.justCompleted && !this.bossSpawned) {
      this.bossSpawned = true;
      const boss = this.createEnemy('boss_warden', 'brute', -4.5, 9.5, true);
      this.enemies.push(boss);
      this.logCodex('enemy_warden', false, false);
      this.audio.playTelegraph();
      this.showToast('All 3 Shards Recovered! The Hollow Warden awaits at Chapel Square!');
    } else {
      const q = this.quests[2];
      this.showToast(`Sacred Bell Shard Recovered (${q.current}/${q.target})`);
    }
    this.emitHud();
  }

  private collectLore(l: LoreEntity): void {
    if (l.collected) return;
    l.collected = true;
    l.group.visible = false;
    this.loreFound += 1;
    this.oil = Math.min(this.maxOil, this.oil + 30);
    this.audio.playPickup();
    this.spawnParticles(l.x, groundHeightAt(l.x, l.z) + 1.2, l.z, 16, 0x6ce5ff, 3.2, 2.5, 1.0, 0.6);
    this.logCodex(l.id, false, false);
    this.showToast(`Codex Logged: ${l.title}`);
    this.activeDialogue = {
      speaker: l.title,
      text: l.text,
      timer: 5.2,
    };
    this.emitHud();
  }

  private tollGreatBell(): void {
    this.bellTolled = true;
    this.bellRingTimer = 3.2;
    this.quests = advanceQuestProgress(this.quests, 'toll_bell', 1).quests;
    this.audio.playGreatBell();
    this.trauma = 0.55;
    this.spawnParticles(0, groundHeightAt(0, -4) + 9.2, -0.6, 36, 0xffd27a, 6.5, 4.0, 1.5, 1.2);
    this.showToast('Honor Restored! The Ashhollow Curse is broken!');
    this.finishRun('victory');
  }

  private updateEnemies(dt: number): void {
    // Attack token pool: at most 3 enemies winding up/attacking simultaneously
    let activeAttackers = 0;
    for (const e of this.enemies) {
      if (e.state === 'windup' || e.state === 'attack') activeAttackers++;
    }

    const env = computeEnvironmentEffects(this.timeOfDay, this.weather);
    const aggroMult =
      (env.dayPhase === 'day' ? 0.75 : env.dayPhase === 'night' ? 1.25 : 1.0) *
      (this.weather === 'fog' ? 0.85 : 1.0);

    for (const e of this.enemies) {
      if (e.flashTimer > 0) {
        e.flashTimer -= dt;
        const flashOn = e.flashTimer > 0;
        e.rig.hitMeshes.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.emissive && mat !== this.mats.stone) {
            mat.emissive.setHex(flashOn ? 0xffffff : 0x000000);
            mat.emissiveIntensity = flashOn ? 1.8 : 0;
          }
        });
      }

      if (e.state === 'ko') {
        e.koTimer -= dt;
        const t = Math.max(0, e.koTimer / 0.42);
        e.rig.bodyGroup.rotation.x = (1 - t) * 1.45;
        e.rig.bodyGroup.scale.setScalar(Math.max(0.05, t));
        if (e.koTimer <= 0) {
          e.rig.group.visible = false;
          e.respawnTimer = e.isBoss ? 9999 : 26;
        }
        continue;
      }

      if (!e.rig.group.visible) {
        if (!e.isBoss && e.respawnTimer > 0) {
          e.respawnTimer -= dt * env.enemySpawnRateMultiplier;
          if (e.respawnTimer <= 0) {
            e.x = e.homeX;
            e.z = e.homeZ;
            e.y = groundHeightAt(e.x, e.z);
            e.hp = e.maxHp;
            e.state = 'idle';
            e.rig.bodyGroup.rotation.set(0, 0, 0);
            e.rig.bodyGroup.scale.setScalar(1);
            e.rig.group.visible = true;
          }
        }
        continue;
      }

      if (e.cooldown > 0) e.cooldown -= dt;

      const dx = this.px - e.x;
      const dz = this.pz - e.z;
      const dist = Math.hypot(dx, dz);
      const dirX = dist > 0.01 ? dx / dist : 0;
      const dirZ = dist > 0.01 ? dz / dist : 1;

      const teleMat = e.rig.telegraphRing.material as THREE.MeshBasicMaterial;
      const effectiveAggro = e.aggroRadius * aggroMult;

      if (e.state === 'idle') {
        teleMat.opacity = 0;
        if (dist < effectiveAggro) {
          e.state = 'chase';
          this.logCodex(getEnemyCodexId(e.archetype, e.isBoss), false, true);
        } else {
          // Gentle patrol sway around home
          e.vx *= Math.exp(-6 * dt);
          e.vz *= Math.exp(-6 * dt);
        }
      } else if (e.state === 'chase') {
        if (dist <= 16) {
          this.logCodex(getEnemyCodexId(e.archetype, e.isBoss), false, true);
        }
        teleMat.opacity = 0;
        e.yaw = Math.atan2(dirX, dirZ);

        if (dist > effectiveAggro * 1.45 && !e.isBoss) {
          e.state = 'idle';
        } else if (e.archetype === 'weaver') {
          // Kiter/Ranged AI: maintains 6.5m - 10m distance and fires bolts
          if (dist < 5.5) {
            e.vx += (-dirX * e.speed - e.vx) * (1 - Math.exp(-6 * dt));
            e.vz += (-dirZ * e.speed - e.vz) * (1 - Math.exp(-6 * dt));
          } else if (dist > 10.5) {
            e.vx += (dirX * e.speed - e.vx) * (1 - Math.exp(-6 * dt));
            e.vz += (dirZ * e.speed - e.vz) * (1 - Math.exp(-6 * dt));
          } else {
            // Strafe orbit
            e.vx += (-dirZ * e.speed * 0.7 - e.vx) * (1 - Math.exp(-6 * dt));
            e.vz += (dirX * e.speed * 0.7 - e.vz) * (1 - Math.exp(-6 * dt));
            if (e.cooldown <= 0 && activeAttackers < 3) {
              e.state = 'windup';
              e.stateTimer = 0.55;
              activeAttackers++;
              this.audio.playTelegraph();
            }
          }
        } else {
          // Crawler (swarmer) & Brute (heavy charger)
          e.vx += (dirX * e.speed - e.vx) * (1 - Math.exp(-7 * dt));
          e.vz += (dirZ * e.speed - e.vz) * (1 - Math.exp(-7 * dt));
          const triggerDist = e.archetype === 'brute' ? 4.4 : e.attackRange;
          if (dist <= triggerDist && e.cooldown <= 0 && activeAttackers < 3) {
            e.state = 'windup';
            e.stateTimer = e.archetype === 'brute' ? 0.65 : 0.38;
            activeAttackers++;
            this.audio.playTelegraph();
          }
        }
      } else if (e.state === 'windup') {
        e.vx *= Math.exp(-10 * dt);
        e.vz *= Math.exp(-10 * dt);
        e.yaw = Math.atan2(dirX, dirZ);
        e.stateTimer -= dt;
        teleMat.opacity = 0.45 + Math.sin(e.stateTimer * 26) * 0.25;
        e.rig.bodyGroup.scale.set(1.12, 0.88, 1.12);

        if (e.stateTimer <= 0) {
          e.rig.bodyGroup.scale.setScalar(1);
          teleMat.opacity = 0;
          e.state = 'attack';
          e.stateTimer = 0.24;

          if (e.archetype === 'weaver') {
            this.spawnProjectile(e.x, e.y + 1.45, e.z, dirX, dirZ, e.damage);
          } else {
            // Lunge / Heavy Cleaver Slam
            const lungeSpeed = e.archetype === 'brute' ? 12.5 : 10.5;
            e.vx = dirX * lungeSpeed;
            e.vz = dirZ * lungeSpeed;
            const hitRadius = e.isBoss ? 3.5 : e.archetype === 'brute' ? 3.0 : 2.3;
            if (dist <= hitRadius) {
              this.damagePlayer(e.damage, dirX, dirZ);
            }
          }
        }
      } else if (e.state === 'attack') {
        e.vx *= Math.exp(-6 * dt);
        e.vz *= Math.exp(-6 * dt);
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'recover';
          e.stateTimer = e.archetype === 'brute' ? 0.95 : 0.65;
          e.cooldown = e.archetype === 'weaver' ? 2.1 : 1.4;
        }
      } else if (e.state === 'recover') {
        teleMat.opacity = 0;
        e.vx *= Math.exp(-8 * dt);
        e.vz *= Math.exp(-8 * dt);
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'chase';
        }
      }

      const resolved = resolveWorldCollisions(
        e.x + e.vx * dt,
        e.z + e.vz * dt,
        e.isBoss ? 1.1 : 0.65,
        this.circles,
        this.boxes,
      );
      e.x = resolved.x;
      e.z = resolved.z;
      e.y = groundHeightAt(e.x, e.z);
      e.rig.group.position.set(e.x, e.y, e.z);
      e.rig.group.rotation.y = e.yaw;
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y = groundHeightAt(p.x, p.z) + 1.15;
      p.mesh.position.set(p.x, p.y, p.z);

      const d = Math.hypot(this.px - p.x, this.pz - p.z);
      if (d < 0.9) {
        const len = Math.hypot(p.vx, p.vz) || 1;
        this.damagePlayer(p.damage, p.vx / len, p.vz / len);
        p.active = false;
        p.mesh.visible = false;
        this.spawnParticles(p.x, p.y, p.z, 10, 0x6ce5ff, 3.5, 1.5, 0.8, 0.4);
      } else if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  private damagePlayer(dmg: number, dirX: number, dirZ: number): void {
    if (this.invulnTimer > 0 || this.endBeatTimer > 0) return;
    const combatMods = getCombatModifiers(this.craftState.weaponTier, this.craftState.armorTier);
    const actualDmg = Math.max(1, Math.round(dmg * combatMods.damageMultiplier));
    this.hp = Math.max(0, this.hp - actualDmg);
    this.damageTaken += actualDmg;
    this.invulnTimer = 0.72;
    this.pvx += dirX * 7.5;
    this.pvz += dirZ * 7.5;
    this.trauma = Math.min(1, this.trauma + 0.52);
    this.squashX = 1.25;
    this.squashY = 0.76;
    this.audio.playPlayerHurt();
    this.spawnParticles(this.px, this.py + 1.1, this.pz, 14, 0xff453a, 4.0, 2.0, 1.0, 0.5);

    if (this.hp <= 0) {
      this.endBeatTimer = 0.55;
      this.audio.playDefeatSting();
    }
  }

  private finishRun(outcome: 'victory' | 'defeat'): void {
    this.outcome = outcome;
    this.screen = 'gameover';
    this.craftingOpen = false;
    document.body.dataset.state = 'gameover';
    this.keysHeld.clear();
    this.audio.setAmbienceActive(false);

    const braziersLit = this.braziers.filter((b) => b.lit).length;
    const shardsFound = this.shards.filter((s) => s.collected).length;
    const honor = calculateHonorScore({
      banished: this.banished,
      braziersLit,
      shardsFound,
      loreFound: this.loreFound,
      bellTolled: this.bellTolled,
      craftedCount: this.craftedCount,
    });

    this.emitHud();
    this.onRunEnd({
      outcome,
      elapsedSec: Math.round(this.elapsedSec),
      honor,
      banished: this.banished,
      questsCompleted: this.quests.filter((q) => q.completed).length,
      questsTotal: this.quests.length,
      loreFound: this.loreFound,
      loreTotal: this.lores.length,
      damageTaken: Math.round(this.damageTaken),
    });
  }

  private updateCamera(dt: number): void {
    const targetAnchorX = this.px;
    const targetAnchorY = this.py + 1.75;
    const targetAnchorZ = this.pz;

    const insideShelter = Boolean(this.activeShelter);
    const effectiveDist = insideShelter ? Math.min(this.camDist, 6.8) : this.camDist;
    const effectivePitch = insideShelter ? Math.max(this.camPitch, 0.56) : this.camPitch;

    const horizDist = Math.cos(effectivePitch) * effectiveDist;
    const vertDist = Math.sin(effectivePitch) * effectiveDist;
    const desiredX = targetAnchorX + Math.sin(this.camYaw) * horizDist;
    const desiredZ = targetAnchorZ + Math.cos(this.camYaw) * horizDist;
    const desiredY = Math.max(groundHeightAt(desiredX, desiredZ) + 1.2, targetAnchorY + vertDist);

    // Camera wall pull-in raycast against buildings (excluding active cutaway shelter walls)
    const occluders = this.activeShelter
      ? this.cameraOccluders.filter((o) => o !== this.activeShelter?.rig.wallGroup)
      : this.cameraOccluders;
    _v3.set(targetAnchorX, targetAnchorY, targetAnchorZ);
    _v3b.set(desiredX, desiredY, desiredZ);
    _rayDir.subVectors(_v3b, _v3);
    const fullDist = _rayDir.length();
    if (fullDist > 0.1) {
      _rayDir.divideScalar(fullDist);
      this.raycaster.set(_v3, _rayDir);
      this.raycaster.far = fullDist;
      const hits = this.raycaster.intersectObjects(occluders, true);
      if (hits.length > 0 && hits[0].distance < fullDist) {
        const pullDist = Math.max(2.2, hits[0].distance - 0.5);
        _v3b.copy(_v3).addScaledVector(_rayDir, pullDist);
      }
    }

    const damp = 1 - Math.exp(-9.5 * dt);
    this.camPos.lerp(_v3b, damp);

    _v3.set(targetAnchorX, targetAnchorY + 0.15, targetAnchorZ);
    this.camLook.lerp(_v3, 1 - Math.exp(-12 * dt));

    this.camera.position.copy(this.camPos);
    if (this.trauma > 0) {
      const shake = this.trauma * this.trauma * 0.42;
      this.camera.position.x += (Math.random() * 2 - 1) * shake;
      this.camera.position.y += (Math.random() * 2 - 1) * shake;
    }
    this.camera.lookAt(this.camLook);
  }

  private updateParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.001);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 3.2 * dt;
        const t = p.life / p.maxLife;
        _dummy.position.set(p.x, p.y, p.z);
        _dummy.rotation.set(p.life * 3, p.life * 2, 0);
        _dummy.scale.setScalar(p.scale * t);
      }
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (anyChanged) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private getCurrentObjectivePos(): { x: number; z: number; label: string } | null {
    const q = getActiveQuest(this.quests);
    if (q.id === 'speak_elder') return { x: this.elderX, z: this.elderZ, label: 'Elder Mirek' };
    if (q.id === 'light_braziers') {
      const unlit = this.braziers.find((b) => !b.lit);
      return unlit ? { x: unlit.x, z: unlit.z, label: unlit.name } : null;
    }
    if (q.id === 'recover_shards') {
      const shard = this.shards.find((s) => !s.collected);
      return shard ? { x: shard.x, z: shard.z, label: shard.name } : null;
    }
    if (q.id === 'toll_bell') {
      const boss = this.enemies.find((e) => e.isBoss && e.hp > 0);
      if (boss) return { x: boss.x, z: boss.z, label: 'Hollow Warden' };
      return { x: 1.5, z: 2.3, label: 'Chapel Bell' };
    }
    return null;
  }

  private emitHud(): void {
    const activeQuest = getActiveQuest(this.quests);
    const braziersLit = this.braziers.filter((b) => b.lit).length;
    const shardsFound = this.shards.filter((s) => s.collected).length;
    const honor = calculateHonorScore({
      banished: this.banished,
      braziersLit,
      shardsFound,
      loreFound: this.loreFound,
      bellTolled: this.bellTolled,
      craftedCount: this.craftedCount,
    });

    const markers: MinimapMarker[] = [
      { id: 'chapel', x: 0, z: -4, kind: 'landmark', active: true, label: 'Chapel' },
      ...this.shelters.map((sh) => ({
        id: sh.spec.id,
        x: sh.spec.x,
        z: sh.spec.z,
        kind: 'shelter' as const,
        active: true,
        label: sh.spec.name,
      })),
      { id: 'elder', x: this.elderX, z: this.elderZ, kind: 'elder', active: !this.quests[0].completed, label: 'Elder' },
      ...(activeQuest.id === 'toll_bell' && !this.bellTolled
        ? [{ id: 'chapel_bell', x: 1.5, z: 2.3, kind: 'bell' as const, active: true, label: 'Great Bell' }]
        : []),
      ...this.stations.map((st) => ({
        id: st.id,
        x: st.x,
        z: st.z,
        kind: 'station' as const,
        active: true,
        label: st.name,
      })),
      ...this.resourceNodes.map((res) => ({
        id: res.id,
        x: res.x,
        z: res.z,
        kind: 'resource' as const,
        active: !res.collected,
        label: res.kind,
      })),
      ...this.braziers.map((b) => ({
        id: b.id,
        x: b.x,
        z: b.z,
        kind: 'brazier' as const,
        active: !b.lit,
      })),
      ...this.shards.map((s) => ({
        id: s.id,
        x: s.x,
        z: s.z,
        kind: 'shard' as const,
        active: !s.collected,
      })),
      ...this.lores.map((l) => ({
        id: l.id,
        x: l.x,
        z: l.z,
        kind: 'lore' as const,
        active: !l.collected,
      })),
      ...this.enemies
        .filter((e) => e.hp > 0 && e.rig.group.visible)
        .map((e) => ({
          id: e.id,
          x: e.x,
          z: e.z,
          kind: 'enemy' as const,
          active: true,
        })),
    ];

    const boss = this.enemies.find((e) => e.isBoss && e.hp > 0);
    const stationProx = this.getStationProximity();
    const environment = computeEnvironmentEffects(this.timeOfDay, this.weather);

    this.onHudUpdate({
      screen: this.screen,
      outcome: this.outcome,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      oil: Math.round(this.oil),
      maxOil: this.maxOil,
      honor,
      banished: this.banished,
      loreFound: this.loreFound,
      loreTotal: this.lores.length,
      elapsedSec: Math.round(this.elapsedSec),
      regionName: getRegionNameAt(this.px, this.pz),
      quests: this.quests,
      activeQuest,
      objectivePos: this.getCurrentObjectivePos(),
      playerPos: { x: this.px, z: this.pz, yaw: this.pYaw },
      prompt: this.nearestPrompt,
      dialogue: this.activeDialogue ? { speaker: this.activeDialogue.speaker, text: this.activeDialogue.text } : null,
      toast: this.activeToast ? this.activeToast.text : null,
      muted: this.audio.isMuted(),
      markers,
      exploredCells: Array.from(this.exploredCells),
      bossActive: Boolean(boss),
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 220,
      bossName: boss ? boss.name : 'The Hollow Warden',
      crafting: this.craftState,
      craftingOpen: this.craftingOpen,
      atCraftingStation: stationProx.atStation,
      nearestStationName: stationProx.nearestStation?.name ?? null,
      nearestStationDist: stationProx.dist,
      environment,
      codex: this.codex,
      sheltered: Boolean(this.activeShelter),
      shelterName: this.activeShelter?.spec.name ?? null,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.audio.setAmbienceActive(false);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else if (m.material) {
          m.material.dispose();
        }
      }
    });

    this.mats.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
