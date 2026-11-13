import * as THREE from 'three';

export interface VillageTextures {
  woodMap: THREE.CanvasTexture;
  woodNormal: THREE.CanvasTexture;
  woodRoughness: THREE.CanvasTexture;
  roofMap: THREE.CanvasTexture;
  roofNormal: THREE.CanvasTexture;
  roofRoughness: THREE.CanvasTexture;
  groundMap: THREE.CanvasTexture;
  groundNormal: THREE.CanvasTexture;
  groundRoughness: THREE.CanvasTexture;
  stoneMap: THREE.CanvasTexture;
  stoneNormal: THREE.CanvasTexture;
  stoneRoughness: THREE.CanvasTexture;
  barkMap: THREE.CanvasTexture;
  barkNormal: THREE.CanvasTexture;
  clothMap: THREE.CanvasTexture;
  clothNormal: THREE.CanvasTexture;
  canvasMap: THREE.CanvasTexture;
  pumpkinMap: THREE.CanvasTexture;
  pumpkinNormal: THREE.CanvasTexture;
  mistMap: THREE.CanvasTexture;
  shadowDiscMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash2D(ix: number, iy: number, period: number, seed: number): number {
  const wx = ((ix % period) + period) % period;
  const wy = ((iy % period) + period) % period;
  let h = (wx * 374761393 + wy * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function tileNoise2D(u: number, v: number, freq: number, seed: number): number {
  const x = u * freq;
  const y = v * freq;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2D(ix, iy, freq, seed);
  const n10 = hash2D(ix + 1, iy, freq, seed);
  const n01 = hash2D(ix, iy + 1, freq, seed);
  const n11 = hash2D(ix + 1, iy + 1, freq, seed);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fbmTile(u: number, v: number, baseFreq: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let freq = baseFreq;
  for (let o = 0; o < octaves; o++) {
    sum += tileNoise2D(u, v, freq, seed + o * 31) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/**
 * Generates a tileable tangent-space normal map canvas via Sobel gradients from a height buffer [0..1].
 */
function heightBufferToNormalCanvas(
  height: Float32Array,
  w: number,
  h: number,
  strength: number,
): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const data = img.data;

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return height[wy * w + wx];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = tr + 2 * r + br - (tl + 2 * l + bl);
      const dy = bl + 2 * b + br - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      data[idx] = clampByte((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = clampByte((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = clampByte((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAniso || 1);
  tex.needsUpdate = true;
  return tex;
}

export function createVillageTextures(renderer: THREE.WebGLRenderer): VillageTextures {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // 1. Weathered Gothic Timber Planks (512x512 Albedo + Normal + Roughness)
  const wSize = 512;
  const [woodC, woodCtx] = makeCanvas(wSize, wSize);
  const [woodRC, woodRCtx] = makeCanvas(wSize, wSize);
  const woodImg = woodCtx.createImageData(wSize, wSize);
  const woodRImg = woodRCtx.createImageData(wSize, wSize);
  const woodHeight = new Float32Array(wSize * wSize);

  const plankCount = 8;
  for (let y = 0; y < wSize; y++) {
    const v = y / wSize;
    for (let x = 0; x < wSize; x++) {
      const u = x / wSize;
      const plankF = u * plankCount;
      const plankIdx = Math.floor(plankF);
      const localU = plankF - plankIdx;
      const plankSeed = 11 + plankIdx * 19;

      // Deep vertical seam between planks
      const edgeDist = Math.min(localU, 1 - localU);
      const bevel = Math.min(1, edgeDist * 18);

      // Stretched vertical wood grain + knots
      const warp = fbmTile(u * 2, v, 4, 3, plankSeed) * 0.14;
      const grain = Math.sin((localU + warp) * 34 + fbmTile(u, v * 0.5, 8, 3, plankSeed + 3) * 6);
      const fineFiber = fbmTile(u * 6, v * 0.6, 16, 3, plankSeed + 7);
      const moisture = fbmTile(u, v, 4, 3, 97);
      const plankTint = ((plankIdx * 37) % 13) - 6;

      const hVal = Math.max(0, Math.min(1, bevel * (0.48 + grain * 0.16 + fineFiber * 0.28)));
      woodHeight[y * wSize + x] = hVal;

      const base = (48 + plankTint + grain * 8 + fineFiber * 16 - (1 - bevel) * 26) * (0.82 + moisture * 0.24);
      const mossMix = Math.max(0, moisture - 0.64) * 1.4;
      const r = clampByte(base * 0.84 - mossMix * 12);
      const g = clampByte(base * 0.94 + mossMix * 14);
      const b = clampByte(base * 1.04 - mossMix * 6);

      const rough = clampByte(215 - moisture * 55 + (1 - bevel) * 35 - fineFiber * 18);

      const idx = (y * wSize + x) * 4;
      woodImg.data[idx] = r;
      woodImg.data[idx + 1] = g;
      woodImg.data[idx + 2] = b;
      woodImg.data[idx + 3] = 255;

      woodRImg.data[idx] = rough;
      woodRImg.data[idx + 1] = rough;
      woodRImg.data[idx + 2] = rough;
      woodRImg.data[idx + 3] = 255;
    }
  }
  woodCtx.putImageData(woodImg, 0, 0);
  woodRCtx.putImageData(woodRImg, 0, 0);
  const woodNC = heightBufferToNormalCanvas(woodHeight, wSize, wSize, 2.8);

  // 2. Wet Split-Slate / Moss Shingles (512x512 Albedo + Normal + Roughness)
  const rSize = 512;
  const [roofC, roofCtx] = makeCanvas(rSize, rSize);
  const [roofRC, roofRCtx] = makeCanvas(rSize, rSize);
  const roofImg = roofCtx.createImageData(rSize, rSize);
  const roofRImg = roofRCtx.createImageData(rSize, rSize);
  const roofHeight = new Float32Array(rSize * rSize);

  const rRows = 10;
  const rCols = 8;
  for (let y = 0; y < rSize; y++) {
    const v = y / rSize;
    const rowF = v * rRows;
    const rowIdx = Math.floor(rowF);
    const rowLocal = rowF - rowIdx;
    const rowOffset = (rowIdx % 2) * 0.5;
    for (let x = 0; x < rSize; x++) {
      const u = x / rSize;
      const colF = u * rCols + rowOffset;
      const colIdx = Math.floor(colF);
      const colLocal = colF - colIdx;

      const tileSeed = ((rowIdx * 31 + colIdx * 17) & 63) + 5;
      const noise = fbmTile(u, v, 8, 4, 211);
      const chip = fbmTile(u * 2, v * 2, 16, 2, tileSeed) * 0.12;
      const gapX = Math.min(colLocal, 1 - colLocal);
      const bevelX = Math.min(1, gapX * 14);
      const overlap = 1 - rowLocal;
      const ridgeLip = rowLocal > 0.88 - chip * 0.4 ? Math.max(0, (1 - rowLocal) * 6) : 1;

      const hVal = Math.max(0, Math.min(1, bevelX * ridgeLip * (0.35 + overlap * 0.45 + noise * 0.2)));
      roofHeight[y * rSize + x] = hVal;

      const tileTone = ((tileSeed * 19) % 22) - 11;
      const moss = Math.max(0, noise - 0.62) * 1.9;
      const shade = (38 + tileTone + overlap * 16 + noise * 14) * (0.45 + ridgeLip * 0.55) * (0.55 + bevelX * 0.45);
      const r = clampByte(shade * 0.78 - moss * 8);
      const g = clampByte(shade * 0.94 + moss * 34);
      const b = clampByte(shade * 1.12 - moss * 12);

      // Wet slate is glossy on stone centers, matte in mossy/grout seams
      const rough = clampByte(125 + moss * 95 + (1 - ridgeLip) * 85 - noise * 25);

      const idx = (y * rSize + x) * 4;
      roofImg.data[idx] = r;
      roofImg.data[idx + 1] = g;
      roofImg.data[idx + 2] = b;
      roofImg.data[idx + 3] = 255;

      roofRImg.data[idx] = rough;
      roofRImg.data[idx + 1] = rough;
      roofRImg.data[idx + 2] = rough;
      roofRImg.data[idx + 3] = 255;
    }
  }
  roofCtx.putImageData(roofImg, 0, 0);
  roofRCtx.putImageData(roofRImg, 0, 0);
  const roofNC = heightBufferToNormalCanvas(roofHeight, rSize, rSize, 3.2);

  // 3. Damp Earth, Cobble Pebbles & Moss Ground (512x512 Albedo + Normal + Roughness)
  const gSize = 512;
  const [gndC, gndCtx] = makeCanvas(gSize, gSize);
  const [gndRC, gndRCtx] = makeCanvas(gSize, gSize);
  const gndImg = gndCtx.createImageData(gSize, gSize);
  const gndRImg = gndRCtx.createImageData(gSize, gSize);
  const gndHeight = new Float32Array(gSize * gSize);

  for (let y = 0; y < gSize; y++) {
    const v = y / gSize;
    for (let x = 0; x < gSize; x++) {
      const u = x / gSize;
      const macro = fbmTile(u, v, 6, 4, 307);
      const micro = fbmTile(u, v, 24, 3, 419);
      const pebble = Math.max(0, tileNoise2D(u, v, 32, 503) - 0.62) * 2.4;

      const hVal = Math.max(0, Math.min(1, macro * 0.45 + micro * 0.35 + pebble * 0.3));
      gndHeight[y * gSize + x] = hVal;

      // Neutral-light base so terrain vertexColors tint accurately while retaining pebble & mud micro-contrast
      const lum = 132 + (macro - 0.5) * 44 + (micro - 0.5) * 32 + pebble * 36;
      const puddle = Math.max(0, 0.36 - macro) * 2.6;
      const rough = clampByte(228 - puddle * 145 - pebble * 35);

      const idx = (y * gSize + x) * 4;
      gndImg.data[idx] = clampByte(lum * 0.96);
      gndImg.data[idx + 1] = clampByte(lum * 1.0);
      gndImg.data[idx + 2] = clampByte(lum * 1.03);
      gndImg.data[idx + 3] = 255;

      gndRImg.data[idx] = rough;
      gndRImg.data[idx + 1] = rough;
      gndRImg.data[idx + 2] = rough;
      gndRImg.data[idx + 3] = 255;
    }
  }
  gndCtx.putImageData(gndImg, 0, 0);
  gndRCtx.putImageData(gndRImg, 0, 0);
  const gndNC = heightBufferToNormalCanvas(gndHeight, gSize, gSize, 2.4);

  // 4. Dressed Gothic Ashlar Stone & Mossy Mortar (256x256 Albedo + Normal + Roughness)
  const sSize = 256;
  const [stoneC, stoneCtx] = makeCanvas(sSize, sSize);
  const [stoneRC, stoneRCtx] = makeCanvas(sSize, sSize);
  const stoneImg = stoneCtx.createImageData(sSize, sSize);
  const stoneRImg = stoneRCtx.createImageData(sSize, sSize);
  const stoneHeight = new Float32Array(sSize * sSize);

  const sRows = 6;
  const sCols = 4;
  for (let y = 0; y < sSize; y++) {
    const v = y / sSize;
    const rF = v * sRows;
    const rIdx = Math.floor(rF);
    const rLoc = rF - rIdx;
    const rOff = (rIdx % 2) * 0.5;
    for (let x = 0; x < sSize; x++) {
      const u = x / sSize;
      const cF = u * sCols + rOff;
      const cIdx = Math.floor(cF);
      const cLoc = cF - cIdx;

      const mortar = Math.min(Math.min(cLoc, 1 - cLoc) * 16, Math.min(rLoc, 1 - rLoc) * 16, 1);
      const grain = fbmTile(u, v, 10, 4, 613);
      const moss = Math.max(0, grain - 0.63) * 2.1;
      const tone = ((rIdx * 13 + cIdx * 29) % 18) - 9;

      stoneHeight[y * sSize + x] = mortar * (0.55 + grain * 0.45);
      const val = (88 + tone + grain * 28) * (0.42 + mortar * 0.58);
      const r = clampByte(val * 0.92 - moss * 14);
      const g = clampByte(val * 0.98 + moss * 28);
      const b = clampByte(val * 1.04 - moss * 12);
      const rough = clampByte(205 + (1 - mortar) * 40 + moss * 30 - grain * 25);

      const idx = (y * sSize + x) * 4;
      stoneImg.data[idx] = r;
      stoneImg.data[idx + 1] = g;
      stoneImg.data[idx + 2] = b;
      stoneImg.data[idx + 3] = 255;

      stoneRImg.data[idx] = rough;
      stoneRImg.data[idx + 1] = rough;
      stoneRImg.data[idx + 2] = rough;
      stoneRImg.data[idx + 3] = 255;
    }
  }
  stoneCtx.putImageData(stoneImg, 0, 0);
  stoneRCtx.putImageData(stoneRImg, 0, 0);
  const stoneNC = heightBufferToNormalCanvas(stoneHeight, sSize, sSize, 3.0);

  // 5. Furrowed Dead-Oak Bark (256x256 Albedo + Normal)
  const bSize = 256;
  const [barkC, barkCtx] = makeCanvas(bSize, bSize);
  const barkImg = barkCtx.createImageData(bSize, bSize);
  const barkHeight = new Float32Array(bSize * bSize);
  for (let y = 0; y < bSize; y++) {
    const v = y / bSize;
    for (let x = 0; x < bSize; x++) {
      const u = x / bSize;
      const warp = fbmTile(u, v, 6, 3, 701) * 0.25;
      const ridge = Math.abs(Math.sin((u + warp) * Math.PI * 14));
      const detail = fbmTile(u * 2, v * 0.5, 12, 3, 733);
      const hVal = Math.max(0, Math.min(1, ridge * 0.68 + detail * 0.32));
      barkHeight[y * bSize + x] = hVal;

      const lum = 22 + hVal * 34;
      const idx = (y * bSize + x) * 4;
      barkImg.data[idx] = clampByte(lum * 0.92);
      barkImg.data[idx + 1] = clampByte(lum * 0.95);
      barkImg.data[idx + 2] = clampByte(lum * 1.0);
      barkImg.data[idx + 3] = 255;
    }
  }
  barkCtx.putImageData(barkImg, 0, 0);
  const barkNC = heightBufferToNormalCanvas(barkHeight, bSize, bSize, 3.4);

  // 6. Tattered Linen / Burial Shroud Cloth (256x256 Albedo + Normal)
  const cSize = 256;
  const [clothC, clothCtx] = makeCanvas(cSize, cSize);
  const clothImg = clothCtx.createImageData(cSize, cSize);
  const clothHeight = new Float32Array(cSize * cSize);
  for (let y = 0; y < cSize; y++) {
    const v = y / cSize;
    for (let x = 0; x < cSize; x++) {
      const u = x / cSize;
      const weave = (Math.sin(x * 1.6) * 0.5 + 0.5) * 0.5 + (Math.sin(y * 1.6) * 0.5 + 0.5) * 0.5;
      const fold = Math.sin(u * Math.PI * 6 + fbmTile(u, v, 4, 2, 811) * 2.5) * 0.5 + 0.5;
      const grime = fbmTile(u, v, 6, 3, 829);
      const hVal = weave * 0.28 + fold * 0.72;
      clothHeight[y * cSize + x] = hVal;

      const stain = Math.max(0, v - 0.55) * 0.45 + Math.max(0, 0.45 - grime) * 0.35;
      const lum = 198 - stain * 92 + (fold - 0.5) * 30 + (weave - 0.5) * 14;
      const idx = (y * cSize + x) * 4;
      clothImg.data[idx] = clampByte(lum * 0.97);
      clothImg.data[idx + 1] = clampByte(lum * 0.98);
      clothImg.data[idx + 2] = clampByte(lum * 1.0);
      clothImg.data[idx + 3] = 255;
    }
  }
  clothCtx.putImageData(clothImg, 0, 0);
  const clothNC = heightBufferToNormalCanvas(clothHeight, cSize, cSize, 2.2);

  // 7. Weathered canvas tent cloth (256x256)
  const [canvC, canvCtx] = makeCanvas(256, 256);
  const canvRng = createRng(901);
  canvCtx.fillStyle = '#8b8878';
  canvCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    canvCtx.fillStyle = y % 6 === 0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.05)';
    canvCtx.fillRect(0, y, 256, 1.5);
  }
  for (let x = 0; x < 256; x += 3) {
    canvCtx.fillStyle = 'rgba(0,0,0,0.06)';
    canvCtx.fillRect(x, 0, 1, 256);
  }
  for (let i = 0; i < 65; i++) {
    canvCtx.fillStyle = `rgba(34, 38, 32, ${0.06 + canvRng() * 0.1})`;
    canvCtx.beginPath();
    canvCtx.arc(canvRng() * 256, canvRng() * 256, 6 + canvRng() * 22, 0, Math.PI * 2);
    canvCtx.fill();
  }

  // 8. Ribbed Mottled Pumpkin Skin (256x256 Albedo + Normal)
  const pSize = 256;
  const [pumpC, pumpCtx] = makeCanvas(pSize, pSize);
  const pumpImg = pumpCtx.createImageData(pSize, pSize);
  const pumpHeight = new Float32Array(pSize * pSize);
  for (let y = 0; y < pSize; y++) {
    const v = y / pSize;
    for (let x = 0; x < pSize; x++) {
      const u = x / pSize;
      const rib = Math.abs(Math.sin(u * Math.PI * 10));
      const bump = fbmTile(u, v, 10, 3, 955);
      pumpHeight[y * pSize + x] = rib * 0.72 + bump * 0.28;

      const shade = 0.56 + rib * 0.44 - (1 - bump) * 0.12;
      const idx = (y * pSize + x) * 4;
      pumpImg.data[idx] = clampByte(208 * shade);
      pumpImg.data[idx + 1] = clampByte(96 * shade);
      pumpImg.data[idx + 2] = clampByte(28 * shade);
      pumpImg.data[idx + 3] = 255;
    }
  }
  pumpCtx.putImageData(pumpImg, 0, 0);
  const pumpNC = heightBufferToNormalCanvas(pumpHeight, pSize, pSize, 2.5);

  // 9. Soft Drifting Ground Mist Alpha Texture (128x128)
  const [mistC, mistCtx] = makeCanvas(128, 128);
  const mistImg = mistCtx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    const ny = (y / 127) * 2 - 1;
    for (let x = 0; x < 128; x++) {
      const nx = (x / 127) * 2 - 1;
      const r = Math.hypot(nx, ny);
      const radial = Math.max(0, 1 - r);
      const falloff = radial * radial * (3 - 2 * radial);
      const wisp = fbmTile(x / 128, y / 128, 4, 3, 1021);
      const alpha = clampByte(falloff * (0.45 + wisp * 0.55) * 255);
      const idx = (y * 128 + x) * 4;
      mistImg.data[idx] = 178;
      mistImg.data[idx + 1] = 204;
      mistImg.data[idx + 2] = 224;
      mistImg.data[idx + 3] = alpha;
    }
  }
  mistCtx.putImageData(mistImg, 0, 0);

  // 10. Radial soft contact shadow disc
  const [shC, shCtx] = makeCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  shGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.38)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);

  const woodMap = configureTexture(woodC, true, maxAniso, 2, 2);
  const woodNormal = configureTexture(woodNC, false, maxAniso, 2, 2);
  const woodRoughness = configureTexture(woodRC, false, maxAniso, 2, 2);

  const roofMap = configureTexture(roofC, true, maxAniso, 3, 3);
  const roofNormal = configureTexture(roofNC, false, maxAniso, 3, 3);
  const roofRoughness = configureTexture(roofRC, false, maxAniso, 3, 3);

  const groundMap = configureTexture(gndC, true, maxAniso, 24, 24);
  const groundNormal = configureTexture(gndNC, false, maxAniso, 24, 24);
  const groundRoughness = configureTexture(gndRC, false, maxAniso, 24, 24);

  const stoneMap = configureTexture(stoneC, true, maxAniso, 2, 2);
  const stoneNormal = configureTexture(stoneNC, false, maxAniso, 2, 2);
  const stoneRoughness = configureTexture(stoneRC, false, maxAniso, 2, 2);

  const barkMap = configureTexture(barkC, true, maxAniso, 1, 2);
  const barkNormal = configureTexture(barkNC, false, maxAniso, 1, 2);

  const clothMap = configureTexture(clothC, true, maxAniso, 2, 2);
  const clothNormal = configureTexture(clothNC, false, maxAniso, 2, 2);

  const canvasMap = configureTexture(canvC, true, maxAniso, 2, 2);
  const pumpkinMap = configureTexture(pumpC, true, maxAniso, 1, 1);
  const pumpkinNormal = configureTexture(pumpNC, false, maxAniso, 1, 1);

  const mistMap = new THREE.CanvasTexture(mistC);
  mistMap.colorSpace = THREE.SRGBColorSpace;
  mistMap.needsUpdate = true;

  const shadowDiscMap = new THREE.CanvasTexture(shC);
  shadowDiscMap.needsUpdate = true;

  return {
    woodMap,
    woodNormal,
    woodRoughness,
    roofMap,
    roofNormal,
    roofRoughness,
    groundMap,
    groundNormal,
    groundRoughness,
    stoneMap,
    stoneNormal,
    stoneRoughness,
    barkMap,
    barkNormal,
    clothMap,
    clothNormal,
    canvasMap,
    pumpkinMap,
    pumpkinNormal,
    mistMap,
    shadowDiscMap,
    dispose: () => {
      woodMap.dispose();
      woodNormal.dispose();
      woodRoughness.dispose();
      roofMap.dispose();
      roofNormal.dispose();
      roofRoughness.dispose();
      groundMap.dispose();
      groundNormal.dispose();
      groundRoughness.dispose();
      stoneMap.dispose();
      stoneNormal.dispose();
      stoneRoughness.dispose();
      barkMap.dispose();
      barkNormal.dispose();
      clothMap.dispose();
      clothNormal.dispose();
      canvasMap.dispose();
      pumpkinMap.dispose();
      pumpkinNormal.dispose();
      mistMap.dispose();
      shadowDiscMap.dispose();
    },
  };
}
