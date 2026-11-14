import * as THREE from 'three';
import { SuitSkin } from './skins';

export interface WorldTextures {
  ballastMap: THREE.CanvasTexture;
  ballastBump: THREE.CanvasTexture;
  platformMap: THREE.CanvasTexture;
  buildingMapA: THREE.CanvasTexture;
  buildingMapB: THREE.CanvasTexture;
  grassTopMap: THREE.CanvasTexture;
  oakLogMap: THREE.CanvasTexture;
  leavesMap: THREE.CanvasTexture;
  brickMap: THREE.CanvasTexture;
  hazardRedWhite: THREE.CanvasTexture;
  hazardYellowBlack: THREE.CanvasTexture;
  trainSideRed: THREE.CanvasTexture;
  trainSideBlue: THREE.CanvasTexture;
  trainSideAmber: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  pixelated = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (pixelated) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapLinearFilter;
  }
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createWorldTextures(maxAnisotropy: number): WorldTextures {
  // Deterministic PRNG for clean repeatable Minecraft pixel tiles
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 1. Minecraft Cobblestone + Oak Sleeper Track Bed (16x16 pixel block grid)
  const [ballastC, bCtx] = makeCanvas(64, 64);
  const [ballastBumpC, bbCtx] = makeCanvas(64, 64);
  for (let y = 0; y < 64; y += 4) {
    for (let x = 0; x < 64; x += 4) {
      const shade = 78 + Math.floor(rand() * 44);
      bCtx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 4})`;
      bCtx.fillRect(x, y, 4, 4);
      const bShade = 100 + Math.floor(rand() * 110);
      bbCtx.fillStyle = `rgb(${bShade}, ${bShade}, ${bShade})`;
      bbCtx.fillRect(x, y, 4, 4);
    }
  }
  // Crisp Minecraft cobble seams
  bCtx.fillStyle = 'rgba(20, 24, 30, 0.35)';
  for (let y = 0; y < 64; y += 16) {
    bCtx.fillRect(0, y, 64, 2);
  }
  for (let x = 0; x < 64; x += 16) {
    bCtx.fillRect(x, 0, 2, 64);
  }
  // Oak plank railway sleepers
  for (const sy of [8, 40]) {
    bCtx.fillStyle = '#6b4423';
    bCtx.fillRect(4, sy, 56, 8);
    bCtx.fillStyle = '#4e3017';
    bCtx.fillRect(4, sy + 6, 56, 2);
    bbCtx.fillStyle = '#e5e5e5';
    bbCtx.fillRect(4, sy, 56, 8);
  }

  const ballastMap = configureTexture(ballastC, true, maxAnisotropy, 4, 16, true);
  const ballastBump = configureTexture(ballastBumpC, false, maxAnisotropy, 4, 16, true);

  // 2. Minecraft Stone Brick Rooftop Parapet / Sidewalk Slab
  const [platC, pCtx] = makeCanvas(64, 64);
  pCtx.fillStyle = '#9ca3af';
  pCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4) {
    for (let x = 0; x < 64; x += 4) {
      const v = 138 + Math.floor(rand() * 30);
      pCtx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 6})`;
      pCtx.fillRect(x, y, 4, 4);
    }
  }
  pCtx.fillStyle = '#4b5563';
  for (let y = 0; y < 64; y += 16) {
    pCtx.fillRect(0, y, 64, 2);
  }
  pCtx.fillRect(32, 0, 2, 16);
  pCtx.fillRect(16, 16, 2, 16);
  pCtx.fillRect(48, 16, 2, 16);
  pCtx.fillRect(32, 32, 2, 16);
  pCtx.fillRect(16, 48, 2, 16);
  const platformMap = configureTexture(platC, true, maxAnisotropy, 2, 14, true);

  // 3. Minecraft Pixel-Grid Skyscraper Facades (blocky windows & brick/stone blocks)
  const makeBuildingTex = (baseHex: string, mortarHex: string, winLitHex: string, winDarkHex: string) => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 128, 128);

    // Pixel noise
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        if (rand() > 0.65) {
          ctx.fillStyle = mortarHex;
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }

    // Voxel block window bays (8x8 blocks)
    for (let r = 0; r < 8; r++) {
      for (let col = 0; col < 8; col++) {
        const wx = col * 16 + 4;
        const wy = r * 16 + 4;
        const lit = ((r * 5 + col * 9) % 6) === 0;
        ctx.fillStyle = lit ? winLitHex : winDarkHex;
        ctx.fillRect(wx, wy, 8, 8);
        // Pixel highlight corner
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(wx, wy, 4, 4);
      }
    }
    return configureTexture(c, true, maxAnisotropy, 1, 2, true);
  };

  const buildingMapA = makeBuildingTex('#7c5a4a', '#644639', '#fef08a', '#1e293b');
  const buildingMapB = makeBuildingTex('#526071', '#424e5e', '#7dd3fc', '#0f172a');

  // 4. Minecraft Grass Top Block (16x16 pixel grid)
  const [grassC, gCtx] = makeCanvas(64, 64);
  for (let y = 0; y < 64; y += 4) {
    for (let x = 0; x < 64; x += 4) {
      const g = 112 + Math.floor(rand() * 44);
      gCtx.fillStyle = `rgb(${Math.floor(g * 0.48)}, ${g}, ${Math.floor(g * 0.34)})`;
      gCtx.fillRect(x, y, 4, 4);
    }
  }
  const grassTopMap = configureTexture(grassC, true, maxAnisotropy, 18, 6, true);

  // 5. Minecraft Oak Wood Log Bark (16x16 pixel stripes)
  const [logC, logCtx] = makeCanvas(32, 32);
  logCtx.fillStyle = '#6b4423';
  logCtx.fillRect(0, 0, 32, 32);
  for (let x = 0; x < 32; x += 4) {
    for (let y = 0; y < 32; y += 4) {
      logCtx.fillStyle = rand() > 0.45 ? '#553419' : '#7d522c';
      logCtx.fillRect(x, y, 4, 4);
    }
  }
  const oakLogMap = configureTexture(logC, true, maxAnisotropy, 1, 2, true);

  // 6. Minecraft Pixelated Leaves Block
  const [leafC, lfCtx] = makeCanvas(32, 32);
  for (let y = 0; y < 32; y += 4) {
    for (let x = 0; x < 32; x += 4) {
      const shade = rand();
      lfCtx.fillStyle = shade < 0.3 ? '#1e4d2b' : shade < 0.72 ? '#2e6f3e' : '#3e8c4f';
      lfCtx.fillRect(x, y, 4, 4);
    }
  }
  const leavesMap = configureTexture(leafC, true, maxAnisotropy, 2, 2, true);

  // 7. Minecraft Red Brick Block (used on McDonald's & chimneys!)
  const [brickC, brCtx] = makeCanvas(64, 64);
  brCtx.fillStyle = '#9b3a2b';
  brCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 16) {
    brCtx.fillStyle = '#cbd5e1';
    brCtx.fillRect(0, y, 64, 2);
    const offset = (y / 16) % 2 === 0 ? 0 : 16;
    for (let x = offset; x < 64; x += 32) {
      brCtx.fillRect(x, y, 2, 16);
    }
  }
  const brickMap = configureTexture(brickC, true, maxAnisotropy, 3, 2, true);

  // 8. Hazard stripes (pixel-crisp)
  const makeHazardTex = (c1: string, c2: string) => {
    const [c, ctx] = makeCanvas(128, 64);
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = c2;
    for (let x = -64; x < 192; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 16, 0);
      ctx.lineTo(x + 48, 64);
      ctx.lineTo(x + 32, 64);
      ctx.closePath();
      ctx.fill();
    }
    return configureTexture(c, true, maxAnisotropy, 2, 1, true);
  };

  const hazardRedWhite = makeHazardTex('#dc2626', '#f8fafc');
  const hazardYellowBlack = makeHazardTex('#eab308', '#18181b');

  // 9. Voxel Train Side Livery
  const makeTrainSide = (stripeColor: string, accentColor: string) => {
    const [c, ctx] = makeCanvas(256, 128);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#94a3b8';
    for (let y = 80; y < 124; y += 6) {
      ctx.fillRect(0, y, 256, 2);
    }
    ctx.fillStyle = stripeColor;
    ctx.fillRect(0, 62, 256, 18);
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 58, 256, 4);
    for (let x = 14; x < 240; x += 34) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, 20, 24, 32);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + 3, 23, 6, 26);
    }
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    [76, 178].forEach((dx) => {
      ctx.strokeRect(dx, 12, 26, 110);
    });
    return configureTexture(c, true, maxAnisotropy, 1, 1, true);
  };

  const trainSideRed = makeTrainSide('#b91c1c', '#f8fafc');
  const trainSideBlue = makeTrainSide('#1d4ed8', '#eab308');
  const trainSideAmber = makeTrainSide('#d97706', '#0f172a');

  // 10. Crisp square contact shadow
  const [shadowC, sCtx] = makeCanvas(64, 64);
  sCtx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  sCtx.fillRect(8, 8, 48, 48);
  const contactShadow = new THREE.CanvasTexture(shadowC);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.magFilter = THREE.NearestFilter;

  return {
    ballastMap,
    ballastBump,
    platformMap,
    buildingMapA,
    buildingMapB,
    grassTopMap,
    oakLogMap,
    leavesMap,
    brickMap,
    hazardRedWhite,
    hazardYellowBlack,
    trainSideRed,
    trainSideBlue,
    trainSideAmber,
    contactShadow,
  };
}

export interface SuitTextureSet {
  torsoFrontMap: THREE.CanvasTexture;
  torsoBackMap: THREE.CanvasTexture;
  torsoBump: THREE.CanvasTexture;
  headMap: THREE.CanvasTexture;
  legMap: THREE.CanvasTexture;
}

function drawSpiderEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  color: string,
  sketchy = false,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  // Blocky Spider Abdomen + Thorax
  ctx.fillRect(-7, -2, 14, 18);
  ctx.fillRect(-5, -12, 10, 10);

  ctx.lineWidth = sketchy ? 4.2 : 3.2;
  const legPairs = [
    [-5, -9, -18, -22, -22, -38],
    [-6, -4, -22, -12, -28, -26],
    [-6, 3, -24, 6, -28, 24],
    [-5, 10, -18, 24, -20, 40],
  ];
  for (const side of [-1, 1]) {
    for (const [x0, y0, x1, y1, x2, y2] of legPairs) {
      ctx.beginPath();
      ctx.moveTo(x0 * side, y0);
      ctx.lineTo(x1 * side, y1);
      ctx.lineTo(x2 * side, y2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function createSuitTextures(skin: SuitSkin, maxAnisotropy: number): SuitTextureSet {
  const makeTorsoFace = (isFront: boolean): [HTMLCanvasElement, HTMLCanvasElement] => {
    const [c, ctx] = makeCanvas(256, 256);
    const [bc, bCtx] = makeCanvas(256, 256);

    ctx.fillStyle = skin.primaryColor;
    ctx.fillRect(0, 0, 256, 256);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 256, 256);

    // Side & waist secondary color panels
    if (skin.patternType !== 'homemade') {
      ctx.fillStyle = skin.secondaryColor;
      ctx.fillRect(0, 48, 36, 208);
      ctx.fillRect(220, 48, 36, 208);
      ctx.fillRect(0, 214, 256, 42);
    }

    if (skin.patternType === 'tactical') {
      ctx.fillStyle = skin.accentColor;
      ctx.fillRect(32, 48, 12, 168);
      ctx.fillRect(212, 48, 12, 168);
      ctx.fillRect(0, 210, 256, 10);
    }

    if (skin.patternType === 'iron') {
      ctx.strokeStyle = skin.accentColor;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(36, 28);
      ctx.lineTo(128, 104);
      ctx.lineTo(220, 28);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(36, 180);
      ctx.lineTo(128, 224);
      ctx.lineTo(220, 180);
      ctx.stroke();
    }

    if (skin.patternType === 'raimi' || skin.patternType === 'symbiote' || skin.patternType === 'tactical') {
      const lineW = skin.patternType === 'raimi' ? 3 : 2;
      ctx.strokeStyle = skin.webColor;
      ctx.lineWidth = lineW;
      bCtx.strokeStyle = skin.patternType === 'raimi' ? '#f0f0f0' : '#b8b8b8';
      bCtx.lineWidth = lineW + 1;

      for (let y = 24; y < 220; y += 32) {
        ctx.beginPath();
        ctx.moveTo(36, y);
        ctx.lineTo(128, y + 10);
        ctx.lineTo(220, y);
        ctx.stroke();

        bCtx.beginPath();
        bCtx.moveTo(36, y);
        bCtx.lineTo(128, y + 10);
        bCtx.lineTo(220, y);
        bCtx.stroke();
      }
      for (let x = 44; x <= 212; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(128 + (x - 128) * 0.85, 218);
        ctx.stroke();

        bCtx.beginPath();
        bCtx.moveTo(x, 0);
        bCtx.lineTo(128 + (x - 128) * 0.85, 218);
        bCtx.stroke();
      }
    }

    const spiderScale =
      skin.patternType === 'homemade'
        ? 1.55
        : skin.patternType === 'symbiote'
          ? 1.4
          : skin.patternType === 'iron'
            ? 1.35
            : 1.1;

    const spiderColor = !isFront && skin.patternType === 'tactical' ? '#dc2626' : skin.spiderColor;
    drawSpiderEmblem(ctx, 128, 114, spiderScale, spiderColor, skin.patternType === 'homemade');
    drawSpiderEmblem(bCtx, 128, 114, spiderScale, '#ffffff', false);

    return [c, bc];
  };

  const [frontC, frontBumpC] = makeTorsoFace(true);
  const [backC] = makeTorsoFace(false);

  // Head cube texture
  const [headC, hCtx] = makeCanvas(128, 128);
  hCtx.fillStyle = skin.primaryColor;
  hCtx.fillRect(0, 0, 128, 128);
  if (skin.patternType === 'raimi' || skin.patternType === 'symbiote' || skin.patternType === 'tactical') {
    hCtx.strokeStyle = skin.webColor;
    hCtx.lineWidth = 2;
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      hCtx.beginPath();
      hCtx.moveTo(64, 64);
      hCtx.lineTo(64 + Math.cos(ang) * 72, 64 + Math.sin(ang) * 72);
      hCtx.stroke();
    }
    for (let r = 16; r <= 60; r += 16) {
      hCtx.beginPath();
      hCtx.arc(64, 64, r, 0, Math.PI * 2);
      hCtx.stroke();
    }
  } else if (skin.patternType === 'iron') {
    hCtx.strokeStyle = skin.accentColor;
    hCtx.lineWidth = 4;
    hCtx.beginPath();
    hCtx.moveTo(20, 30);
    hCtx.lineTo(64, 56);
    hCtx.lineTo(108, 30);
    hCtx.stroke();
  }

  // Leg cube texture
  const [legC, lCtx] = makeCanvas(64, 128);
  if (skin.patternType === 'homemade') {
    lCtx.fillStyle = '#25426b';
    lCtx.fillRect(0, 0, 64, 100);
    lCtx.fillStyle = '#1e3556';
    lCtx.fillRect(0, 0, 8, 100);
    lCtx.fillStyle = '#b91c1c';
    lCtx.fillRect(0, 100, 64, 22);
    lCtx.fillStyle = '#f8fafc';
    lCtx.fillRect(0, 122, 64, 6);
  } else {
    lCtx.fillStyle = skin.secondaryColor;
    lCtx.fillRect(0, 0, 64, 82);
    lCtx.fillStyle = skin.primaryColor;
    lCtx.fillRect(0, 82, 64, 46);
    if (skin.patternType === 'iron') {
      lCtx.fillStyle = skin.accentColor;
      lCtx.fillRect(0, 78, 64, 8);
    }
  }

  return {
    torsoFrontMap: configureTexture(frontC, true, maxAnisotropy, 1, 1, true),
    torsoBackMap: configureTexture(backC, true, maxAnisotropy, 1, 1, true),
    torsoBump: configureTexture(frontBumpC, false, maxAnisotropy, 1, 1, true),
    headMap: configureTexture(headC, true, maxAnisotropy, 1, 1, true),
    legMap: configureTexture(legC, true, maxAnisotropy, 1, 1, true),
  };
}
