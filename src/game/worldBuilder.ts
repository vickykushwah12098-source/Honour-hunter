import * as THREE from 'three';
import {
  BoxCollider,
  CircleCollider,
  groundHeightAt,
  roadMaskAt,
  WORLD_TERRAIN_SIZE,
} from './rules';
import { VillageTextures } from './textures';
import { EnemyArchetype, ResourceKind } from './types';

export interface WorldMaterials {
  wood: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  canvas: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  shroud: THREE.MeshStandardMaterial;
  corpseSkin: THREE.MeshStandardMaterial;
  wetHair: THREE.MeshStandardMaterial;
  crimsonEye: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  pumpkin: THREE.MeshStandardMaterial;
  emberGlow: THREE.MeshStandardMaterial;
  windowGlow: THREE.MeshStandardMaterial;
  silverBlade: THREE.MeshStandardMaterial;
  shadowDisc: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createWorldMaterials(textures: VillageTextures): WorldMaterials {
  const wood = new THREE.MeshStandardMaterial({
    color: 0xdbe3e8,
    map: textures.woodMap,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: textures.woodRoughness,
    roughness: 0.92,
    metalness: 0.04,
  });

  const darkWood = new THREE.MeshStandardMaterial({
    color: 0x384550,
    map: textures.woodMap,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.88,
    metalness: 0.04,
  });

  const roof = new THREE.MeshStandardMaterial({
    color: 0xd4e0e8,
    map: textures.roofMap,
    normalMap: textures.roofNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughnessMap: textures.roofRoughness,
    roughness: 0.84,
    metalness: 0.1,
  });

  const canvas = new THREE.MeshStandardMaterial({
    color: 0xc2beb0,
    map: textures.canvasMap,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const stone = new THREE.MeshStandardMaterial({
    color: 0xc8d0d6,
    map: textures.stoneMap,
    normalMap: textures.stoneNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: textures.stoneRoughness,
    roughness: 0.9,
    metalness: 0.06,
  });

  const bark = new THREE.MeshStandardMaterial({
    color: 0x9aa4ac,
    map: textures.barkMap,
    normalMap: textures.barkNormal,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughness: 0.95,
    metalness: 0.02,
  });

  const shroud = new THREE.MeshStandardMaterial({
    color: 0xcdd4d6,
    map: textures.clothMap,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const corpseSkin = new THREE.MeshStandardMaterial({
    color: 0x7b888c,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.56,
    metalness: 0.06,
  });

  const wetHair = new THREE.MeshStandardMaterial({
    color: 0x0a0c10,
    normalMap: textures.barkNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.22,
    metalness: 0.16,
    side: THREE.DoubleSide,
  });

  const crimsonEye = new THREE.MeshStandardMaterial({
    color: 0xff2a1e,
    emissive: 0xe61710,
    emissiveIntensity: 3.4,
    roughness: 0.15,
  });

  const iron = new THREE.MeshStandardMaterial({
    color: 0x2a333b,
    normalMap: textures.stoneNormal,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughness: 0.38,
    metalness: 0.84,
  });

  const brass = new THREE.MeshStandardMaterial({
    color: 0xd4a44a,
    roughness: 0.26,
    metalness: 0.9,
  });

  const pumpkin = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.pumpkinMap,
    normalMap: textures.pumpkinNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.52,
    metalness: 0.03,
  });

  const emberGlow = new THREE.MeshStandardMaterial({
    color: 0xff8c2b,
    emissive: 0xff6b12,
    emissiveIntensity: 2.3,
    roughness: 0.38,
  });

  const windowGlow = new THREE.MeshStandardMaterial({
    color: 0xffb357,
    emissive: 0xff7e1f,
    emissiveIntensity: 1.5,
    roughness: 0.28,
  });

  const silverBlade = new THREE.MeshStandardMaterial({
    color: 0xe0eaf2,
    roughness: 0.16,
    metalness: 0.94,
  });

  const shadowDisc = new THREE.MeshBasicMaterial({
    map: textures.shadowDiscMap,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });

  return {
    wood,
    darkWood,
    roof,
    canvas,
    stone,
    bark,
    shroud,
    corpseSkin,
    wetHair,
    crimsonEye,
    iron,
    brass,
    pumpkin,
    emberGlow,
    windowGlow,
    silverBlade,
    shadowDisc,
    dispose: () => {
      wood.dispose();
      darkWood.dispose();
      roof.dispose();
      canvas.dispose();
      stone.dispose();
      bark.dispose();
      shroud.dispose();
      corpseSkin.dispose();
      wetHair.dispose();
      crimsonEye.dispose();
      iron.dispose();
      brass.dispose();
      pumpkin.dispose();
      emberGlow.dispose();
      windowGlow.dispose();
      silverBlade.dispose();
      shadowDisc.dispose();
    },
  };
}

export function createTerrainMesh(textures: VillageTextures): THREE.Mesh {
  const segs = 140;
  const geo = new THREE.PlaneGeometry(WORLD_TERRAIN_SIZE, WORLD_TERRAIN_SIZE, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cDirt = new THREE.Color(0x1f2a30);
  const cGrass = new THREE.Color(0x1d2e2a);
  const cMoss = new THREE.Color(0x25352c);
  const cRoad = new THREE.Color(0x41494f);
  const cRock = new THREE.Color(0x141d24);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeightAt(x, z);
    pos.setY(i, y);

    const road = roadMaskAt(x, z);
    const r = Math.hypot(x, z);
    const n = Math.sin(x * 0.23) * Math.cos(z * 0.21) * 0.5 + 0.5;
    const n2 = Math.sin(x * 0.57 + z * 0.39) * 0.5 + 0.5;

    tmp.copy(cDirt).lerp(cGrass, n * 0.68).lerp(cMoss, n2 * 0.3);
    if (road > 0.05) {
      tmp.lerp(cRoad, road * 0.88);
    }
    if (r > 56) {
      tmp.lerp(cRock, Math.min(1, (r - 56) / 20));
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.groundMap,
    normalMap: textures.groundNormal,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: textures.groundRoughness,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.04,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

/**
 * Helper to create a beveled gable roof prism via ExtrudeGeometry.
 */
function createGableRoofGeometry(width: number, height: number, length: number): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(0, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -length * 0.5);
  return geo;
}

/**
 * Builds the iconic Ashhollow Chapel with dressed stone plinth, exposed oak timber framing,
 * gothic arched mullions, Belfry Tower, iron cross finial, side shed, canvas awning,
 * and swinging brass Great Bell.
 */
export function buildChapel(mats: WorldMaterials): {
  group: THREE.Group;
  bellPivot: THREE.Group;
} {
  const group = new THREE.Group();

  // 1. Stone foundation plinth + bevelled cornice ledge
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.72, 10.9), mats.stone);
  plinth.position.y = 0.36;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const plinthTrim = new THREE.Mesh(new THREE.BoxGeometry(8.55, 0.14, 11.15), mats.stone);
  plinthTrim.position.y = 0.74;
  plinthTrim.receiveShadow = true;
  group.add(plinthTrim);

  // 2. Main timber hall body
  const body = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.1, 9.6), mats.wood);
  body.position.y = 0.7 + 2.05;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Exposed corner & mid-wall oak timber framing posts
  const cornerPostGeo = new THREE.BoxGeometry(0.28, 4.2, 0.28);
  for (const cx of [-3.58, 3.58]) {
    for (const cz of [-4.78, 0, 4.78]) {
      const post = new THREE.Mesh(cornerPostGeo, mats.darkWood);
      post.position.set(cx, 2.75, cz);
      post.castShadow = true;
      group.add(post);
    }
  }
  // Horizontal timber tie-beams along eaves
  for (const cx of [-3.6, 3.6]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 9.8), mats.darkWood);
    beam.position.set(cx, 4.72, 0);
    group.add(beam);
  }
  const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(7.45, 0.24, 0.22), mats.darkWood);
  frontBeam.position.set(0, 4.72, 4.82);
  group.add(frontBeam);

  // 3. Steep gabled slate roof + ridge cap
  const roofGeo = createGableRoofGeometry(8.6, 3.25, 10.6);
  const roofMesh = new THREE.Mesh(roofGeo, mats.roof);
  roofMesh.position.y = 4.75;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  group.add(roofMesh);

  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 10.75), mats.darkWood);
  ridgeBeam.position.set(0, 8.0, 0);
  ridgeBeam.castShadow = true;
  group.add(ridgeBeam);

  // 4. Front side shed + timber eaves
  const shedBody = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 3.8), mats.wood);
  shedBody.position.set(-2.3, 0.7 + 1.1, 5.8);
  shedBody.castShadow = true;
  shedBody.receiveShadow = true;
  group.add(shedBody);

  const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.22, 4.35), mats.roof);
  shedRoof.position.set(-2.3, 3.05, 5.8);
  shedRoof.rotation.x = 0.22;
  shedRoof.castShadow = true;
  shedRoof.receiveShadow = true;
  group.add(shedRoof);

  // 5. Recessed Iron-Studded Oak Chapel Door & Stone Steps
  const step = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 0.85), mats.stone);
  step.position.set(1.5, 0.14, 5.25);
  step.receiveShadow = true;
  group.add(step);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.85, 0.42), mats.darkWood);
  doorFrame.position.set(1.5, 0.7 + 1.42, 4.82);
  group.add(doorFrame);

  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.48, 0.28), mats.iron);
  doorPanel.position.set(1.5, 0.7 + 1.28, 4.88);
  group.add(doorPanel);

  // Iron hinge straps & brass ring pull
  for (const hy of [1.45, 2.45]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.32), mats.darkWood);
    strap.position.set(1.5, hy, 4.89);
    group.add(strap);
  }
  const ringPull = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12), mats.brass);
  ringPull.position.set(1.9, 1.85, 5.05);
  group.add(ringPull);

  // 6. Framed Gothic Slit Windows with Mullions & Stone Sills
  const winGeo = new THREE.BoxGeometry(0.18, 1.4, 0.68);
  const frameGeo = new THREE.BoxGeometry(0.24, 1.56, 0.84);
  const sillGeo = new THREE.BoxGeometry(0.32, 0.14, 0.96);
  const mullionGeo = new THREE.BoxGeometry(0.24, 1.4, 0.08);
  for (const side of [-1, 1]) {
    for (const wz of [-2.2, 1.6]) {
      const frame = new THREE.Mesh(frameGeo, mats.darkWood);
      frame.position.set(side * 3.59, 2.82, wz);
      group.add(frame);

      const sill = new THREE.Mesh(sillGeo, mats.stone);
      sill.position.set(side * 3.63, 2.02, wz);
      group.add(sill);

      const win = new THREE.Mesh(winGeo, mats.windowGlow);
      win.position.set(side * 3.64, 2.82, wz);
      group.add(win);

      const mullion = new THREE.Mesh(mullionGeo, mats.darkWood);
      mullion.position.set(side * 3.66, 2.82, wz);
      group.add(mullion);
    }
  }

  // 7. Belfry Tower Base (above front gable)
  const belfryBase = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.55, 2.35), mats.wood);
  belfryBase.position.set(0, 7.2, 3.4);
  belfryBase.castShadow = true;
  group.add(belfryBase);

  // 8. 4 Belfry corner pillars + railings
  const postGeo = new THREE.BoxGeometry(0.28, 1.95, 0.28);
  for (const px of [-0.92, 0.92]) {
    for (const pz of [-0.92, 0.92]) {
      const post = new THREE.Mesh(postGeo, mats.darkWood);
      post.position.set(px, 8.85, 3.4 + pz);
      post.castShadow = true;
      group.add(post);
    }
  }

  // 9. Belfry pyramidal slate cap + forged iron cross finial
  const belfryCap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.65, 4), mats.roof);
  belfryCap.position.set(0, 10.5, 3.4);
  belfryCap.rotation.y = Math.PI / 4;
  belfryCap.castShadow = true;
  group.add(belfryCap);

  const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.82, 0.08), mats.iron);
  crossVert.position.set(0, 11.62, 3.4);
  group.add(crossVert);
  const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.08), mats.iron);
  crossArm.position.set(0, 11.75, 3.4);
  group.add(crossArm);

  // 10. Swinging Brass Great Bell
  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, 9.45, 3.4);
  const bellPts = [
    new THREE.Vector2(0.05, 0),
    new THREE.Vector2(0.48, -0.75),
    new THREE.Vector2(0.38, -0.5),
    new THREE.Vector2(0.32, -0.15),
    new THREE.Vector2(0.1, 0),
  ];
  const bellMesh = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 18), mats.brass);
  bellMesh.castShadow = true;
  bellPivot.add(bellMesh);
  group.add(bellPivot);

  // 11. Attached Canvas Market Awning on West Wall
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), mats.canvas);
  awning.position.set(-5.0, 2.4, 0.5);
  awning.rotation.x = -Math.PI / 2;
  awning.rotation.y = -0.35;
  awning.castShadow = true;
  group.add(awning);

  for (const az of [-1.4, 2.4]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.0, 6), mats.darkWood);
    pole.position.set(-6.4, 1.0, az);
    pole.castShadow = true;
    group.add(pole);
  }

  return { group, bellPivot };
}

export interface CottageRig {
  group: THREE.Group;
  wallGroup: THREE.Group;
  roofGroup: THREE.Group;
  doorPivot: THREE.Group;
  hearthFlame: THREE.Mesh;
}

/**
 * Builds an enterable village timber-framed shelter cottage with hollow perimeter walls,
 * swinging hinged oak door, cutaway gable roof, stone hearth fire, woven rug, candle table, and bedroll.
 */
export function buildCottage(mats: WorldMaterials, scale = 1): CottageRig {
  const g = new THREE.Group();
  const wallGroup = new THREE.Group();
  const roofGroup = new THREE.Group();
  g.add(wallGroup);
  g.add(roofGroup);

  // Stone foundation slab (interior floor level y = 0.34)
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.34, 7.25), mats.stone);
  base.position.y = 0.17;
  base.receiveShadow = true;
  wallGroup.add(base);

  // Exterior stone step threshold in front of the doorway
  const step = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 0.85), mats.stone);
  step.position.set(0, 0.1, 3.65);
  step.receiveShadow = true;
  wallGroup.add(step);

  // Interior wooden plank floorboards & warm crimson woven rug
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x6b4b32,
    map: mats.wood.map,
    normalMap: mats.wood.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 0.78,
  });
  const innerFloor = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.04, 6.25), floorMat);
  innerFloor.position.set(0, 0.35, 0);
  innerFloor.receiveShadow = true;
  wallGroup.add(innerFloor);

  const rugMat = new THREE.MeshStandardMaterial({
    color: 0x6e2024,
    map: mats.shroud.map,
    normalMap: mats.shroud.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.92,
  });
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.03, 2.75), rugMat);
  rug.position.set(0, 0.38, 0.25);
  rug.receiveShadow = true;
  wallGroup.add(rug);

  const wallH = 3.24;
  const wallCenterY = 0.34 + wallH * 0.5;

  // Hollow Perimeter Walls (back, left, right, front-left, front-right, lintel)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.2, wallH, 0.3), mats.wood);
  backWall.position.set(0, wallCenterY, -3.25);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  wallGroup.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH, 6.8), mats.wood);
  leftWall.position.set(-2.45, wallCenterY, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  wallGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH, 6.8), mats.wood);
  rightWall.position.set(2.45, wallCenterY, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  wallGroup.add(rightWall);

  // Front wall segments leaving clear 1.90m doorway at x in [-0.95, +0.95]
  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(1.65, wallH, 0.3), mats.wood);
  frontLeft.position.set(-1.775, wallCenterY, 3.25);
  frontLeft.castShadow = true;
  frontLeft.receiveShadow = true;
  wallGroup.add(frontLeft);

  const frontRight = new THREE.Mesh(new THREE.BoxGeometry(1.65, wallH, 0.3), mats.wood);
  frontRight.position.set(1.775, wallCenterY, 3.25);
  frontRight.castShadow = true;
  frontRight.receiveShadow = true;
  wallGroup.add(frontRight);

  const frontLintel = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.86, 0.32), mats.wood);
  frontLintel.position.set(0, 3.15, 3.25);
  frontLintel.castShadow = true;
  wallGroup.add(frontLintel);

  // Corner oak posts + eave beams
  const postGeo = new THREE.BoxGeometry(0.24, 3.26, 0.24);
  for (const px of [-2.56, 2.56]) {
    for (const pz of [-3.36, 3.36]) {
      const p = new THREE.Mesh(postGeo, mats.darkWood);
      p.position.set(px, 1.97, pz);
      wallGroup.add(p);
    }
  }
  for (const px of [-2.56, 2.56]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 6.96), mats.darkWood);
    beam.position.set(px, 3.56, 0);
    wallGroup.add(beam);
  }
  for (const pz of [-3.36, 3.36]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.32, 0.18, 0.2), mats.darkWood);
    beam.position.set(0, 3.56, pz);
    wallGroup.add(beam);
  }

  // Heavy Timber Door Jambs & Lintel Trim
  for (const jx of [-0.97, 0.97]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.42, 0.38), mats.darkWood);
    jamb.position.set(jx, 1.54, 3.26);
    wallGroup.add(jamb);
  }
  const jambTop = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.16, 0.4), mats.darkWood);
  jambTop.position.set(0, 2.74, 3.26);
  wallGroup.add(jambTop);

  // Swinging Hinged Oak Door (pivots from left jamb at x = -0.90 outward)
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.9, 0.34, 3.3);

  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.78, 2.34, 0.12), mats.darkWood);
  doorPanel.position.set(0.9, 1.17, 0);
  doorPanel.castShadow = true;
  doorPanel.receiveShadow = true;
  doorPivot.add(doorPanel);

  // Iron hinge straps & vertical brace planks + brass ring pulls on both sides
  for (const sy of [0.52, 1.82]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.1, 0.16), mats.iron);
    strap.position.set(0.72, sy, 0);
    doorPivot.add(strap);
  }
  for (const sideZ of [0.09, -0.09]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 12), mats.brass);
    ring.position.set(1.56, 1.12, sideZ);
    doorPivot.add(ring);
  }
  wallGroup.add(doorPivot);

  // Front mullioned window (left front wall) + side window
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.96, 0.34), mats.darkWood);
  winFrame.position.set(-1.78, 2.05, 3.26);
  wallGroup.add(winFrame);

  const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.78, 0.36), mats.windowGlow);
  win.position.set(-1.78, 2.05, 3.26);
  wallGroup.add(win);

  const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.38), mats.darkWood);
  mullionV.position.set(-1.78, 2.05, 3.26);
  wallGroup.add(mullionV);
  const mullionH = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 0.38), mats.darkWood);
  mullionH.position.set(-1.78, 2.05, 3.26);
  wallGroup.add(mullionH);

  // Interior Furnishings:
  // 1) Stone Hearth Fireplace against back wall
  const hearthBase = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.95), mats.stone);
  hearthBase.position.set(0, 0.43, -2.65);
  wallGroup.add(hearthBase);

  for (const hx of [-0.68, 0.68]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.45, 0.65), mats.stone);
    pillar.position.set(hx, 1.15, -2.75);
    wallGroup.add(pillar);
  }
  const mantel = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.26, 0.76), mats.stone);
  mantel.position.set(0, 1.92, -2.74);
  wallGroup.add(mantel);

  const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 6), mats.bark);
  log1.rotation.z = Math.PI / 2;
  log1.rotation.y = 0.2;
  log1.position.set(0, 0.56, -2.72);
  wallGroup.add(log1);

  const hearthFlame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.65, 8), mats.emberGlow);
  hearthFlame.position.set(0, 0.82, -2.72);
  wallGroup.add(hearthFlame);

  // 2) Wooden Table & Candle along left wall
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 1.35), mats.wood);
  tableTop.position.set(-1.62, 1.08, -0.55);
  wallGroup.add(tableTop);
  for (const lx of [-1.98, -1.26]) {
    for (const lz of [-1.08, -0.02]) {
      const tLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.1), mats.darkWood);
      tLeg.position.set(lx, 0.7, lz);
      wallGroup.add(tLeg);
    }
  }
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 6), mats.canvas);
  candle.position.set(-1.55, 1.24, -0.5);
  wallGroup.add(candle);
  const candleFlame = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), mats.emberGlow);
  candleFlame.position.set(-1.55, 1.39, -0.5);
  wallGroup.add(candleFlame);

  // 3) Wooden Bunk / Bedroll along right-back corner
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 2.05), mats.darkWood);
  bedFrame.position.set(1.58, 0.52, -1.55);
  wallGroup.add(bedFrame);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.16, 1.6), rugMat);
  blanket.position.set(1.58, 0.74, -1.35);
  wallGroup.add(blanket);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.38), mats.canvas);
  pillow.position.set(1.58, 0.75, -2.28);
  wallGroup.add(pillow);

  // Cutaway Roof Group (hidden automatically when player enters this shelter!)
  const roof = new THREE.Mesh(createGableRoofGeometry(6.3, 2.65, 7.6), mats.roof);
  roof.position.y = 3.55;
  roof.castShadow = true;
  roof.receiveShadow = true;
  roofGroup.add(roof);

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.25, 0.92), mats.stone);
  chimney.position.set(0, 5.25, -2.6);
  chimney.castShadow = true;
  roofGroup.add(chimney);

  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.16, 1.12), mats.stone);
  chimneyCap.position.set(0, 6.42, -2.6);
  roofGroup.add(chimneyCap);

  g.scale.setScalar(scale);
  return { group: g, wallGroup, roofGroup, doorPivot, hearthFlame };
}

/**
 * Builds a Gothic Wooden Windmill with stone masonry plinth, timber bracing, and lattice sails.
 */
export function buildWoodenWindmill(mats: WorldMaterials): {
  group: THREE.Group;
  bladesPivot: THREE.Group;
} {
  const group = new THREE.Group();

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.85, 0.95, 10), mats.stone);
  plinth.position.y = 0.475;
  plinth.receiveShadow = true;
  group.add(plinth);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.95, 9.5, 10), mats.wood);
  tower.position.y = 0.95 + 4.75;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.15, 0.35, 10), mats.darkWood);
  collar.position.y = 10.35;
  group.add(collar);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.38, 2.45, 10), mats.roof);
  cap.position.y = 10.45 + 1.22;
  cap.castShadow = true;
  group.add(cap);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8), mats.iron);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, 9.6, 2.1);
  group.add(hub);

  const bladesPivot = new THREE.Group();
  bladesPivot.position.set(0, 9.6, 2.65);

  for (let i = 0; i < 4; i++) {
    const armGroup = new THREE.Group();
    armGroup.rotation.z = (i * Math.PI) / 2;

    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.4, 0.18), mats.darkWood);
    spar.position.y = 2.7;
    spar.castShadow = true;
    armGroup.add(spar);

    for (let r = 0; r < 5; r++) {
      const batten = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.08), mats.darkWood);
      batten.position.set(0.62, 1.2 + r * 0.92, 0.02);
      armGroup.add(batten);
    }

    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 4.2), mats.canvas);
    sail.position.set(0.62, 3.1, 0.05);
    sail.castShadow = true;
    armGroup.add(sail);

    bladesPivot.add(armGroup);
  }

  group.add(bladesPivot);
  return { group, bladesPivot };
}

/**
 * Builds the tall metal/timber farm wheel windmill.
 */
export function buildFarmWindmill(mats: WorldMaterials): {
  group: THREE.Group;
  wheelPivot: THREE.Group;
} {
  const group = new THREE.Group();

  const legGeo = new THREE.CylinderGeometry(0.1, 0.14, 9.6, 6);
  const corners = [
    [-0.9, -0.9],
    [0.9, -0.9],
    [0.9, 0.9],
    [-0.9, 0.9],
  ];
  for (const [cx, cz] of corners) {
    const leg = new THREE.Mesh(legGeo, mats.iron);
    leg.position.set(cx * 0.75, 4.7, cz * 0.75);
    leg.lookAt(0, 10.5, 0);
    leg.rotateX(Math.PI / 2);
    leg.castShadow = true;
    group.add(leg);
  }

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.5), mats.darkWood);
  head.position.set(0, 9.5, 0);
  group.add(head);

  const tailVane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.8), mats.iron);
  tailVane.position.set(0, 9.6, -1.6);
  group.add(tailVane);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 9.5, 0.9);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 6, 18), mats.iron);
  wheelPivot.add(rim);

  for (let i = 0; i < 10; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.65, 0.05), mats.silverBlade);
    const angle = (i / 10) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, 0);
    blade.rotation.z = angle + 0.35;
    blade.rotation.y = 0.35;
    wheelPivot.add(blade);
  }
  group.add(wheelPivot);

  return { group, wheelPivot };
}

/**
 * Builds a wooden village cart (4 spoked wheels, slatted bed, front poles).
 */
export function buildWoodenCart(mats: WorldMaterials): THREE.Group {
  const g = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 2.7), mats.wood);
  bed.position.y = 0.85;
  bed.castShadow = true;
  g.add(bed);

  const sideGeo = new THREE.BoxGeometry(0.12, 0.65, 2.7);
  for (const sx of [-0.82, 0.82]) {
    const side = new THREE.Mesh(sideGeo, mats.wood);
    side.position.set(sx, 1.22, 0);
    side.castShadow = true;
    g.add(side);
  }

  const wheelGeo = new THREE.TorusGeometry(0.55, 0.09, 8, 16);
  wheelGeo.rotateY(Math.PI / 2);
  for (const wx of [-0.95, 0.95]) {
    for (const wz of [-0.85, 0.85]) {
      const w = new THREE.Mesh(wheelGeo, mats.darkWood);
      w.position.set(wx, 0.58, wz);
      w.castShadow = true;
      g.add(w);

      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 5), mats.darkWood);
      spoke.position.set(wx, 0.58, wz);
      g.add(spoke);
    }
  }

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6);
  poleGeo.rotateX(Math.PI / 2);
  for (const px of [-0.45, 0.45]) {
    const p = new THREE.Mesh(poleGeo, mats.darkWood);
    p.position.set(px, 0.72, 1.9);
    g.add(p);
  }
  return g;
}

/**
 * Builds a canvas market stall tent with crates inside.
 */
export function buildMarketTent(mats: WorldMaterials): THREE.Group {
  const g = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 2.6, 6);
  for (const px of [-1.4, 1.4]) {
    for (const pz of [-1.2, 1.2]) {
      const post = new THREE.Mesh(postGeo, mats.darkWood);
      post.position.set(px, 1.3, pz);
      post.castShadow = true;
      g.add(post);
    }
  }
  const roof = new THREE.Mesh(createGableRoofGeometry(3.3, 1.0, 3.0), mats.canvas);
  roof.position.y = 2.45;
  roof.castShadow = true;
  g.add(roof);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.9), mats.wood);
  crate.position.set(-0.5, 0.375, 0.1);
  crate.castShadow = true;
  g.add(crate);

  return g;
}

/**
 * Builds a ribbed harvest pumpkin with curved stem.
 */
export function buildPumpkin(mats: WorldMaterials, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), mats.pumpkin);
  body.scale.set(1.15, 0.82, 1.15);
  body.position.y = 0.31;
  body.castShadow = true;
  g.add(body);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.18, 6), mats.darkWood);
  stem.position.y = 0.64;
  stem.rotation.z = 0.25;
  g.add(stem);

  g.scale.setScalar(scale);
  return g;
}

/**
 * Builds a Campfire with stone ring, crossed logs, iron cauldron tripod, and ember core.
 */
export function buildCampfire(mats: WorldMaterials): {
  group: THREE.Group;
  flameMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 1), mats.stone);
    rock.position.set(Math.cos(a) * 0.76, 0.12, Math.sin(a) * 0.76);
    rock.scale.set(1.2, 0.7, 1.0);
    group.add(rock);
  }

  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.15, 7), mats.bark);
    log.position.y = 0.14;
    log.rotation.z = Math.PI / 2 - 0.15;
    log.rotation.y = (i * Math.PI) / 4;
    group.add(log);
  }

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.0, 6), mats.iron);
    pole.position.set(Math.cos(a) * 0.45, 0.9, Math.sin(a) * 0.45);
    pole.lookAt(0, 1.9, 0);
    pole.rotateX(Math.PI / 2);
    group.add(pole);
  }

  const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), mats.iron);
  cauldron.position.y = 0.82;
  cauldron.scale.set(1, 0.85, 1);
  group.add(cauldron);

  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.72, 8), mats.emberGlow);
  flameMesh.position.y = 0.42;
  group.add(flameMesh);

  return { group, flameMesh };
}

/**
 * Builds an Iron Sanctuary Brazier (Quest 2 objective).
 */
export function buildBrazier(mats: WorldMaterials): {
  group: THREE.Group;
  flameMesh: THREE.Mesh;
  beaconRing: THREE.Mesh;
} {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.4, 8), mats.stone);
  base.position.y = 0.2;
  base.castShadow = true;
  group.add(base);

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.1, 8), mats.iron);
  stand.position.y = 0.95;
  stand.castShadow = true;
  group.add(stand);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.3, 0.45, 10), mats.iron);
  bowl.position.y = 1.65;
  bowl.castShadow = true;
  group.add(bowl);

  const flameMat = mats.emberGlow.clone();
  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.95, 8), flameMat);
  flameMesh.position.y = 2.15;
  flameMesh.visible = false;
  group.add(flameMesh);

  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x6ba6ff,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.05, 24), beaconMat);
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.06;
  group.add(beaconRing);

  return { group, flameMesh, beaconRing };
}

/**
 * Builds a Sacred Bell Shard pickup pedestal & floating glowing relic.
 */
export function buildBellShard(mats: WorldMaterials): {
  group: THREE.Group;
  relicMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.85, 8), mats.stone);
  pedestal.position.y = 0.425;
  pedestal.castShadow = true;
  group.add(pedestal);

  const relicMat = new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    emissive: 0xff9d2e,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.85,
  });
  const relicMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), relicMat);
  relicMesh.position.y = 1.55;
  group.add(relicMesh);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.82, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffc663,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  return { group, relicMesh };
}

/**
 * Builds a Lost Lore Scroll / Cursed Tome pedestal.
 */
export function buildLoreScroll(mats: WorldMaterials): {
  group: THREE.Group;
  scrollMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.9, 8), mats.stone);
  post.position.y = 0.45;
  group.add(post);

  const scrollMat = new THREE.MeshStandardMaterial({
    color: 0x89d6ff,
    emissive: 0x3895d3,
    emissiveIntensity: 1.5,
    roughness: 0.35,
  });
  const scrollMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 10), scrollMat);
  scrollMesh.position.y = 1.25;
  scrollMesh.rotation.z = 0.4;
  group.add(scrollMesh);

  return { group, scrollMesh };
}

/**
 * Builds the Oathbound Hunter (Player Character) — realistic layered trench-coat,
 * leather boots, draped cloak, broad-brimmed hunter hat, forged blade, & iron lantern.
 */
export interface PlayerRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  swordArm: THREE.Group;
  lanternArm: THREE.Group;
  lanternFlame: THREE.Mesh;
  shadowDisc: THREE.Mesh;
  bladeMat: THREE.MeshStandardMaterial;
  capeMat: THREE.MeshStandardMaterial;
}

export function buildPlayerCharacter(mats: WorldMaterials): PlayerRig {
  const group = new THREE.Group();

  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.78, 20), mats.shadowDisc);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  group.add(shadowDisc);

  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const coatMat = new THREE.MeshStandardMaterial({
    color: 0x19232c,
    map: mats.shroud.map,
    normalMap: mats.shroud.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.84,
    metalness: 0.08,
  });
  const capeMat = new THREE.MeshStandardMaterial({
    color: 0x3c1b1e,
    map: mats.shroud.map,
    normalMap: mats.shroud.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.88,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb79b8a, roughness: 0.65 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x1e1917, roughness: 0.62, metalness: 0.14 });
  const bladeMat = mats.silverBlade.clone();

  // Articulated leather-booted legs (tapered cylinders)
  const legGeo = new THREE.CylinderGeometry(0.11, 0.085, 0.72, 10);
  const leftLeg = new THREE.Mesh(legGeo, leatherMat);
  leftLeg.position.set(-0.16, 0.36, 0);
  leftLeg.castShadow = true;
  bodyPivot.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, leatherMat);
  rightLeg.position.set(0.16, 0.36, 0);
  rightLeg.castShadow = true;
  bodyPivot.add(rightLeg);

  // Flared tailored greatcoat via LatheGeometry
  const coatPts = [
    new THREE.Vector2(0.46, 0.35),
    new THREE.Vector2(0.36, 0.72),
    new THREE.Vector2(0.28, 1.05),
    new THREE.Vector2(0.33, 1.42),
    new THREE.Vector2(0.22, 1.54),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(coatPts, 14), coatMat);
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Leather belt & brass buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.31, 0.1, 14), leatherMat);
  belt.position.y = 1.03;
  bodyPivot.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.08), mats.brass);
  buckle.position.set(0, 1.03, 0.3);
  bodyPivot.add(buckle);

  // Layered shoulder mantle & back cloak
  const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.52, 14, 1, true), capeMat);
  mantle.position.set(0, 1.35, -0.04);
  mantle.castShadow = true;
  bodyPivot.add(mantle);

  // Sculpted head + leather high collar + wide-brimmed hunter tricorn hat
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skinMat);
  head.scale.set(0.92, 1.08, 0.96);
  head.position.y = 1.7;
  head.castShadow = true;
  bodyPivot.add(head);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.16, 12, 1, true), capeMat);
  collar.position.y = 1.58;
  bodyPivot.add(collar);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.05, 16), leatherMat);
  brim.position.y = 1.84;
  brim.rotation.x = 0.06;
  brim.castShadow = true;
  bodyPivot.add(brim);

  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.08, 14), mats.brass);
  hatBand.position.y = 1.89;
  bodyPivot.add(hatBand);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.34, 14), leatherMat);
  crown.position.y = 2.04;
  bodyPivot.add(crown);

  // Right Arm + Forged Silver Longsword
  const swordArm = new THREE.Group();
  swordArm.position.set(0.4, 1.38, 0);
  const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.52, 8), coatMat);
  rArm.position.y = -0.22;
  swordArm.add(rArm);

  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), mats.brass);
  pommel.position.set(0, -0.46, 0.04);
  swordArm.add(pommel);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.22, 6), leatherMat);
  grip.rotation.x = Math.PI / 2;
  grip.position.set(0, -0.46, 0.14);
  swordArm.add(grip);

  const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.065, 0.08), mats.brass);
  crossguard.position.set(0, -0.46, 0.24);
  swordArm.add(crossguard);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.095, 1.18), bladeMat);
  blade.position.set(0, -0.46, 0.84);
  blade.castShadow = true;
  swordArm.add(blade);
  bodyPivot.add(swordArm);

  // Left Arm + Iron-Caged Glowing Oath-Lantern
  const lanternArm = new THREE.Group();
  lanternArm.position.set(-0.4, 1.38, 0.08);
  const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.48, 8), coatMat);
  lArm.position.y = -0.2;
  lanternArm.add(lArm);

  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.14, 8), mats.iron);
  lanternCap.position.set(0, -0.41, 0.22);
  lanternArm.add(lanternCap);

  const lanternCage = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.24, 6, 1, true), mats.iron);
  lanternCage.position.set(0, -0.56, 0.22);
  lanternArm.add(lanternCage);

  const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 6), mats.iron);
  lanternBase.position.set(0, -0.69, 0.22);
  lanternArm.add(lanternBase);

  const lanternFlame = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffd07a,
      emissive: 0xff8c1a,
      emissiveIntensity: 3.2,
    }),
  );
  lanternFlame.position.set(0, -0.56, 0.22);
  lanternArm.add(lanternFlame);
  bodyPivot.add(lanternArm);

  return {
    group,
    bodyPivot,
    leftLeg,
    rightLeg,
    swordArm,
    lanternArm,
    lanternFlame,
    shadowDisc,
    bladeMat,
    capeMat,
  };
}

/**
 * Builds Elder Mirek NPC with layered robes, cowl hood, sculpted pale face, and gnarled ember staff.
 */
export function buildElderMirek(mats: WorldMaterials): THREE.Group {
  const g = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.68, 16), mats.shadowDisc);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);

  const robePts = [
    new THREE.Vector2(0.52, 0),
    new THREE.Vector2(0.42, 0.5),
    new THREE.Vector2(0.32, 1.05),
    new THREE.Vector2(0.28, 1.38),
  ];
  const robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 14), mats.darkWood);
  robe.castShadow = true;
  g.add(robe);

  const shawl = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.45, 12, 1, true), mats.shroud);
  shawl.position.y = 1.24;
  g.add(shawl);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), mats.corpseSkin);
  face.position.set(0, 1.52, 0.05);
  g.add(face);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.56, 12), mats.wood);
  hood.position.set(0, 1.62, -0.03);
  hood.rotation.x = -0.15;
  g.add(hood);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 1.95, 7), mats.bark);
  staff.position.set(0.45, 0.96, 0.2);
  staff.castShadow = true;
  g.add(staff);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), mats.emberGlow);
  orb.position.set(0.45, 1.98, 0.2);
  g.add(orb);

  return g;
}

/**
 * Builds 3 distinct Enemy Archetype meshes (`crawler`, `weaver`, `brute`) with horror silhouette details:
 * - `weaver` (Wisp Weaver): Pale tattered burial gown, ashen face, draped glossy wet black hair strands,
 *   and a single piercing blood-red eye peeking through the hair (inspired by the horror reference portrait).
 * - `crawler` (Fog Crawler): Gaunt hunched ghoul in tattered shroud with matted black locks & glowing eyes.
 * - `brute` (Cursed Revenant / Hollow Warden): Heavy blackened plate, horned helm, crimson visor & cleaver.
 */
export interface EnemyRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  telegraphRing: THREE.Mesh;
  hitMeshes: THREE.Mesh[];
}

export function buildEnemyModel(archetype: EnemyArchetype, mats: WorldMaterials): EnemyRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);
  const hitMeshes: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(archetype === 'brute' ? 1.25 : 0.72, 16),
    mats.shadowDisc,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);

  const telegraphMat = new THREE.MeshBasicMaterial({
    color: archetype === 'weaver' ? 0xd92626 : 0xff3b30,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(archetype === 'brute' ? 1.5 : 0.85, archetype === 'brute' ? 1.9 : 1.15, 24),
    telegraphMat,
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.06;
  group.add(telegraphRing);

  if (archetype === 'crawler') {
    const flesh = mats.corpseSkin.clone();
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff5a52, emissive: 0xd91c18, emissiveIntensity: 2.6 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.96, 10), flesh);
    torso.rotation.x = Math.PI / 2.2;
    torso.position.set(0, 0.56, 0.02);
    torso.castShadow = true;
    bodyGroup.add(torso);
    hitMeshes.push(torso);

    const rags = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.65, 10, 1, true), mats.shroud);
    rags.position.set(0, 0.52, -0.15);
    rags.rotation.x = -Math.PI / 2.4;
    bodyGroup.add(rags);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), flesh);
    skull.scale.set(0.92, 1.05, 1.12);
    skull.position.set(0, 0.72, 0.58);
    bodyGroup.add(skull);
    hitMeshes.push(skull);

    // Matted black hair locks over hunched head
    for (let h = 0; h < 6; h++) {
      const a = -0.7 + h * 0.28;
      const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.012, 0.52, 5), mats.wetHair);
      lock.position.set(Math.sin(a) * 0.2, 0.62, 0.55 + Math.cos(a) * 0.14);
      lock.rotation.z = Math.sin(a) * 0.25;
      bodyGroup.add(lock);
    }

    for (const ex of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), eyeMat);
      eye.position.set(ex, 0.74, 0.82);
      bodyGroup.add(eye);
    }

    const limbGeo = new THREE.CylinderGeometry(0.065, 0.045, 0.62, 7);
    for (const sx of [-0.34, 0.34]) {
      for (const sz of [-0.32, 0.32]) {
        const leg = new THREE.Mesh(limbGeo, flesh);
        leg.position.set(sx, 0.3, sz);
        bodyGroup.add(leg);
      }
    }
  } else if (archetype === 'weaver') {
    // Haunted Spectral Entity — pale tattered burial gown, wet draped black hair, single blood-red eye
    const shroudMat = mats.shroud.clone();
    const faceMat = mats.corpseSkin.clone();

    // Sculpted flared burial gown via LatheGeometry
    const gownPts = [
      new THREE.Vector2(0.56, 0.05),
      new THREE.Vector2(0.46, 0.45),
      new THREE.Vector2(0.32, 0.95),
      new THREE.Vector2(0.24, 1.35),
      new THREE.Vector2(0.29, 1.62),
      new THREE.Vector2(0.14, 1.72),
    ];
    const cloak = new THREE.Mesh(new THREE.LatheGeometry(gownPts, 16), shroudMat);
    cloak.castShadow = true;
    bodyGroup.add(cloak);
    hitMeshes.push(cloak);

    // Tattered fluttering hem strips around the gown base
    for (let s = 0; s < 8; s++) {
      const ang = (s / 8) * Math.PI * 2;
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.62), shroudMat);
      strip.position.set(Math.sin(ang) * 0.48, 0.32, Math.cos(ang) * 0.48);
      strip.rotation.y = ang;
      strip.rotation.x = 0.14;
      bodyGroup.add(strip);
    }

    // Sculpted pale ashen head & dark recessed sockets
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), faceMat);
    head.scale.set(0.88, 1.14, 0.96);
    head.position.set(0, 1.92, 0.04);
    head.castShadow = true;
    bodyGroup.add(head);
    hitMeshes.push(head);

    // Dark eye-socket hollow & shadowed mouth
    const socketMat = new THREE.MeshStandardMaterial({ color: 0x0b0f12, roughness: 0.85 });
    const leftSocket = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), socketMat);
    leftSocket.scale.set(1.2, 0.78, 0.5);
    leftSocket.position.set(-0.075, 1.95, 0.21);
    bodyGroup.add(leftSocket);

    // Single piercing blood-red eye staring out from the parted hair!
    const redEye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), mats.crimsonEye);
    redEye.position.set(-0.075, 1.95, 0.242);
    bodyGroup.add(redEye);

    // Cascading wet glossy black hair dome & long draped strands (covering right side of face & shoulders)
    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.248, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      mats.wetHair,
    );
    hairCrown.position.set(0, 1.96, 0.02);
    hairCrown.rotation.x = -0.18;
    bodyGroup.add(hairCrown);

    for (let i = 0; i < 14; i++) {
      // Leave a narrow gap over the left blood-red eye (-0.36 rad), shroud the rest!
      const ang = -Math.PI * 0.85 + (i / 13) * Math.PI * 1.75;
      if (Math.abs(ang + 0.34) < 0.16) continue;
      const len = i % 2 === 0 ? 1.05 : 0.82;
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.012, len, 6), mats.wetHair);
      const rad = 0.235;
      strand.position.set(
        Math.sin(ang) * rad,
        1.94 - len * 0.44,
        0.03 + Math.cos(ang) * rad,
      );
      strand.rotation.z = Math.sin(ang) * 0.16;
      strand.rotation.x = Math.cos(ang) * 0.1;
      bodyGroup.add(strand);
    }

    // Gaunt reaching pale arms with tattered sleeves
    for (const side of [-1, 1]) {
      const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.48, 8, 1, true), shroudMat);
      sleeve.position.set(side * 0.3, 1.48, 0.22);
      sleeve.rotation.x = Math.PI * 0.42;
      sleeve.rotation.z = -side * 0.2;
      bodyGroup.add(sleeve);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.48, 7), faceMat);
      arm.position.set(side * 0.28, 1.46, 0.38);
      arm.rotation.x = Math.PI * 0.45;
      bodyGroup.add(arm);
    }
  } else {
    // Hollow Warden / Cursed Revenant (Heavy Armored Boss & Brute)
    const armor = new THREE.MeshStandardMaterial({
      color: 0x262126,
      normalMap: mats.stone.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.42,
      metalness: 0.76,
    });
    const eyeMat = mats.crimsonEye;

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 1.5, 10), armor);
    chest.scale.set(1.12, 1, 0.82);
    chest.position.y = 1.65;
    chest.castShadow = true;
    bodyGroup.add(chest);
    hitMeshes.push(chest);

    const tatteredCloak = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.65, 10, 1, true), mats.shroud);
    tatteredCloak.position.set(0, 1.35, -0.22);
    tatteredCloak.rotation.x = 0.14;
    bodyGroup.add(tatteredCloak);

    for (const sx of [-0.85, 0.85]) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 10), armor);
      pauldron.scale.set(1.05, 0.85, 1.0);
      pauldron.position.set(sx, 2.25, 0);
      bodyGroup.add(pauldron);
    }

    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.56, 10), armor);
    helm.position.y = 2.66;
    bodyGroup.add(helm);
    hitMeshes.push(helm);

    for (const hx of [-0.26, 0.26]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 7), mats.stone);
      horn.position.set(hx, 3.08, 0);
      horn.rotation.z = hx < 0 ? 0.38 : -0.38;
      bodyGroup.add(horn);
    }

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.085, 0.12), eyeMat);
    visor.position.set(0, 2.66, 0.32);
    bodyGroup.add(visor);

    const cleaver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 1.92), mats.silverBlade);
    cleaver.position.set(0.92, 1.45, 0.72);
    cleaver.castShadow = true;
    bodyGroup.add(cleaver);

    for (const lx of [-0.36, 0.36]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.96, 8), armor);
      leg.position.set(lx, 0.48, 0);
      bodyGroup.add(leg);
    }
  }

  return { group, bodyGroup, telegraphRing, hitMeshes };
}

/**
 * Populates instanced gnarled dead forest trees with furrowed bark normal maps and 3-tier branching,
 * plus mossy valley boulders.
 */
export function buildInstancedForestAndRocks(
  scene: THREE.Scene,
  mats: WorldMaterials,
  circles: CircleCollider[],
): void {
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.44, 6.6, 8);
  trunkGeo.translate(0, 3.3, 0);

  const branchGeo = new THREE.CylinderGeometry(0.04, 0.15, 3.3, 6);
  branchGeo.translate(0, 1.65, 0);

  const twigGeo = new THREE.CylinderGeometry(0.02, 0.07, 2.1, 5);
  twigGeo.translate(0, 1.05, 0);

  const treeCount = 155;
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.bark, treeCount);
  const branchesA = new THREE.InstancedMesh(branchGeo, mats.bark, treeCount);
  const branchesB = new THREE.InstancedMesh(branchGeo, mats.bark, treeCount);
  const branchesC = new THREE.InstancedMesh(twigGeo, mats.bark, treeCount);
  trunks.castShadow = true;
  trunks.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;

  for (let i = 0; i < 320 && placed < treeCount; i++) {
    const angle = i * 2.39996;
    const radius = 22 + ((i * 19.7) % 66);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (roadMaskAt(x, z) > 0.02) continue;
    if (Math.hypot(x + 26, z + 34) < 8) continue;
    if (Math.hypot(x - 30, z - 14) < 8) continue;
    if (Math.hypot(x - 34, z + 26) < 9) continue;
    if (Math.hypot(x + 36, z - 10) < 7) continue;

    const y = groundHeightAt(x, z) - 0.18;
    const s = 0.85 + ((i * 7) % 10) * 0.06;
    const rotY = (i * 1.1) % (Math.PI * 2);

    dummy.position.set(x, y, z);
    dummy.rotation.set(((i % 5) - 2) * 0.05, rotY, ((i % 3) - 1) * 0.05);
    dummy.scale.set(s, s * (0.9 + (i % 4) * 0.12), s);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);

    color.setHex(0x8e9aa2).offsetHSL(0, 0, ((i % 5) - 2) * 0.03);
    trunks.setColorAt(placed, color);

    // Primary fork A
    dummy.position.set(x, y + 3.7 * s, z);
    dummy.rotation.set(0.48, rotY, 0.58);
    dummy.scale.setScalar(s * 0.92);
    dummy.updateMatrix();
    branchesA.setMatrixAt(placed, dummy.matrix);

    // Primary fork B
    dummy.position.set(x, y + 4.4 * s, z);
    dummy.rotation.set(-0.42, rotY + 2.2, -0.62);
    dummy.scale.setScalar(s * 0.82);
    dummy.updateMatrix();
    branchesB.setMatrixAt(placed, dummy.matrix);

    // Upper crooked twig fork C
    dummy.position.set(x, y + 5.2 * s, z);
    dummy.rotation.set(0.32, rotY + 4.1, -0.45);
    dummy.scale.setScalar(s * 0.78);
    dummy.updateMatrix();
    branchesC.setMatrixAt(placed, dummy.matrix);

    if (radius < 70) {
      circles.push({ id: `tree_${placed}`, x, z, radius: 0.55 * s });
    }
    placed++;
  }

  trunks.count = placed;
  branchesA.count = placed;
  branchesB.count = placed;
  branchesC.count = placed;
  trunks.instanceMatrix.needsUpdate = true;
  branchesA.instanceMatrix.needsUpdate = true;
  branchesB.instanceMatrix.needsUpdate = true;
  branchesC.instanceMatrix.needsUpdate = true;
  if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  branchesA.computeBoundingSphere();
  branchesB.computeBoundingSphere();
  branchesC.computeBoundingSphere();

  scene.add(trunks, branchesA, branchesB, branchesC);

  // Instanced mossy valley boulders
  const rockGeo = new THREE.DodecahedronGeometry(1.1, 1);
  const rockCount = 55;
  const rocks = new THREE.InstancedMesh(rockGeo, mats.stone, rockCount);
  rocks.receiveShadow = true;
  rocks.castShadow = true;
  let rPlaced = 0;

  for (let i = 0; i < 120 && rPlaced < rockCount; i++) {
    const a = i * 1.71;
    const rad = 18 + ((i * 13.3) % 58);
    const rx = Math.cos(a) * rad;
    const rz = Math.sin(a) * rad;
    if (roadMaskAt(rx, rz) > 0.05) continue;
    const ry = groundHeightAt(rx, rz);
    const rs = 0.6 + (i % 5) * 0.25;
    dummy.position.set(rx, ry + rs * 0.3, rz);
    dummy.rotation.set(i * 0.4, i * 0.9, 0);
    dummy.scale.set(rs * 1.25, rs * 0.68, rs);
    dummy.updateMatrix();
    rocks.setMatrixAt(rPlaced, dummy.matrix);
    if (rad < 68) circles.push({ id: `rock_${rPlaced}`, x: rx, z: rz, radius: rs * 0.9 });
    rPlaced++;
  }
  rocks.count = rPlaced;
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
  scene.add(rocks);
}

/**
 * Helper to build a segment of rustic split-rail wooden fence.
 */
export function buildFenceLine(
  mats: WorldMaterials,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  boxes: BoxCollider[],
  idPrefix: string,
): THREE.Group {
  const g = new THREE.Group();
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const posts = Math.max(2, Math.round(len / 2.6) + 1);

  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    const px = ax + dx * t;
    const pz = az + dz * t;
    const py = groundHeightAt(px, pz);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.14), mats.darkWood);
    post.position.set(px, py + 0.55, pz);
    post.castShadow = true;
    g.add(post);
  }

  const mx = (ax + bx) * 0.5;
  const mz = (az + bz) * 0.5;
  const my = groundHeightAt(mx, mz);

  for (const ry of [0.45, 0.85]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, len), mats.wood);
    rail.position.set(mx, my + ry, mz);
    rail.rotation.y = angle;
    g.add(rail);
  }

  boxes.push({
    id: idPrefix,
    x: mx,
    z: mz,
    halfW: 0.25,
    halfD: len * 0.5,
    rotationY: angle,
  });

  return g;
}

/**
 * Builds a composite 3D gatherable Resource Node (`herb`, `ore`, `wood`).
 */
export function buildResourceNode(kind: ResourceKind, mats: WorldMaterials): THREE.Group {
  const g = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.65, 12), mats.shadowDisc);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);

  if (kind === 'herb') {
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b53, roughness: 0.78 });
    const bloomMat = new THREE.MeshStandardMaterial({
      color: 0x80ffe0,
      emissive: 0x2cd4a7,
      emissiveIntensity: 1.6,
      roughness: 0.35,
    });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 6), leafMat);
      leaf.position.set(Math.cos(a) * 0.22, 0.3, Math.sin(a) * 0.22);
      leaf.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
      g.add(leaf);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const bloom = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), bloomMat);
      bloom.position.set(Math.cos(a) * 0.16, 0.62, Math.sin(a) * 0.16);
      g.add(bloom);
    }
  } else if (kind === 'ore') {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), mats.stone);
    rock.scale.set(1.2, 0.72, 1.1);
    rock.position.y = 0.32;
    rock.castShadow = true;
    g.add(rock);

    const veinMat = new THREE.MeshStandardMaterial({
      color: 0x8fb8d6,
      emissive: 0x2a6a96,
      emissiveIntensity: 1.1,
      roughness: 0.22,
      metalness: 0.88,
    });
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), veinMat);
      shard.position.set((i - 1) * 0.24, 0.55 + (i % 2) * 0.14, (i % 2 === 0 ? 1 : -1) * 0.14);
      shard.rotation.set(0.3 * i, 0.5 * i, 0.2);
      g.add(shard);
    }
  } else {
    const logGeo = new THREE.CylinderGeometry(0.16, 0.18, 1.15, 8);
    logGeo.rotateZ(Math.PI / 2);
    const positions = [
      [0, 0.17, -0.18],
      [0, 0.17, 0.18],
      [0, 0.44, 0],
    ];
    for (const [lx, ly, lz] of positions) {
      const log = new THREE.Mesh(logGeo, mats.bark);
      log.position.set(lx, ly, lz);
      log.castShadow = true;
      g.add(log);
    }
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.62), mats.iron);
    strap.position.set(0, 0.28, 0);
    g.add(strap);
  }

  return g;
}

/**
 * Builds a composite 3D Crafting Station (Anvil Forge + Alchemist Table).
 */
export function buildCraftingStation(
  variant: 'alchemy' | 'anvil',
  mats: WorldMaterials,
): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 1.4), mats.stone);
  base.position.y = 0.14;
  base.receiveShadow = true;
  g.add(base);

  if (variant === 'anvil') {
    const block = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.72, 10), mats.bark);
    block.position.set(-0.35, 0.64, 0);
    block.castShadow = true;
    g.add(block);

    const anvilBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 0.36), mats.iron);
    anvilBody.position.set(-0.35, 1.16, 0);
    anvilBody.castShadow = true;
    g.add(anvilBody);

    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.48, 8), mats.iron);
    horn.rotation.z = Math.PI / 2;
    horn.position.set(-0.85, 1.2, 0);
    g.add(horn);

    const forge = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.85, 10), mats.stone);
    forge.position.set(0.55, 0.68, 0);
    g.add(forge);

    const coals = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mats.emberGlow);
    coals.scale.set(1, 0.4, 1);
    coals.position.set(0.55, 1.12, 0);
    g.add(coals);
  } else {
    for (const lx of [-0.78, 0.78]) {
      for (const lz of [-0.42, 0.42]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), mats.darkWood);
        leg.position.set(lx, 0.72, lz);
        g.add(leg);
      }
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 1.05), mats.wood);
    top.position.y = 1.2;
    top.castShadow = true;
    g.add(top);

    const vialMat = new THREE.MeshStandardMaterial({
      color: 0xff5a52,
      emissive: 0xb8241d,
      emissiveIntensity: 1.2,
      roughness: 0.18,
    });
    const flaskMat = new THREE.MeshStandardMaterial({
      color: 0xffbe55,
      emissive: 0xc27a18,
      emissiveIntensity: 1.2,
      roughness: 0.18,
    });
    const vial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), vialMat);
    vial.position.set(-0.45, 1.42, 0.1);
    g.add(vial);

    const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.34, 10), flaskMat);
    flask.position.set(0.15, 1.43, -0.1);
    g.add(flask);

    const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.26, 10), mats.stone);
    mortar.position.set(0.55, 1.38, 0.12);
    g.add(mortar);
  }

  return g;
}
