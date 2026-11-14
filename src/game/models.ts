import * as THREE from 'three';
import { LANE_WIDTH, PowerupKind, TRAIN_HEIGHT, TRAIN_WIDTH } from './runnerRules';
import { getSkinById, SkinId } from './skins';
import { createSuitTextures, SuitTextureSet, WorldTextures } from './textures';

export interface HeroRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  head: THREE.Mesh;
  leftLens: THREE.Mesh;
  rightLens: THREE.Mesh;
  leftRim: THREE.Mesh;
  rightRim: THREE.Mesh;
  faceCutout: THREE.Mesh;
  torso: THREE.Mesh;
  pelvis: THREE.Mesh;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftCuff: THREE.Mesh;
  rightCuff: THREE.Mesh;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  shadowDisc: THREE.Mesh;
  burgerGroup: THREE.Group;
  setCivilianMode: (isCivilian: boolean) => void;
  applySkin: (skinId: SkinId, maxAnisotropy: number) => void;
  updatePose: (params: {
    time: number;
    distance: number;
    grounded: boolean;
    vy: number;
    sliding: boolean;
    laneTilt: number;
    stumbling: boolean;
    mode: 'title' | 'skins' | 'playing' | 'paused' | 'gameover';
    groundOffset: number;
    isIntroLeap?: boolean;
  }) => void;
  dispose: () => void;
}

export function createHeroRig(
  initialSkinId: SkinId,
  worldTextures: WorldTextures,
  maxAnisotropy: number,
): HeroRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const suitFrontMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.1,
    bumpScale: 0.015,
  });
  const suitBackMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.1,
  });
  const suitSideMat = new THREE.MeshPhysicalMaterial({
    color: 0xd91e2a,
    roughness: 0.7,
    metalness: 0.1,
  });
  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.1,
  });
  const legMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.75,
    metalness: 0.08,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.35,
    metalness: 0.6,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.25,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.3,
    metalness: 0.55,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe6b89c,
    roughness: 0.75,
    metalness: 0.0,
  });

  // 1. Minecraft Blocky Pelvis & Voxel Torso (Front = -Z, face index 5)
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.25), legMat);
  pelvis.position.set(0, 0.82, 0);
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.6, 0.26),
    [suitSideMat, suitSideMat, suitSideMat, suitSideMat, suitBackMat, suitFrontMat],
  );
  torso.position.set(0, 1.19, 0);
  torso.castShadow = true;
  bodyPivot.add(torso);

  // 2. Minecraft Cube Head & Voxel Eye Lenses (Front = -Z)
  const headGeo = new THREE.BoxGeometry(0.44, 0.44, 0.44);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.71, 0);
  head.castShadow = true;
  bodyPivot.add(head);

  const lensGeo = new THREE.BoxGeometry(0.11, 0.075, 0.03);
  const rimGeo = new THREE.BoxGeometry(0.14, 0.105, 0.025);

  const leftRim = new THREE.Mesh(rimGeo, rimMat);
  leftRim.position.set(-0.095, 1.72, -0.225);
  leftRim.rotation.z = -0.18;
  bodyPivot.add(leftRim);

  const rightRim = new THREE.Mesh(rimGeo, rimMat);
  rightRim.position.set(0.095, 1.72, -0.225);
  rightRim.rotation.z = 0.18;
  bodyPivot.add(rightRim);

  const leftLens = new THREE.Mesh(lensGeo, lensMat);
  leftLens.position.set(-0.095, 1.72, -0.232);
  leftLens.rotation.z = -0.18;
  bodyPivot.add(leftLens);

  const rightLens = new THREE.Mesh(lensGeo, lensMat);
  rightLens.position.set(0.095, 1.72, -0.232);
  rightLens.rotation.z = 0.18;
  bodyPivot.add(rightLens);

  // 2002 Homemade Ski-Mask Cutout Strip
  const faceCutout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.075, 0.03), skinMat);
  faceCutout.position.set(0, 1.72, -0.226);
  bodyPivot.add(faceCutout);

  // 3. Minecraft Cube Arms with Cuffs & Gloves
  const buildArm = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.34, 1.44, 0);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.18), suitSideMat);
    upper.position.set(0, -0.14, 0);
    upper.castShadow = true;
    pivot.add(upper);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.28, 0.17), suitSideMat);
    lower.position.set(0, -0.41, -0.03);
    lower.rotation.x = -0.2;
    lower.castShadow = true;
    pivot.add(lower);

    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.07, 0.19), accentMat);
    cuff.position.set(0, -0.46, -0.05);
    cuff.rotation.x = -0.2;
    pivot.add(cuff);

    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.17), suitSideMat);
    glove.position.set(0, -0.55, -0.07);
    pivot.add(glove);

    bodyPivot.add(pivot);
    return { pivot, cuff };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // 4. Minecraft Cube Legs & Boots
  const buildLeg = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.125, 0.78, 0);

    const legBlock = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.66, 0.21), legMat);
    legBlock.position.set(0, -0.34, 0);
    legBlock.castShadow = true;
    pivot.add(legBlock);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.26), accentMat);
    boot.position.set(0, -0.71, -0.025);
    boot.castShadow = true;
    pivot.add(boot);

    bodyPivot.add(pivot);
    return pivot;
  };

  const leftLegPivot = buildLeg(-1);
  const rightLegPivot = buildLeg(1);

  // 5. Blocky Minecraft Contact Shadow Square
  const shadowGeo = new THREE.PlaneGeometry(1.1, 1.1);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: worldTextures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  // 6. Civilian Peter Parker Voxel Overlay (cube hair, face, jacket, jeans & voxel burger)
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x3f2718, roughness: 0.85 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.82 });
  const jeansMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.88 });
  const eyeDarkMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

  const peterHeadGroup = new THREE.Group();
  const peterFace = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skinMat);
  peterFace.position.set(0, 1.71, 0);
  peterHeadGroup.add(peterFace);
  const peterHairTop = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.14, 0.47), hairMat);
  peterHairTop.position.set(0, 1.88, 0.01);
  peterHeadGroup.add(peterHairTop);
  const peterHairBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.14), hairMat);
  peterHairBack.position.set(0, 1.73, 0.18);
  peterHeadGroup.add(peterHairBack);
  for (const xEye of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.02), eyeDarkMat);
    eye.position.set(xEye, 1.71, -0.225);
    peterHeadGroup.add(eye);
  }
  peterHeadGroup.visible = false;
  bodyPivot.add(peterHeadGroup);

  const peterJacket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.28), jacketMat);
  peterJacket.position.set(0, 1.19, 0);
  peterJacket.visible = false;
  bodyPivot.add(peterJacket);

  const peterJeans = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.16, 0.26), jeansMat);
  peterJeans.position.set(0, 0.82, 0);
  peterJeans.visible = false;
  bodyPivot.add(peterJeans);

  // Voxel 3D Burger held in right hand
  const burgerGroup = new THREE.Group();
  const bunMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  const pattyMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
  const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const lettuceMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });

  const bottomBun = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.24), bunMat);
  burgerGroup.add(bottomBun);
  const patty = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.045, 0.25), pattyMat);
  patty.position.y = 0.045;
  burgerGroup.add(patty);
  const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.26), cheeseMat);
  cheese.position.y = 0.075;
  burgerGroup.add(cheese);
  const lettuce = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.26), lettuceMat);
  lettuce.position.y = 0.095;
  burgerGroup.add(lettuce);
  const topBun = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.07, 0.23), bunMat);
  topBun.position.y = 0.14;
  burgerGroup.add(topBun);

  burgerGroup.position.set(0, -0.58, -0.14);
  burgerGroup.visible = false;
  rightArm.pivot.add(burgerGroup);

  let isCivilianActive = false;

  const setCivilianMode = (isCivilian: boolean) => {
    isCivilianActive = isCivilian;
    peterHeadGroup.visible = isCivilian;
    peterJacket.visible = isCivilian;
    peterJeans.visible = isCivilian;
    burgerGroup.visible = isCivilian;

    head.visible = !isCivilian;
    torso.visible = !isCivilian;
    pelvis.visible = !isCivilian;

    if (currentSkinId) {
      const skin = getSkinById(currentSkinId);
      faceCutout.visible = !isCivilian && skin.skinCutoutFace;
      leftLens.visible = !isCivilian && !skin.skinCutoutFace;
      rightLens.visible = !isCivilian && !skin.skinCutoutFace;
      leftRim.visible = !isCivilian && !skin.skinCutoutFace;
      rightRim.visible = !isCivilian && !skin.skinCutoutFace;
    }
  };

  let currentTextures: SuitTextureSet | null = null;
  let currentSkinId: SkinId | null = null;

  const applySkin = (skinId: SkinId, anisotropy: number) => {
    if (currentSkinId === skinId && currentTextures) return;
    currentSkinId = skinId;
    const skin = getSkinById(skinId);
    const nextTex = createSuitTextures(skin, anisotropy);

    if (currentTextures) {
      currentTextures.torsoFrontMap.dispose();
      currentTextures.torsoBackMap.dispose();
      currentTextures.torsoBump.dispose();
      currentTextures.headMap.dispose();
      currentTextures.legMap.dispose();
    }
    currentTextures = nextTex;

    suitFrontMat.map = nextTex.torsoFrontMap;
    suitFrontMat.bumpMap = nextTex.torsoBump;
    suitFrontMat.roughness = skin.suitRoughness;
    suitFrontMat.metalness = skin.suitMetalness;
    suitFrontMat.clearcoat = skin.suitClearcoat;
    suitFrontMat.needsUpdate = true;

    suitBackMat.map = nextTex.torsoBackMap;
    suitBackMat.roughness = skin.suitRoughness;
    suitBackMat.metalness = skin.suitMetalness;
    suitBackMat.clearcoat = skin.suitClearcoat;
    suitBackMat.needsUpdate = true;

    suitSideMat.color.set(skin.primaryColor);
    suitSideMat.roughness = skin.suitRoughness;
    suitSideMat.metalness = skin.suitMetalness;
    suitSideMat.clearcoat = skin.suitClearcoat;
    suitSideMat.needsUpdate = true;

    headMat.map = nextTex.headMap;
    headMat.roughness = skin.suitRoughness;
    headMat.metalness = skin.suitMetalness;
    headMat.clearcoat = skin.suitClearcoat;
    headMat.needsUpdate = true;

    legMat.map = nextTex.legMap;
    legMat.roughness = skin.patternType === 'homemade' ? 0.9 : skin.suitRoughness;
    legMat.metalness = skin.patternType === 'homemade' ? 0.0 : skin.suitMetalness;
    legMat.clearcoat = skin.patternType === 'homemade' ? 0.0 : skin.suitClearcoat;
    legMat.needsUpdate = true;

    accentMat.color.set(skin.accentColor);
    accentMat.metalness = skin.goldArmorTrim ? 0.9 : 0.4;
    accentMat.roughness = skin.goldArmorTrim ? 0.2 : 0.45;

    lensMat.color.set(skin.lensColor);
    lensMat.emissive.set(skin.lensEmissive);
    lensMat.emissiveIntensity = skin.lensEmissiveIntensity;

    rimMat.color.set(skin.lensRimColor);

    faceCutout.visible = !isCivilianActive && skin.skinCutoutFace;
    leftLens.visible = !isCivilianActive && !skin.skinCutoutFace;
    rightLens.visible = !isCivilianActive && !skin.skinCutoutFace;
    leftRim.visible = !isCivilianActive && !skin.skinCutoutFace;
    rightRim.visible = !isCivilianActive && !skin.skinCutoutFace;

    leftArm.cuff.visible = skin.wristCuffs || skin.goldArmorTrim;
    rightArm.cuff.visible = skin.wristCuffs || skin.goldArmorTrim;
  };

  applySkin(initialSkinId, maxAnisotropy);

  const updatePose: HeroRig['updatePose'] = ({
    time,
    distance,
    grounded,
    vy,
    sliding,
    laneTilt,
    stumbling,
    mode,
    groundOffset,
  }) => {
    shadowDisc.position.y = groundOffset - root.position.y + 0.025;
    const heightAboveGround = Math.max(0, root.position.y - groundOffset);
    const shadowScale = Math.max(0.35, 1 - heightAboveGround * 0.14);
    shadowDisc.scale.setScalar(shadowScale);
    shadowMat.opacity = Math.max(0.18, 0.72 - heightAboveGround * 0.14);

    if (mode === 'title' || mode === 'skins') {
      const targetRotY = mode === 'skins' ? Math.PI + Math.sin(time * 0.8) * 0.24 : Math.PI * 0.82;
      if (Math.abs(targetRotY - bodyPivot.rotation.y) > 1.6) {
        bodyPivot.rotation.y = targetRotY;
      } else {
        bodyPivot.rotation.y += (targetRotY - bodyPivot.rotation.y) * 0.28;
      }
      bodyPivot.rotation.x = 0;
      bodyPivot.rotation.z = 0;
      bodyPivot.position.y = Math.sin(time * 2.4) * 0.025;
      bodyPivot.scale.set(1, 1, 1);

      if (isCivilianActive) {
        leftArm.pivot.rotation.set(0.1 + Math.sin(time * 2.0) * 0.04, 0, -0.14);
        rightArm.pivot.rotation.set(-0.95 + Math.sin(time * 2.4) * 0.06, 0.2, 0.12);
      } else {
        leftArm.pivot.rotation.set(0.25 + Math.sin(time * 2.4) * 0.05, 0, -0.14);
        rightArm.pivot.rotation.set(-0.2 + Math.cos(time * 2.4) * 0.05, 0, 0.14);
      }
      leftLegPivot.rotation.set(-0.08, 0, -0.04);
      rightLegPivot.rotation.set(0.08, 0, 0.04);
      head.rotation.set(Math.sin(time * 1.4) * 0.05, Math.sin(time * 0.8) * 0.1, 0);
      return;
    }

    bodyPivot.rotation.y += (0 - bodyPivot.rotation.y) * 0.25;
    bodyPivot.rotation.z = THREE.MathUtils.clamp(-laneTilt * 0.32, -0.35, 0.35);

    if (sliding) {
      bodyPivot.position.y = -0.52;
      bodyPivot.rotation.x = 0.78;
      bodyPivot.scale.set(1.06, 0.82, 1.06);
      leftLegPivot.rotation.set(-0.85, 0, 0);
      rightLegPivot.rotation.set(0.35, 0, 0);
      leftArm.pivot.rotation.set(-0.9, 0, -0.2);
      rightArm.pivot.rotation.set(-0.6, 0, 0.2);
      return;
    }

    bodyPivot.scale.set(1, 1, 1);

    if (!grounded) {
      const rise = THREE.MathUtils.clamp(vy / 15, -1, 1);
      bodyPivot.position.y = 0;
      bodyPivot.rotation.x = 0.22 - rise * 0.15;
      leftLegPivot.rotation.set(-0.85, 0, -0.05);
      rightLegPivot.rotation.set(0.35, 0, 0.05);
      leftArm.pivot.rotation.set(-0.95, 0, -0.3);
      rightArm.pivot.rotation.set(0.55, 0, 0.3);
      return;
    }

    const phase = distance * 1.15;
    const swing = Math.sin(phase);
    const bounce = Math.abs(Math.cos(phase)) * 0.075;

    bodyPivot.position.y = bounce;
    bodyPivot.rotation.x = stumbling ? 0.32 + Math.sin(time * 25) * 0.12 : 0.16;
    head.rotation.set(-0.08, 0, 0);

    leftLegPivot.rotation.set(swing * 0.92, 0, -0.03);
    rightLegPivot.rotation.set(-swing * 0.92, 0, 0.03);
    leftArm.pivot.rotation.set(-swing * 0.88 - 0.15, 0, -0.12);
    rightArm.pivot.rotation.set(swing * 0.88 - 0.15, 0, 0.12);
  };

  const dispose = () => {
    if (currentTextures) {
      currentTextures.torsoFrontMap.dispose();
      currentTextures.torsoBackMap.dispose();
      currentTextures.torsoBump.dispose();
      currentTextures.headMap.dispose();
      currentTextures.legMap.dispose();
    }
    suitFrontMat.dispose();
    suitBackMat.dispose();
    suitSideMat.dispose();
    headMat.dispose();
    legMat.dispose();
    accentMat.dispose();
    lensMat.dispose();
    rimMat.dispose();
    skinMat.dispose();
    shadowMat.dispose();
  };

  return {
    root,
    bodyPivot,
    head,
    leftLens,
    rightLens,
    leftRim,
    rightRim,
    faceCutout,
    torso,
    pelvis,
    leftArmPivot: leftArm.pivot,
    rightArmPivot: rightArm.pivot,
    leftCuff: leftArm.cuff,
    rightCuff: rightArm.cuff,
    leftLegPivot,
    rightLegPivot,
    shadowDisc,
    burgerGroup,
    setCivilianMode,
    applySkin,
    updatePose,
    dispose,
  };
}

export function createTrainCarMesh(
  variant: number,
  length: number,
  textures: WorldTextures,
  hasChimney = true,
): THREE.Group {
  const group = new THREE.Group();
  const sideMaps = [textures.trainSideRed, textures.trainSideBlue, textures.trainSideAmber];
  const sideMap = sideMaps[variant % sideMaps.length];

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ea,
    roughness: 0.45,
    metalness: 0.65,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sideMap,
    roughness: 0.5,
    metalness: 0.45,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.72,
    metalness: 0.25,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.55,
  });
  const brickChimneyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.brickMap,
    roughness: 0.85,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.18,
    metalness: 0.2,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });

  // 1. Blocky Undercarriage & Voxel Wheels
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(TRAIN_WIDTH * 0.92, 0.38, length * 0.96),
    darkSteelMat,
  );
  chassis.position.y = 0.26;
  group.add(chassis);

  const wheelGeo = new THREE.BoxGeometry(0.16, 0.46, 0.46);
  for (const zOff of [-length * 0.35, -length * 0.22, length * 0.22, length * 0.35]) {
    for (const xOff of [-0.72, 0.72]) {
      const wheel = new THREE.Mesh(wheelGeo, darkSteelMat);
      wheel.position.set(xOff, 0.23, zOff);
      group.add(wheel);
    }
  }

  // 2. Main Cuboidal Passenger Hull
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(TRAIN_WIDTH, TRAIN_HEIGHT - 0.62, length),
    [sideMat, sideMat, roofMat, darkSteelMat, steelMat, steelMat],
  );
  hull.position.y = 0.45 + (TRAIN_HEIGHT - 0.62) * 0.5;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 3. Walkable Cuboidal Roof Deck + Stepped Blocky Clerestory Roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(TRAIN_WIDTH * 0.92, 0.18, length * 0.98),
    roofMat,
  );
  roof.position.y = TRAIN_HEIGHT - 0.08;
  roof.receiveShadow = true;
  group.add(roof);

  const pitchedRoof = new THREE.Mesh(
    new THREE.BoxGeometry(TRAIN_WIDTH * 0.78, 0.24, length * 0.92),
    roofMat,
  );
  pitchedRoof.position.y = TRAIN_HEIGHT + 0.08;
  group.add(pitchedRoof);

  // 4. Roof AC pods or Voxel Brick Chimney Stack on blocking trains
  if (hasChimney) {
    const stackGroup = new THREE.Group();
    stackGroup.position.set(0, TRAIN_HEIGHT + 0.18, length * 0.32);

    const baseCollar = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.26, 0.84), brickChimneyMat);
    baseCollar.position.y = 0.13;
    stackGroup.add(baseCollar);

    const pipe = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.92, 0.54), brickChimneyMat);
    pipe.position.y = 0.72;
    pipe.castShadow = true;
    stackGroup.add(pipe);

    const flaredRim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.72), darkSteelMat);
    flaredRim.position.y = 1.2;
    stackGroup.add(flaredRim);

    const sootCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.06, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x09090b }),
    );
    sootCore.position.y = 1.29;
    stackGroup.add(sootCore);

    group.add(stackGroup);

    const rearVent = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.26, 1.3), steelMat);
    rearVent.position.set(0, TRAIN_HEIGHT + 0.16, -length * 0.26);
    group.add(rearVent);
  } else {
    for (const zOff of [-length * 0.26, length * 0.26]) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 1.4), steelMat);
      ac.position.set(0, TRAIN_HEIGHT + 0.08, zOff);
      group.add(ac);
    }
  }

  // 5. Front & rear windshields + square voxel headlights
  for (const dir of [-1, 1]) {
    const zFace = dir * (length * 0.5 + 0.02);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.75, 0.04), glassMat);
    windshield.position.set(0, 2.15, zFace);
    group.add(windshield);

    const stripeColor = variant % 3 === 0 ? 0xb91c1c : variant % 3 === 1 ? 0x1d4ed8 : 0xd97706;
    const frontBand = new THREE.Mesh(
      new THREE.BoxGeometry(TRAIN_WIDTH + 0.02, 0.34, 0.08),
      new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.5 }),
    );
    frontBand.position.set(0, 1.4, dir * (length * 0.5));
    group.add(frontBand);

    for (const xOff of [-0.68, 0.68]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.08), headlightMat);
      lamp.position.set(xOff, 1.0, zFace);
      group.add(lamp);
    }
  }

  return group;
}

export function createRampMesh(length: number, textures: WorldTextures): THREE.Group {
  const group = new THREE.Group();
  // Stepped Minecraft-style staircase ramp up to train roof height!
  const stepCount = 10;
  const stepLen = length / stepCount;
  const stepMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.hazardYellowBlack,
    roughness: 0.6,
    metalness: 0.1,
  });
  const sideRailMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });

  for (let i = 0; i < stepCount; i++) {
    const h = ((i + 1) / stepCount) * TRAIN_HEIGHT;
    const zPos = length * 0.5 - (i + 0.5) * stepLen;
    const step = new THREE.Mesh(new THREE.BoxGeometry(TRAIN_WIDTH * 0.94, h, stepLen + 0.04), stepMat);
    step.position.set(0, h * 0.5, zPos);
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);

    for (const xSide of [-TRAIN_WIDTH * 0.45, TRAIN_WIDTH * 0.45]) {
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, stepLen + 0.04), sideRailMat);
      kerb.position.set(xSide, h + 0.07, zPos);
      group.add(kerb);
    }
  }

  return group;
}

export function createLowBarrierMesh(textures: WorldTextures): THREE.Group {
  const group = new THREE.Group();
  const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.45 });
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.hazardRedWhite,
    roughness: 0.5,
  });

  for (const xOff of [-0.85, 0.85]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 0.18), legMat);
    leg.position.set(xOff, 0.5, 0);
    leg.castShadow = true;
    group.add(leg);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.55), legMat);
    foot.position.set(xOff, 0.05, 0);
    group.add(foot);
  }

  const topBoard = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.34, 0.14), boardMat);
  topBoard.position.set(0, 0.84, 0);
  topBoard.castShadow = true;
  group.add(topBoard);

  const midBoard = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.12), legMat);
  midBoard.position.set(0, 0.42, 0);
  group.add(midBoard);

  return group;
}

export function createHighBarrierMesh(textures: WorldTextures): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.55 });
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.hazardRedWhite,
    roughness: 0.48,
  });
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.0,
    roughness: 0.3,
  });

  for (const xOff of [-1.02, 1.02]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.55, 0.18), steelMat);
    post.position.set(xOff, 1.275, 0);
    post.castShadow = true;
    group.add(post);

    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), amberMat);
    beacon.position.set(xOff, 2.6, 0);
    group.add(beacon);
  }

  const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.72, 0.18), boardMat);
  cross.position.set(0, 1.62, 0);
  cross.castShadow = true;
  group.add(cross);

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.22), steelMat);
  topBeam.position.set(0, 2.48, 0);
  group.add(topBeam);

  return group;
}

export function createFullBarrierMesh(textures: WorldTextures): THREE.Group {
  // Voxel block shelter blocking the lane with stepped voxel pitched roof & brick chimney!
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.3 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.hazardYellowBlack,
    roughness: 0.58,
  });
  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.75,
  });
  const brickChimneyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.brickMap,
    roughness: 0.85,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.15, 1.3), wallMat);
  body.position.set(0, 1.075, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  for (const xOff of [-0.98, 0.98]) {
    for (const zOff of [-0.6, 0.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.22, 0.16), frameMat);
      post.position.set(xOff, 1.11, zOff);
      group.add(post);
    }
  }

  // Stepped Minecraft block roof (3 voxel tiers)
  const roofTier1 = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.26, 1.65), roofTileMat);
  roofTier1.position.set(0, 2.28, 0);
  group.add(roofTier1);

  const roofTier2 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.26, 1.45), roofTileMat);
  roofTier2.position.set(0, 2.54, 0);
  group.add(roofTier2);

  const roofTier3 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 1.25), roofTileMat);
  roofTier3.position.set(0, 2.8, 0);
  group.add(roofTier3);

  // Blocky brick chimney stack
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.42), brickChimneyMat);
  chimney.position.set(0.45, 2.85, -0.15);
  chimney.castShadow = true;
  group.add(chimney);

  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.52), frameMat);
  chimneyCap.position.set(0.45, 3.38, -0.15);
  group.add(chimneyCap);

  return group;
}

export function createCoinMesh(): THREE.Group {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.85,
    emissive: 0x713f12,
    emissiveIntensity: 0.25,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.18,
    metalness: 0.9,
  });

  // Voxel Gold Coin Block (blocky Minecraft pixel coin)
  const outerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 0.14), goldMat);
  group.add(outerBlock);

  const innerFace = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.18), rimMat);
  group.add(innerFace);

  return group;
}

export function createPowerupMesh(kind: PowerupKind): THREE.Group {
  const group = new THREE.Group();
  const isMagnet = kind === 'magnet';
  const mainMat = new THREE.MeshStandardMaterial({
    color: isMagnet ? 0xef4444 : 0x06b6d4,
    roughness: 0.3,
    metalness: 0.65,
    emissive: isMagnet ? 0x991b1b : 0x0e7490,
    emissiveIntensity: 0.45,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.85,
  });

  if (isMagnet) {
    // Voxel Blocky U-Magnet
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.2), mainMat);
    base.position.y = -0.22;
    group.add(base);
    for (const xOff of [-0.25, 0.25]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.2), mainMat);
      arm.position.set(xOff, 0.05, 0);
      group.add(arm);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.22), tipMat);
      tip.position.set(xOff, 0.28, 0);
      group.add(tip);
    }
  } else {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.32), tipMat);
    sole.position.y = -0.14;
    group.add(sole);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.32, 0.28), mainMat);
    upper.position.set(-0.04, 0.08, 0);
    group.add(upper);
  }

  // Blocky voxel aura frame
  const aura = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.92, 0.92),
    new THREE.MeshBasicMaterial({
      color: isMagnet ? 0xfca5a5 : 0x67e8f9,
      wireframe: true,
    }),
  );
  group.add(aura);

  return group;
}

export function createMcDonaldsMesh(textures?: WorldTextures): THREE.Group {
  const group = new THREE.Group();

  const redRoofMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const brickMat = textures
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.brickMap, roughness: 0.85 })
    : new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.82 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const sidewalkMat = textures
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.platformMap, roughness: 0.88 })
    : new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  // Sidewalk pad
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.26, 11.0), sidewalkMat);
  sidewalk.position.set(0, 0.13, 0);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  // Minecraft Brick Restaurant Block
  const body = new THREE.Mesh(new THREE.BoxGeometry(7.6, 4.4, 7.2), brickMat);
  body.position.set(0, 2.45, -1.2);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Voxel glowing glass storefront & door
  const glassFront = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.8, 0.22), glassMat);
  glassFront.position.set(0, 1.85, 2.42);
  group.add(glassFront);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.5, 0.3), darkTrim);
  doorFrame.position.set(0.9, 1.5, 2.45);
  group.add(doorFrame);

  // Stepped Minecraft Red Mansard Roof (2 stacked voxel tiers)
  const yellowBand = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.32, 7.8), yellowMat);
  yellowBand.position.set(0, 4.65, -1.2);
  group.add(yellowBand);

  const mansardLower = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.72, 7.6), redRoofMat);
  mansardLower.position.set(0, 5.15, -1.2);
  mansardLower.castShadow = true;
  group.add(mansardLower);

  const mansardUpper = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.72, 6.0), redRoofMat);
  mansardUpper.position.set(0, 5.85, -1.2);
  mansardUpper.castShadow = true;
  group.add(mansardUpper);

  // Voxel Pixel-Block Golden Arches 'M'
  const buildVoxelArches = (scale: number) => {
    const arches = new THREE.Group();
    const t = 0.22 * scale;
    const h = 0.9 * scale;
    const w = 0.72 * scale;

    for (const offset of [-w * 0.5, w * 0.5]) {
      const leftCol = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), yellowMat);
      leftCol.position.set(offset - w * 0.35, h * 0.5, 0);
      arches.add(leftCol);

      const rightCol = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), yellowMat);
      rightCol.position.set(offset + w * 0.35, h * 0.5, 0);
      arches.add(rightCol);

      const topBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7 + t, t, t), yellowMat);
      topBar.position.set(offset, h, 0);
      arches.add(topBar);
    }
    return arches;
  };

  const roofSign = buildVoxelArches(1.25);
  roofSign.position.set(0, 6.25, 1.4);
  group.add(roofSign);

  // Voxel Street Pole Sign
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.2, 0.28), darkTrim);
  pole.position.set(4.3, 2.6, 3.0);
  group.add(pole);
  const poleSignBox = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 0.32), redRoofMat);
  poleSignBox.position.set(4.3, 5.2, 3.0);
  group.add(poleSignBox);
  const poleArches = buildVoxelArches(0.8);
  poleArches.position.set(4.3, 4.78, 3.2);
  group.add(poleArches);

  return group;
}

export interface VenomRig {
  root: THREE.Group;
  updatePose: (time: number, running: boolean, distance: number) => void;
}

export function createVenomRig(): VenomRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const symbioteMat = new THREE.MeshPhysicalMaterial({
    color: 0x090b10,
    roughness: 0.28,
    metalness: 0.35,
    clearcoat: 0.7,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.22,
    roughness: 0.3,
  });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.65 });

  // Bulky Minecraft Cube Torso & Pelvis (front = -Z)
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.38), symbioteMat);
  pelvis.position.y = 0.96;
  body.add(pelvis);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.44), symbioteMat);
  chest.position.y = 1.45;
  chest.castShadow = true;
  body.add(chest);

  // White blocky symbiote spider emblem (front -Z & back +Z)
  const emblemBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.48), whiteMat);
  emblemBody.position.set(0, 1.46, 0);
  body.add(emblemBody);
  for (const side of [-1, 1]) {
    const legA = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.47), whiteMat);
    legA.position.set(side * 0.2, 1.58, 0);
    legA.rotation.z = side * 0.45;
    body.add(legA);
    const legB = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.47), whiteMat);
    legB.position.set(side * 0.18, 1.36, 0);
    legB.rotation.z = -side * 0.45;
    body.add(legB);
  }

  // Cube Head + Jagged White Eyes & Toothy Grin (front = -Z)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), symbioteMat);
  head.position.set(0, 2.09, -0.02);
  head.castShadow = true;
  body.add(head);

  const eyeGeo = new THREE.BoxGeometry(0.14, 0.075, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, whiteMat);
  leftEye.position.set(-0.11, 2.16, -0.27);
  leftEye.rotation.z = -0.35;
  body.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, whiteMat);
  rightEye.position.set(0.11, 2.16, -0.27);
  rightEye.rotation.z = 0.35;
  body.add(rightEye);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.11, 0.05), mouthMat);
  jaw.position.set(0, 1.96, -0.265);
  body.add(jaw);

  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.06), whiteMat);
  teeth.position.set(0, 1.99, -0.27);
  body.add(teeth);

  const buildLimb = (x: number, y: number, w: number, len: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), symbioteMat);
    seg.position.y = -len * 0.5;
    seg.castShadow = true;
    pivot.add(seg);
    body.add(pivot);
    return pivot;
  };

  const leftArm = buildLimb(-0.52, 1.82, 0.24, 0.78);
  const rightArm = buildLimb(0.52, 1.82, 0.24, 0.78);
  const leftLeg = buildLimb(-0.19, 0.85, 0.26, 0.84);
  const rightLeg = buildLimb(0.19, 0.85, 0.26, 0.84);

  const updatePose = (time: number, running: boolean, distance: number) => {
    if (!running) {
      body.position.y = Math.sin(time * 2.2) * 0.03;
      body.rotation.x = 0.12;
      leftArm.rotation.set(-0.35 + Math.sin(time * 2) * 0.08, 0, -0.18);
      rightArm.rotation.set(-0.35 - Math.sin(time * 2) * 0.08, 0, 0.18);
      leftLeg.rotation.set(0.08, 0, -0.04);
      rightLeg.rotation.set(-0.08, 0, 0.04);
      return;
    }
    const phase = distance * 1.15 + 0.6;
    const swing = Math.sin(phase);
    body.position.y = Math.abs(Math.cos(phase)) * 0.09;
    body.rotation.x = 0.22;
    leftLeg.rotation.set(swing * 0.9, 0, 0);
    rightLeg.rotation.set(-swing * 0.9, 0, 0);
    leftArm.rotation.set(-swing * 0.9 - 0.35, 0, -0.15);
    rightArm.rotation.set(swing * 0.9 - 0.35, 0, 0.15);
  };

  return { root, updatePose };
}

function buildMinecraftTree(
  x: number,
  groundY: number,
  z: number,
  trunkMat: THREE.Material,
  leafMat: THREE.Material,
): THREE.Group {
  const tree = new THREE.Group();
  tree.position.set(x, groundY, z);

  // Classic 3-block high oak trunk (0.9m voxel scale)
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.7, 0.85), trunkMat);
  trunk.position.y = 1.35;
  trunk.castShadow = true;
  tree.add(trunk);

  // Classic Minecraft two-tier cube leaf canopy
  const lowerCanopy = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.5, 2.7), leafMat);
  lowerCanopy.position.y = 3.2;
  lowerCanopy.castShadow = true;
  tree.add(lowerCanopy);

  const upperCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.0, 1.75), leafMat);
  upperCanopy.position.y = 4.4;
  tree.add(upperCanopy);

  return tree;
}

export function createStreetStartPlaza(textures: WorldTextures): THREE.Group {
  const plaza = new THREE.Group();
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x262b34, roughness: 0.9 });
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.grassTopMap,
    roughness: 0.92,
  });
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.platformMap,
    roughness: 0.86,
  });

  // Minecraft green grass terrain + central stone avenue
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(140, 42), grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, -6.02, 20);
  grass.receiveShadow = true;
  plaza.add(grass);

  const road = new THREE.Mesh(new THREE.BoxGeometry(14, 0.04, 42), roadMat);
  road.position.set(0, -5.99, 20);
  road.receiveShadow = true;
  plaza.add(road);

  // Sidewalk curb beside McDonald's
  const curb = new THREE.Mesh(new THREE.BoxGeometry(12, 0.24, 30), sidewalkMat);
  curb.position.set(-7.5, -5.88, 12);
  curb.receiveShadow = true;
  plaza.add(curb);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 1.5,
  });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.oakLogMap, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.leavesMap, roughness: 0.88 });

  for (const [tx, tz] of [
    [-10.4, 14.2],
    [4.6, 12.5],
    [5.2, 4.2],
  ]) {
    const lampPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.4, 0.24), poleMat);
    lampPost.position.set(tx, -3.8, tz);
    plaza.add(lampPost);
    const glowBlock = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.54, 0.54), glowMat);
    glowBlock.position.set(tx, -1.45, tz);
    plaza.add(glowBlock);
  }

  for (const [fx, fz] of [
    [-2.2, 3.2],
    [7.2, 9.5],
    [-12.5, 13.0],
  ]) {
    plaza.add(buildMinecraftTree(fx, -6.0, fz, trunkMat, leafMat));
  }

  return plaza;
}

export function createEnvironmentChunk(chunkLength: number, textures: WorldTextures): THREE.Group {
  const chunk = new THREE.Group();

  // 1. Minecraft Green Grass Terrain below + Cobble-asphalt avenue strip
  const grassGround = new THREE.Mesh(
    new THREE.PlaneGeometry(140, chunkLength),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.grassTopMap, roughness: 0.92 }),
  );
  grassGround.rotation.x = -Math.PI / 2;
  grassGround.position.y = -6.02;
  grassGround.receiveShadow = true;
  chunk.add(grassGround);

  const streetRoad = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.04, chunkLength),
    new THREE.MeshStandardMaterial({ color: 0x262b34, roughness: 0.9 }),
  );
  streetRoad.position.set(0, -5.99, 0);
  streetRoad.receiveShadow = true;
  chunk.add(streetRoad);

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  for (const dz of [-chunkLength * 0.25, chunkLength * 0.25]) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 5.2), dashMat);
    dash.position.set(0, -5.96, dz);
    chunk.add(dash);
  }

  // 2. Elevated Rooftop Deck Slab supported by Cuboidal Stone-Brick Viaduct Piers
  const roofWidth = LANE_WIDTH * 3.65;
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.platformMap,
    roughness: 0.85,
  });
  const deckSlab = new THREE.Mesh(new THREE.BoxGeometry(roofWidth, 0.55, chunkLength), deckMat);
  deckSlab.position.set(0, -0.29, 0);
  deckSlab.receiveShadow = true;
  chunk.add(deckSlab);

  const pierMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  for (const zOff of [-chunkLength * 0.32, chunkLength * 0.32]) {
    for (const xOff of [-LANE_WIDTH * 1.45, LANE_WIDTH * 1.45]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.0, 5.5, 1.0), pierMat);
      pier.position.set(xOff, -3.25, zOff);
      pier.castShadow = true;
      chunk.add(pier);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(roofWidth * 0.96, 0.55, 0.85), pierMat);
    crossBeam.position.set(0, -0.78, zOff);
    chunk.add(crossBeam);
  }

  // Rooftop Cobblestone + Oak Tie Track Bed
  const ballast = new THREE.Mesh(
    new THREE.PlaneGeometry(LANE_WIDTH * 3.45, chunkLength),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.ballastMap,
      bumpMap: textures.ballastBump,
      bumpScale: 0.08,
      roughness: 0.9,
    }),
  );
  ballast.rotation.x = -Math.PI / 2;
  ballast.position.y = 0;
  ballast.receiveShadow = true;
  chunk.add(ballast);

  // 3. Cuboidal Steel Iron-Ingot Rails for all 3 lanes
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.35,
    metalness: 0.78,
  });
  const railGeo = new THREE.BoxGeometry(0.11, 0.11, chunkLength);
  for (const lane of [-1, 0, 1]) {
    const cx = lane * LANE_WIDTH;
    for (const rOff of [-0.72, 0.72]) {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(cx + rOff, 0.055, 0);
      chunk.add(rail);
    }
  }

  // 4. Left & right stone-brick parapets + gold-block safety ledges
  const platMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.platformMap,
    roughness: 0.88,
  });
  const yellowStripMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.6,
  });

  for (const side of [-1, 1]) {
    const platX = side * (LANE_WIDTH * 1.72 + 0.65);
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, chunkLength), platMat);
    parapet.position.set(platX, 0.42, 0);
    parapet.receiveShadow = true;
    chunk.add(parapet);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, chunkLength), yellowStripMat);
    strip.position.set(side * (LANE_WIDTH * 1.72 + 0.14), 0.87, 0);
    chunk.add(strip);
  }

  // 5. Overhead cuboidal gantries & glowstone lamp blocks
  const gantryMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.65,
  });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 1.5,
  });

  for (const zOff of [-chunkLength * 0.25, chunkLength * 0.25]) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6.2, 0.32), gantryMat);
      post.position.set(side * (LANE_WIDTH * 1.85), 3.1, zOff);
      post.castShadow = true;
      chunk.add(post);

      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), lampGlowMat);
      lamp.position.set(side * (LANE_WIDTH * 1.62), 5.65, zOff);
      chunk.add(lamp);
    }
    const span = new THREE.Mesh(new THREE.BoxGeometry(LANE_WIDTH * 3.85, 0.32, 0.32), gantryMat);
    span.position.set(0, 6.1, zOff);
    chunk.add(span);
  }

  // 6. Minecraft Voxel Skyscrapers, Stepped Block Towers, Oak Trees & Flat Blocky Clouds
  const bMatA = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.buildingMapA,
    roughness: 0.72,
  });
  const bMatB = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.buildingMapB,
    roughness: 0.72,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const spireMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.oakLogMap, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.leavesMap, roughness: 0.88 });
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

  const buildingOffsets = [-chunkLength * 0.34, 0, chunkLength * 0.34];
  buildingOffsets.forEach((zOff, idx) => {
    for (const side of [-1, 1]) {
      const style = (idx + (side > 0 ? 1 : 0)) % 3;
      const mat = (idx + (side > 0 ? 1 : 0)) % 2 === 0 ? bMatA : bMatB;
      const w = 8.4 + ((idx + (side > 0 ? 2 : 0)) % 3);
      const d = chunkLength * 0.3;
      const baseX = side * (LANE_WIDTH * 1.72 + 5.6 + w * 0.5);

      if (style === 0) {
        const h = 21 + (idx % 3) * 4;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        tower.position.set(baseX, -6.0 + h * 0.5, zOff);
        tower.receiveShadow = true;
        chunk.add(tower);

        const roofCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.55, d + 0.4), trimMat);
        roofCap.position.set(baseX, -6.0 + h + 0.27, zOff);
        chunk.add(roofCap);

        const penthouse = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 3.2, d * 0.55), trimMat);
        penthouse.position.set(baseX, -6.0 + h + 2.1, zOff);
        chunk.add(penthouse);

        const spire = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.0, 0.4), spireMat);
        spire.position.set(baseX, -6.0 + h + 5.7, zOff);
        chunk.add(spire);
      } else if (style === 1) {
        const h1 = 14.0;
        const tier1 = new THREE.Mesh(new THREE.BoxGeometry(w, h1, d), mat);
        tier1.position.set(baseX, -6.0 + h1 * 0.5, zOff);
        chunk.add(tier1);

        const trim1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.45, d + 0.4), trimMat);
        trim1.position.set(baseX, -6.0 + h1 + 0.22, zOff);
        chunk.add(trim1);

        const h2 = 8.5;
        const tier2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, h2, d * 0.68), mat);
        tier2.position.set(baseX, -6.0 + h1 + h2 * 0.5, zOff);
        chunk.add(tier2);

        const trim2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.5, d * 0.72), spireMat);
        trim2.position.set(baseX, -6.0 + h1 + h2 + 0.25, zOff);
        chunk.add(trim2);
      } else {
        const h = 15.5 + (idx % 2) * 3;
        const loft = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        loft.position.set(baseX, -6.0 + h * 0.5, zOff);
        chunk.add(loft);

        const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.55, d + 0.4), trimMat);
        cornice.position.set(baseX, -6.0 + h + 0.27, zOff);
        chunk.add(cornice);

        const tankY = -6.0 + h + 1.85;
        const tank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), woodMat);
        tank.position.set(baseX - side * 1.0, tankY, zOff);
        chunk.add(tank);
        const tankLid = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.45, 2.45), trimMat);
        tankLid.position.set(baseX - side * 1.0, tankY + 1.32, zOff);
        chunk.add(tankLid);
      }

      // Minecraft Oak Tree on the grass beside the viaduct
      const treeX = side * (LANE_WIDTH * 1.72 + 3.1);
      chunk.add(buildMinecraftTree(treeX, -6.0, zOff + 2.5, woodMat, leafMat));
    }

    // Iconic flat blocky Minecraft sky cloud
    const cloud = new THREE.Mesh(
      new THREE.BoxGeometry(8 + (idx % 2) * 4, 1.1, 6),
      cloudMat,
    );
    cloud.position.set((idx % 2 === 0 ? -1 : 1) * 14, 24 + idx * 1.5, zOff);
    chunk.add(cloud);
  });

  return chunk;
}
