import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GameAudio } from './audio';
import {
  createCoinMesh,
  createEnvironmentChunk,
  createFullBarrierMesh,
  createHeroRig,
  createHighBarrierMesh,
  createLowBarrierMesh,
  createMcDonaldsMesh,
  createPowerupMesh,
  createRampMesh,
  createStreetStartPlaza,
  createTrainCarMesh,
  createVenomRig,
  HeroRig,
  VenomRig,
} from './models';
import {
  createInitialRunnerState,
  LaneIndex,
  laneToX,
  PowerupKind,
  RunnerState,
  stepRunnerPhysics,
  switchLane,
  TrackCoin,
  TrackObstacle,
  TrackPowerup,
  TRAIN_HEIGHT,
  triggerJump,
  triggerSlide,
} from './runnerRules';
import { SkinId } from './skins';
import { createWorldTextures, WorldTextures } from './textures';

export type GameMode = 'title' | 'skins' | 'playing' | 'paused' | 'gameover';

export interface HudSnapshot {
  score: number;
  distance: number;
  runHalfCoins: number;
  speed: number;
  magnetRemaining: number;
  sneakersRemaining: number;
  stumbleWarning: boolean;
}

export interface SubwayController {
  setMode: (mode: GameMode) => void;
  setSkin: (skinId: SkinId) => void;
  startRun: (skipIntro?: boolean) => void;
  resetToTitle: () => void;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
}

interface ActiveObstacle {
  data: TrackObstacle;
  mesh: THREE.Group;
  hornPlayed?: boolean;
  smokeTimer?: number;
}

interface ActiveCoin {
  data: TrackCoin;
  mesh: THREE.Group;
}

interface ActivePowerup {
  data: TrackPowerup;
  mesh: THREE.Group;
}

interface ParticleSlot {
  active: boolean;
  age: number;
  life: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: THREE.Color;
}

const CHUNK_LENGTH = 36;
const CHUNK_COUNT = 8;
const TRAIN_LENGTH = 13.5;
const RAMP_LENGTH = 7.5;
const PARTICLE_POOL_SIZE = 140;

const _dummyMat = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyScale = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _camTarget = new THREE.Vector3();
const _camLook = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function mountSubwayScene(
  container: HTMLElement,
  initialSkin: SkinId,
  callbacks: {
    onHudUpdate: (snapshot: HudSnapshot) => void;
    onGameOver: (snapshot: HudSnapshot) => void;
    onModeChange?: (mode: GameMode) => void;
  },
): SubwayController {
  const isSoftwareGl = detectSoftwareWebGL();
  const audio = new GameAudio();

  // 1. Renderer & Scene
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xc7d8e8, 0.0085);
  scene.background = new THREE.Color(0xc7d8e8);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // Sky dome
  const sky = new Sky();
  sky.scale.setScalar(4500);
  scene.add(sky);
  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 4.5;
  skyUniforms['rayleigh'].value = 1.6;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.82;
  const sunVec = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(90 - 26);
  const theta = THREE.MathUtils.degToRad(148);
  sunVec.setFromSphericalCoords(1, phi, theta);
  skyUniforms['sunPosition'].value.copy(sunVec);

  // Camera — snapped immediately to frame street-level McDonald's, Peter & Venom on Title screen
  const camera = new THREE.PerspectiveCamera(
    54,
    (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
    0.1,
    360,
  );
  camera.position.set(-1.2, -3.4, 15.2);
  camera.lookAt(-3.2, -4.3, 7.6);

  // 2. Balanced Warm/Cool Studio Outdoor Lighting Rig
  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x475569, 0.85);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff3db, 2.2);
  sunLight.position.set(16, 28, 18);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 90;
  sunLight.shadow.camera.left = -16;
  sunLight.shadow.camera.right = 16;
  sunLight.shadow.camera.top = 24;
  sunLight.shadow.camera.bottom = -16;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
  rimLight.position.set(-14, 10, -24);
  scene.add(rimLight);

  // 3. Textures & Chunks
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures: WorldTextures = createWorldTextures(maxAniso);

  const chunks: THREE.Group[] = [];
  for (let i = 0; i < CHUNK_COUNT; i++) {
    const chunk = createEnvironmentChunk(CHUNK_LENGTH, textures);
    chunk.position.z = -CHUNK_LENGTH * 0.5 - i * CHUNK_LENGTH;
    scene.add(chunk);
    chunks.push(chunk);
  }

  const streetPlaza = createStreetStartPlaza(textures);
  scene.add(streetPlaza);

  // 4. Hero Character, McDonald's Street Start & Venom Chaser
  let activeSkin: SkinId = initialSkin;
  const hero: HeroRig = createHeroRig(activeSkin, textures, maxAniso);
  hero.setCivilianMode(true);
  hero.root.position.set(-4.2, -5.75, 9.5);
  scene.add(hero.root);

  const mcDonalds = createMcDonaldsMesh(textures);
  mcDonalds.position.set(-8.8, -6.0, 6.2);
  mcDonalds.rotation.y = Math.PI * 0.2;
  scene.add(mcDonalds);

  const venom: VenomRig = createVenomRig();
  venom.root.position.set(1.6, -6.0, 6.2);
  venom.root.lookAt(hero.root.position.x, -6.0, hero.root.position.z);
  venom.root.rotateY(Math.PI);
  scene.add(venom.root);

  // 5. Pooled InstancedMesh Particle Ring Buffer
  const particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_POOL_SIZE);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleMesh.frustumCulled = false;
  scene.add(particleMesh);

  const particles: ParticleSlot[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    active: false,
    age: 0,
    life: 0.4,
    px: 0,
    py: -100,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    size: 1,
    color: new THREE.Color(0xfacc15),
  }));
  let particleCursor = 0;

  const spawnBurst = (
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: number,
    speedScale = 1,
    upBias = 2.5,
  ) => {
    for (let i = 0; i < count; i++) {
      const slot = particles[particleCursor];
      particleCursor = (particleCursor + 1) % PARTICLE_POOL_SIZE;
      slot.active = true;
      slot.age = 0;
      slot.life = 0.28 + Math.random() * 0.3;
      slot.px = x + (Math.random() - 0.5) * 0.35;
      slot.py = y + (Math.random() - 0.5) * 0.25;
      slot.pz = z + (Math.random() - 0.5) * 0.35;
      slot.vx = (Math.random() - 0.5) * 5.2 * speedScale;
      slot.vy = upBias + Math.random() * 3.8 * speedScale;
      slot.vz = (Math.random() - 0.5) * 4.5 * speedScale;
      slot.size = 0.65 + Math.random() * 0.85;
      slot.color.setHex(hexColor);
    }
  };

  // 6. Dynamic Track Entities
  let mode: GameMode = 'title';
  let runner: RunnerState = createInitialRunnerState();
  let playerZ = 0;
  let nextWaveZ = -40; // Guarantee generous clear starting corridor
  let nextId = 1;
  let hitstopTimer = 0;
  let trauma = 0;
  let elapsedTime = 0;
  let footstepDist = 0;
  let hudTimer = 0;
  let introTimer = 0; // > 0 during McDonald's -> Suit Up -> Rooftop Leap sequence
  let introSuitedUp = false;
  const INTRO_DURATION = 0.85;

  const activeObstacles: ActiveObstacle[] = [];
  const activeCoins: ActiveCoin[] = [];
  const activePowerups: ActivePowerup[] = [];

  const clearEntities = () => {
    for (const o of activeObstacles) scene.remove(o.mesh);
    for (const c of activeCoins) scene.remove(c.mesh);
    for (const p of activePowerups) scene.remove(p.mesh);
    activeObstacles.length = 0;
    activeCoins.length = 0;
    activePowerups.length = 0;
  };

  const spawnCoinLine = (lane: LaneIndex, zStart: number, count: number, yBase = 0.85, arcHeight = 0) => {
    const x = laneToX(lane);
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const y = yBase + (arcHeight > 0 ? Math.sin(t * Math.PI) * arcHeight : 0);
      const z = zStart - i * 2.2;
      const mesh = createCoinMesh();
      mesh.position.set(x, y, z);
      scene.add(mesh);
      activeCoins.push({
        data: { id: nextId++, lane, x, y, z, collected: false },
        mesh,
      });
    }
  };

  const spawnPowerup = (lane: LaneIndex, z: number, y: number, kind: PowerupKind) => {
    const mesh = createPowerupMesh(kind);
    mesh.position.set(laneToX(lane), y, z);
    scene.add(mesh);
    activePowerups.push({
      data: { id: nextId++, kind, lane, y, z, collected: false },
      mesh,
    });
  };

  const addObstacle = (
    kind: TrackObstacle['kind'],
    lane: LaneIndex,
    zCenter: number,
    length: number,
    variant = 0,
    hasChimney = true,
    speed = 0,
  ) => {
    const zStart = zCenter + length * 0.5;
    const zEnd = zCenter - length * 0.5;
    let mesh: THREE.Group;
    if (kind === 'train_static' || kind === 'train_moving') {
      mesh = createTrainCarMesh(variant, length, textures, hasChimney);
    } else if (kind === 'ramp') {
      mesh = createRampMesh(length, textures);
    } else if (kind === 'barrier_low') {
      mesh = createLowBarrierMesh(textures);
    } else if (kind === 'barrier_high') {
      mesh = createHighBarrierMesh(textures);
    } else {
      mesh = createFullBarrierMesh(textures);
    }
    mesh.position.set(laneToX(lane), 0, zCenter);
    scene.add(mesh);
    activeObstacles.push({
      data: { id: nextId++, kind, lane, zStart, zEnd, speed, variant },
      mesh,
      smokeTimer: Math.random() * 0.4,
    });
  };

  const spawnWave = (zFront: number) => {
    const difficulty = Math.min(1, runner.distance / 1100);
    const lanes: LaneIndex[] = [-1, 0, 1];
    const openLane = lanes[Math.floor(Math.random() * lanes.length)];
    const otherLanes = lanes.filter((l) => l !== openLane);

    const roll = Math.random();

    if (roll < 0.28) {
      // Pattern A: Ramp + Walkable Train Roof + Blocking Chimney Train in another lane!
      const rampLane = openLane;
      const rampCenterZ = zFront - RAMP_LENGTH * 0.5;
      addObstacle('ramp', rampLane, rampCenterZ, RAMP_LENGTH, 0, false);

      const trainCenterZ = zFront - RAMP_LENGTH - TRAIN_LENGTH * 0.5;
      // Ramp-connected train has clear walkable roof (hasChimney = false)
      addObstacle('train_static', rampLane, trainCenterZ, TRAIN_LENGTH, Math.floor(Math.random() * 3), false);
      // Coin trail up ramp and along train roof!
      spawnCoinLine(rampLane, zFront - 1.5, 4, 1.3, 1.3);
      spawnCoinLine(rampLane, zFront - RAMP_LENGTH - 2.0, 5, TRAIN_HEIGHT + 0.85, 0);

      // Blocking train WITH PITCHED ROOF & CHIMNEY in adjacent lane
      const blockLane = otherLanes[0];
      addObstacle('train_static', blockLane, trainCenterZ + 2, TRAIN_LENGTH, 1, true);

      if (difficulty > 0.3) {
        addObstacle('barrier_low', otherLanes[1], zFront - 4, 0.8);
      } else {
        spawnCoinLine(otherLanes[1], zFront - 2, 4, 0.85);
      }

      // Occasional powerup on roof
      if (Math.random() < 0.25) {
        spawnPowerup(rampLane, trainCenterZ - 3, TRAIN_HEIGHT + 1.0, Math.random() < 0.5 ? 'magnet' : 'sneakers');
      }
      return zFront - RAMP_LENGTH - TRAIN_LENGTH - 15;
    }

    if (roll < 0.56) {
      // Pattern B: Blocking Chimney Trains + Low/High Jump & Slide Lane
      const trainLaneA = otherLanes[0];
      addObstacle('train_static', trainLaneA, zFront - TRAIN_LENGTH * 0.5, TRAIN_LENGTH, 0, true);

      if (Math.random() < 0.45 + difficulty * 0.35) {
        const trainLaneB = otherLanes[1];
        addObstacle('train_static', trainLaneB, zFront - TRAIN_LENGTH * 0.5 - 3, TRAIN_LENGTH, 2, true);
      } else {
        spawnCoinLine(otherLanes[1], zFront - 2, 5, 0.85);
      }

      // Open lane gets either jump-over barrier or slide-under barrier with matching coin arc!
      if (Math.random() < 0.55) {
        addObstacle('barrier_low', openLane, zFront - 6, 0.8);
        spawnCoinLine(openLane, zFront - 2.5, 5, 0.9, 1.75);
      } else {
        addObstacle('barrier_high', openLane, zFront - 6, 0.8);
        spawnCoinLine(openLane, zFront - 2.5, 5, 0.55, 0);
      }
      return zFront - TRAIN_LENGTH - 14;
    }

    if (roll < 0.78) {
      // Pattern C: Moving Oncoming Express Train (with chimney & headlights) + Roofed Shelter Block!
      const movingLane = otherLanes[0];
      addObstacle(
        'train_moving',
        movingLane,
        zFront - TRAIN_LENGTH * 0.5 - 12,
        TRAIN_LENGTH,
        0,
        true,
        10.5 + difficulty * 6,
      );

      // Roofed shelter with chimney in other non-open lane
      addObstacle('barrier_full', otherLanes[1], zFront - 7, 1.4);

      // Coin line in guaranteed clear lane
      spawnCoinLine(openLane, zFront - 2, 6, 0.85);
      if (Math.random() < 0.22) {
        spawnPowerup(openLane, zFront - 16, 1.0, Math.random() < 0.5 ? 'magnet' : 'sneakers');
      }
      return zFront - 26;
    }

    // Pattern D: Rhythm Parkour — Low Jump, High Slide, Roofed Shelter Sequence
    addObstacle('barrier_low', lanes[0], zFront - 4, 0.8);
    addObstacle('barrier_high', lanes[1], zFront - 4, 0.8);
    addObstacle('barrier_full', lanes[2], zFront - 4, 1.4);

    spawnCoinLine(lanes[0], zFront - 1, 4, 0.9, 1.65);
    spawnCoinLine(lanes[1], zFront - 1, 4, 0.55, 0);

    addObstacle('barrier_high', lanes[0], zFront - 16, 0.8);
    addObstacle('barrier_low', lanes[2], zFront - 16, 0.8);
    return zFront - 28;
  };

  const resetRunState = () => {
    clearEntities();
    runner = createInitialRunnerState();
    playerZ = 0;
    nextWaveZ = -42;
    hitstopTimer = 0;
    trauma = 0;
    footstepDist = 0;
    hero.root.position.set(0, 0, 0);

    for (let i = 0; i < CHUNK_COUNT; i++) {
      chunks[i].position.z = -CHUNK_LENGTH * 0.5 - i * CHUNK_LENGTH;
    }

    // Pre-populate upcoming track waves so world looks rich immediately!
    while (nextWaveZ > -190) {
      nextWaveZ = spawnWave(nextWaveZ);
    }

    callbacks.onHudUpdate({
      score: 0,
      distance: 0,
      runHalfCoins: 0,
      speed: runner.speed,
      magnetRemaining: 0,
      sneakersRemaining: 0,
      stumbleWarning: false,
    });
  };

  // Seed initial scene look
  resetRunState();

  // 7. Input Hygiene (Keyboard + Touch Swipes)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (mode !== 'playing') return;
    if (e.repeat) return;

    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      e.preventDefault();
      audio.unlock();
      if (switchLane(runner, -1)) audio.playSwitch();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      e.preventDefault();
      audio.unlock();
      if (switchLane(runner, 1)) audio.playSwitch();
    } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
      e.preventDefault();
      audio.unlock();
      triggerJump(runner);
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      e.preventDefault();
      audio.unlock();
      triggerSlide(runner);
    }
  };

  let touchStartX = 0;
  let touchStartY = 0;
  let touchSwiped = false;

  const handleTouchStart = (e: TouchEvent) => {
    if (mode !== 'playing' || e.touches.length === 0) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchSwiped = false;
    audio.unlock();
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (mode !== 'playing' || touchSwiped || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.hypot(dx, dy) < 28) return;
    touchSwiped = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (switchLane(runner, dx > 0 ? 1 : -1)) audio.playSwitch();
    } else if (dy < 0) {
      triggerJump(runner);
    } else {
      triggerSlide(runner);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
  renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: true });

  const handleResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = Math.max(1, container.clientHeight || window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', handleResize);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // 8. Main Animation Loop (Software WebGL Paced)
  let disposed = false;
  let frameId = 0;
  let lastNow = performance.now();

  const afterDraw = (cb: () => void) => {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    if (!sync) {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const poll = () => {
      if (disposed) return;
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  };

  const scheduleNext = () => {
    if (disposed) return;
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  };

  const emitHud = () => {
    callbacks.onHudUpdate({
      score: Math.round(runner.score),
      distance: Math.round(runner.distance),
      runHalfCoins: runner.runHalfCoins,
      speed: Math.round(runner.speed * 3.6),
      magnetRemaining: runner.magnetTimer,
      sneakersRemaining: runner.sneakersTimer,
      stumbleWarning: runner.stumbleCount > 0,
    });
  };

  const tick = () => {
    if (disposed) return;
    const now = performance.now();
    const rawDt = (now - lastNow) / 1000;
    lastNow = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    elapsedTime += dt;

    if (mode === 'playing') {
      if (introTimer > 0) {
        // Opening story: Venom spots Peter at McDonald's -> Peter suits up -> leaps onto rooftop!
        introTimer = Math.max(0, introTimer - dt);
        const p = 1 - introTimer / INTRO_DURATION; // 0 -> 1

        if (p < 0.3) {
          // Venom lunges toward Peter outside McDonald's
          const t0 = p / 0.3;
          hero.setCivilianMode(true);
          hero.root.position.set(-4.2 + t0 * 0.8, -5.75, 9.5 - t0 * 1.2);
          venom.root.position.set(1.6 - t0 * 2.5, -6.0, 6.2 + t0 * 1.4);
          venom.root.lookAt(hero.root.position.x, -6.0, hero.root.position.z);
          venom.root.rotateY(Math.PI);
          venom.updatePose(elapsedTime, true, elapsedTime * 12);
        } else {
          // Morph into selected Spider-Man suit + vault up onto the elevated rooftop!
          if (!introSuitedUp) {
            introSuitedUp = true;
            hero.setCivilianMode(false);
            audio.playPowerup();
            spawnBurst(hero.root.position.x, hero.root.position.y + 1.1, hero.root.position.z, 24, 0xef4444, 1.4, 3.0);
          }
          const t1 = (p - 0.3) / 0.7; // 0 -> 1 parabolic leap onto rooftop (0, 0, 0)
          const jumpArc = Math.sin(t1 * Math.PI) * 3.8;
          const hx = THREE.MathUtils.lerp(-3.4, 0, t1);
          const hy = THREE.MathUtils.lerp(-5.75, 0, t1) + jumpArc;
          const hz = THREE.MathUtils.lerp(8.3, 0, t1);
          hero.root.position.set(hx, hy, hz);

          const vx = THREE.MathUtils.lerp(-0.9, 0, t1);
          const vy = THREE.MathUtils.lerp(-6.0, 0, Math.max(0, t1 - 0.15) / 0.85) + Math.sin(t1 * Math.PI) * 3.0;
          const vz = THREE.MathUtils.lerp(7.6, 5.2, t1);
          venom.root.position.set(vx, vy, vz);
          venom.root.rotation.set(0, 0, 0);
          venom.updatePose(elapsedTime, true, elapsedTime * 14);
        }

        hero.updatePose({
          time: elapsedTime,
          distance: elapsedTime * 14,
          grounded: p < 0.3,
          vy: p >= 0.3 ? 8 : 0,
          sliding: false,
          laneTilt: 0,
          stumbling: false,
          mode: 'playing',
          groundOffset: p < 0.3 ? -5.75 : 0,
        });

        if (introTimer === 0) {
          hero.setCivilianMode(false);
          spawnBurst(0, 0.2, 0, 10, 0xe2e8f0, 0.9, 1.8);
          audio.playJump(false);
        }
      } else if (hitstopTimer > 0) {
        hitstopTimer = Math.max(0, hitstopTimer - dt);
      } else {
        const prevZ = playerZ;
        const obsList = activeObstacles.map((o) => o.data);
        const events = stepRunnerPhysics(runner, playerZ, { dt, obstacles: obsList });

        // Advance world forward along -Z
        playerZ = -runner.distance;
        const deltaDist = Math.abs(playerZ - prevZ);

        if (runner.grounded && runner.slideTimer <= 0) {
          footstepDist += deltaDist;
          if (footstepDist > 2.35) {
            footstepDist = 0;
            audio.playFootstep();
          }
        }

        if (events.jumped) {
          audio.playJump(runner.sneakersTimer > 0);
          spawnBurst(runner.x, runner.y + 0.15, playerZ, 7, 0xdbeafe, 0.7, 1.5);
        }
        if (events.landed) {
          spawnBurst(runner.x, runner.y + 0.1, playerZ, 8, 0x94a3b8, 0.85, 1.2);
        }
        if (events.slid) {
          audio.playSlide();
        }
        if (events.stumbled) {
          audio.playStumble();
          hitstopTimer = 0.045;
          trauma = 0.55;
          spawnBurst(runner.x, runner.y + 1.0, playerZ, 14, 0xf87171, 1.2, 3.0);
          emitHud();
        }
        if (events.crashed) {
          audio.playCrash();
          hitstopTimer = 0.07;
          trauma = 1.0;
          spawnBurst(runner.x, runner.y + 1.0, playerZ, 24, 0xef4444, 1.6, 4.0);
          mode = 'gameover';
          callbacks.onModeChange?.('gameover');
          const snap: HudSnapshot = {
            score: Math.round(runner.score),
            distance: Math.round(runner.distance),
            runHalfCoins: runner.runHalfCoins,
            speed: Math.round(runner.speed * 3.6),
            magnetRemaining: runner.magnetTimer,
            sneakersRemaining: runner.sneakersTimer,
            stumbleWarning: false,
          };
          callbacks.onGameOver(snap);
        }

        // Sync moving train meshes, horn audio, and chimney smoke puffs
        for (let i = activeObstacles.length - 1; i >= 0; i--) {
          const item = activeObstacles[i];
          if (item.data.kind === 'train_moving') {
            item.mesh.position.z = (item.data.zStart + item.data.zEnd) * 0.5;
            if (!item.hornPlayed && Math.abs(item.mesh.position.z - playerZ) < 42) {
              item.hornPlayed = true;
              audio.playTrainHorn();
            }
          }
          // Subtle chimney smoke puffs on chimney trains & roofed shelters
          if (
            (item.data.kind === 'train_static' && item.mesh.children.length > 7) ||
            item.data.kind === 'train_moving' ||
            item.data.kind === 'barrier_full'
          ) {
            item.smokeTimer = (item.smokeTimer ?? 0) - dt;
            if (item.smokeTimer <= 0 && item.mesh.position.z < playerZ + 5 && item.mesh.position.z > playerZ - 85) {
              item.smokeTimer = 0.22;
              const chimneyZ =
                item.data.kind === 'barrier_full'
                  ? item.mesh.position.z - 0.15
                  : item.mesh.position.z + TRAIN_LENGTH * 0.32;
              const chimneyY = item.data.kind === 'barrier_full' ? 3.35 : TRAIN_HEIGHT + 1.38;
              const chimneyX = item.data.kind === 'barrier_full' ? item.mesh.position.x + 0.45 : item.mesh.position.x;
              spawnBurst(chimneyX, chimneyY, chimneyZ, 1, 0xcbd5e1, 0.25, 2.2);
            }
          }
          // Recycle obstacles passed far behind camera
          if (item.data.zEnd > playerZ + 22) {
            scene.remove(item.mesh);
            activeObstacles.splice(i, 1);
          }
        }

        // Collect coins (1 coin pickup = 0.5 coin credit!) & spin
        let collectedCoinNow = false;
        for (let i = activeCoins.length - 1; i >= 0; i--) {
          const coin = activeCoins[i];
          coin.mesh.rotation.y += dt * 3.8;

          if (!coin.data.collected) {
            // Magnet attraction
            if (runner.magnetTimer > 0) {
              const distSq =
                (coin.data.x - runner.x) ** 2 +
                (coin.data.y - (runner.y + 0.9)) ** 2 +
                (coin.data.z - playerZ) ** 2;
              if (distSq < 120) {
                const pull = 1 - Math.exp(-14 * dt);
                coin.data.x += (runner.x - coin.data.x) * pull;
                coin.data.y += (runner.y + 0.95 - coin.data.y) * pull;
                coin.data.z += (playerZ - coin.data.z) * pull;
                coin.mesh.position.set(coin.data.x, coin.data.y, coin.data.z);
              }
            }

            const dx = Math.abs(coin.data.x - runner.x);
            const dy = Math.abs(coin.data.y - (runner.y + 0.9));
            const dz = Math.abs(coin.data.z - playerZ);
            if (dx < 0.95 && dy < 1.15 && dz < 1.05) {
              coin.data.collected = true;
              runner.runHalfCoins += 1; // +1 half-coin = +0.5 coin!
              runner.score += 15;
              collectedCoinNow = true;
              audio.playCoin();
              spawnBurst(coin.data.x, coin.data.y, coin.data.z, 6, 0xfacc15, 0.8, 2.2);
              scene.remove(coin.mesh);
              activeCoins.splice(i, 1);
              continue;
            }
          }

          if (coin.data.z > playerZ + 14) {
            scene.remove(coin.mesh);
            activeCoins.splice(i, 1);
          }
        }

        // Collect powerups
        for (let i = activePowerups.length - 1; i >= 0; i--) {
          const p = activePowerups[i];
          p.mesh.rotation.y += dt * 2.5;
          p.mesh.position.y = p.data.y + Math.sin(elapsedTime * 4 + p.data.id) * 0.12;

          const dx = Math.abs(laneToX(p.data.lane) - runner.x);
          const dy = Math.abs(p.data.y - (runner.y + 0.95));
          const dz = Math.abs(p.data.z - playerZ);
          if (dx < 1.05 && dy < 1.25 && dz < 1.1) {
            if (p.data.kind === 'magnet') runner.magnetTimer = 9.0;
            else runner.sneakersTimer = 9.0;
            audio.playPowerup();
            spawnBurst(laneToX(p.data.lane), p.data.y, p.data.z, 14, 0x38bdf8, 1.1, 3.0);
            scene.remove(p.mesh);
            activePowerups.splice(i, 1);
            emitHud();
            continue;
          }

          if (p.data.z > playerZ + 14) {
            scene.remove(p.mesh);
            activePowerups.splice(i, 1);
          }
        }

        // Recycle environment chunks endlessly
        for (const chunk of chunks) {
          if (chunk.position.z - CHUNK_LENGTH * 0.5 > playerZ + 22) {
            let minZ = chunk.position.z;
            for (const other of chunks) {
              if (other.position.z < minZ) minZ = other.position.z;
            }
            chunk.position.z = minZ - CHUNK_LENGTH;
          }
        }

        // Spawn upcoming obstacle/coin waves ahead of horizon
        while (nextWaveZ > playerZ - 180) {
          nextWaveZ = spawnWave(nextWaveZ);
        }

        hudTimer += dt;
        if (collectedCoinNow || hudTimer >= 0.08) {
          hudTimer = 0;
          emitHud();
        }
      }
    }

    // Update Hero Rig & Venom Chaser positions
    if (mode === 'title') {
      hero.setCivilianMode(true);
      hero.root.position.set(-4.2, -5.75, 9.5);
      venom.root.position.set(1.6, -6.0, 6.2);
      venom.root.lookAt(hero.root.position.x, -6.0, hero.root.position.z);
      venom.root.rotateY(Math.PI);
      venom.updatePose(elapsedTime, false, 0);
      hero.updatePose({
        time: elapsedTime,
        distance: 0,
        grounded: true,
        vy: 0,
        sliding: false,
        laneTilt: 0,
        stumbling: false,
        mode: 'title',
        groundOffset: -5.75,
      });
    } else if (mode === 'skins') {
      hero.setCivilianMode(false);
      hero.root.position.set(0, 0, 0);
      venom.root.position.set(0, -100, 0);
      hero.updatePose({
        time: elapsedTime,
        distance: 0,
        grounded: true,
        vy: 0,
        sliding: false,
        laneTilt: 0,
        stumbling: false,
        mode: 'skins',
        groundOffset: 0,
      });
    } else if (introTimer <= 0) {
      hero.setCivilianMode(false);
      hero.root.position.set(runner.x, runner.y, playerZ);
      const laneTilt = (laneToX(runner.targetLane) - runner.x) * 0.65;
      hero.updatePose({
        time: elapsedTime,
        distance: runner.distance,
        grounded: runner.grounded,
        vy: runner.vy,
        sliding: runner.slideTimer > 0,
        laneTilt,
        stumbling: runner.invulnTimer > 0,
        mode,
        groundOffset: runner.groundHeight,
      });

      // Venom chases closely behind when stumbling or at start of rooftop run!
      const targetVenomDist = runner.stumbleCount > 0 || runner.distance < 35 ? 3.8 : 9.5;
      const desiredVenomZ = mode === 'gameover' ? playerZ + 1.8 : playerZ + targetVenomDist;
      venom.root.position.x += (runner.x * 0.85 - venom.root.position.x) * (1 - Math.exp(-8 * dt));
      venom.root.position.y += (runner.y - venom.root.position.y) * (1 - Math.exp(-8 * dt));
      venom.root.position.z += (desiredVenomZ - venom.root.position.z) * (1 - Math.exp(-6 * dt));
      venom.root.rotation.y = 0;
      venom.updatePose(elapsedTime, mode === 'playing', runner.distance);
    }

    // Keep sun shadow frustum centered around hero
    sunLight.position.set(runner.x + 16, 28, playerZ + 18);
    sunLight.target.position.set(runner.x, 0, playerZ - 14);
    sunLight.target.updateMatrixWorld();

    // Update pooled particles
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = particles[i];
      if (!p.active) {
        _dummyScale.setScalar(0.0001);
        _dummyPos.set(0, -100, 0);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        particleMesh.setMatrixAt(i, _dummyMat);
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        _dummyScale.setScalar(0.0001);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        particleMesh.setMatrixAt(i, _dummyMat);
        continue;
      }
      p.vy -= 9.5 * dt;
      p.px += p.vx * dt;
      p.py += p.vy * dt;
      p.pz += p.vz * dt;
      const s = p.size * (1 - p.age / p.life);
      _dummyPos.set(p.px, p.py, p.pz);
      _dummyScale.setScalar(Math.max(0.01, s));
      _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
      particleMesh.setMatrixAt(i, _dummyMat);
      particleMesh.setColorAt(i, p.color);
    }
    particleMesh.instanceMatrix.needsUpdate = true;
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;

    // Camera choreography per mode
    trauma = Math.max(0, trauma - dt * 1.9);
    const shake = trauma * trauma;
    const shakeX = (Math.random() - 0.5) * 0.45 * shake;
    const shakeY = (Math.random() - 0.5) * 0.35 * shake;

    if (mode === 'title') {
      const orbitX = Math.sin(elapsedTime * 0.45) * 0.45;
      _camTarget.set(-1.2 + orbitX, -3.4, 15.2);
      _camLook.set(-3.2, -4.3, 7.6);
      camera.fov = THREE.MathUtils.damp(camera.fov, 54, 6, dt);
      camera.updateProjectionMatrix();
    } else if (mode === 'skins') {
      _camTarget.set(0.9, 1.65, 3.15);
      _camLook.set(0.32, 1.15, 0);
      camera.fov = THREE.MathUtils.damp(camera.fov, 46, 8, dt);
      camera.updateProjectionMatrix();
    } else if (mode === 'playing' && introTimer > 0) {
      _camTarget.set(
        hero.root.position.x + 2.8,
        hero.root.position.y + 2.6,
        hero.root.position.z + 6.2,
      );
      _camLook.set(hero.root.position.x * 0.6, hero.root.position.y + 1.1, hero.root.position.z - 2.0);
    } else {
      const speedNorm = THREE.MathUtils.clamp((runner.speed - 17.5) / 18.5, 0, 1);
      const targetFov = 60 + speedNorm * 10;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
        camera.updateProjectionMatrix();
      }
      _camTarget.set(
        runner.x * 0.72 + shakeX,
        3.65 + runner.y * 0.78 + shakeY,
        playerZ + 6.4,
      );
      _camLook.set(runner.x * 0.45, runner.y * 0.75 + 1.45, playerZ - 9.5);
    }

    const camAlpha = 1 - Math.exp(-10 * dt);
    camera.position.lerp(_camTarget, camAlpha);
    camera.lookAt(_camLook);
    if (mode === 'playing' && introTimer <= 0) {
      const tilt = (laneToX(runner.targetLane) - runner.x) * 0.65;
      camera.rotation.z += THREE.MathUtils.clamp(-tilt * 0.04, -0.05, 0.05);
    }

    renderer.render(scene, camera);
    scheduleNext();
  };

  tick();

  return {
    setMode(nextMode: GameMode) {
      const prevMode = mode;
      mode = nextMode;
      if (nextMode === 'skins' && prevMode !== 'skins') {
        camera.fov = 46;
        camera.updateProjectionMatrix();
        camera.position.set(0.9, 1.65, 3.15);
        camera.lookAt(0.32, 1.15, 0);
      } else if (nextMode === 'title' && prevMode !== 'title') {
        camera.fov = 54;
        camera.updateProjectionMatrix();
        camera.position.set(-1.2, -3.4, 15.2);
        camera.lookAt(-3.2, -4.3, 7.6);
      }
    },
    setSkin(skinId: SkinId) {
      activeSkin = skinId;
      hero.applySkin(skinId, maxAniso);
    },
    startRun(skipIntro = false) {
      audio.unlock();
      audio.stopCaughtMusic();
      resetRunState();
      introSuitedUp = skipIntro;
      introTimer = skipIntro ? 0 : INTRO_DURATION;
      hero.setCivilianMode(!skipIntro);
      if (skipIntro) {
        camera.fov = 60;
        camera.updateProjectionMatrix();
        camera.position.set(0, 3.65, 6.4);
        camera.lookAt(0, 1.45, -9.5);
      } else {
        hero.root.position.set(-4.2, -5.75, 9.5);
        venom.root.position.set(1.6, -6.0, 6.2);
        venom.root.lookAt(hero.root.position.x, -6.0, hero.root.position.z);
        venom.root.rotateY(Math.PI);
      }
      mode = 'playing';
    },
    resetToTitle() {
      audio.stopCaughtMusic();
      resetRunState();
      introTimer = 0;
      hero.setCivilianMode(true);
      hero.root.position.set(-4.2, -5.75, 9.5);
      venom.root.position.set(1.6, -6.0, 6.2);
      venom.root.lookAt(hero.root.position.x, -6.0, hero.root.position.z);
      venom.root.rotateY(Math.PI);
      camera.fov = 54;
      camera.updateProjectionMatrix();
      camera.position.set(-1.2, -3.4, 15.2);
      camera.lookAt(-3.2, -4.3, 7.6);
      mode = 'title';
    },
    setMuted(muted: boolean) {
      audio.setMuted(muted);
    },
    dispose() {
      disposed = true;
      audio.stopCaughtMusic();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      clearEntities();
      hero.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
