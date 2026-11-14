export type LaneIndex = -1 | 0 | 1;

export const LANE_WIDTH = 2.65;
export const TRAIN_HEIGHT = 3.05;
export const TRAIN_WIDTH = 2.15;
export const PLAYER_HALF_WIDTH = 0.36;
export const PLAYER_HEIGHT = 1.72;
export const PLAYER_SLIDE_HEIGHT = 0.78;

export const BASE_SPEED = 17.5;
export const MAX_SPEED = 36.0;
export const GRAVITY = 42.0;
export const JUMP_VELOCITY = 14.8;
export const SUPER_JUMP_VELOCITY = 19.2;
export const FAST_FALL_VELOCITY = -26.0;
export const SLIDE_DURATION = 0.68;
export const STUMBLE_RECOVERY_TIME = 5.5;
export const STUMBLE_INVULN_TIME = 0.65;

export type ObstacleKind =
  | 'train_static'
  | 'train_moving'
  | 'ramp'
  | 'barrier_low'
  | 'barrier_high'
  | 'barrier_full';

export interface TrackObstacle {
  id: number;
  kind: ObstacleKind;
  lane: LaneIndex;
  zStart: number; // Front edge closer to player (smaller |z| since running toward -Z)
  zEnd: number;   // Far edge further down track (more negative z)
  speed?: number; // For train_moving (positive value moving toward +Z)
  variant?: number;
}

export interface TrackCoin {
  id: number;
  lane: LaneIndex;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export type PowerupKind = 'magnet' | 'sneakers';

export interface TrackPowerup {
  id: number;
  kind: PowerupKind;
  lane: LaneIndex;
  y: number;
  z: number;
  collected: boolean;
}

export interface RunnerState {
  targetLane: LaneIndex;
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
  groundHeight: number;
  slideTimer: number;
  jumpBufferTimer: number;
  slideBufferTimer: number;
  coyoteTimer: number;
  stumbleCount: number;
  stumbleDecayTimer: number;
  invulnTimer: number;
  magnetTimer: number;
  sneakersTimer: number;
  distance: number;
  score: number;
  runHalfCoins: number;
  speed: number;
  alive: boolean;
}

export function laneToX(lane: LaneIndex): number {
  return lane * LANE_WIDTH;
}

export function createInitialRunnerState(): RunnerState {
  return {
    targetLane: 0,
    x: 0,
    y: 0,
    vy: 0,
    grounded: true,
    groundHeight: 0,
    slideTimer: 0,
    jumpBufferTimer: 0,
    slideBufferTimer: 0,
    coyoteTimer: 0,
    stumbleCount: 0,
    stumbleDecayTimer: 0,
    invulnTimer: 0,
    magnetTimer: 0,
    sneakersTimer: 0,
    distance: 0,
    score: 0,
    runHalfCoins: 0,
    speed: BASE_SPEED,
    alive: true,
  };
}

export function computeRunnerSpeed(distance: number): number {
  const ramp = Math.min(1, Math.max(0, distance) / 1400);
  return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * ramp;
}

export function switchLane(state: RunnerState, delta: -1 | 1): boolean {
  const next = state.targetLane + delta;
  if (next < -1 || next > 1) return false;
  state.targetLane = next as LaneIndex;
  return true;
}

export function triggerJump(state: RunnerState): void {
  state.jumpBufferTimer = 0.13;
}

export function triggerSlide(state: RunnerState): void {
  state.slideBufferTimer = 0.13;
}

export interface StepInput {
  dt: number;
  obstacles: TrackObstacle[];
}

export interface StepEvents {
  jumped: boolean;
  landed: boolean;
  slid: boolean;
  stumbled: boolean;
  crashed: boolean;
}

export function computeSupportHeightAt(
  x: number,
  y: number,
  z: number,
  obstacles: readonly TrackObstacle[],
): number {
  let supportY = 0;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const obsX = laneToX(obs.lane);
    if (Math.abs(x - obsX) > TRAIN_WIDTH * 0.56) continue;
    // z runs negatively forward: zStart >= z >= zEnd
    const minZ = Math.min(obs.zStart, obs.zEnd);
    const maxZ = Math.max(obs.zStart, obs.zEnd);
    if (z < minZ - 0.35 || z > maxZ + 0.35) continue;

    if (obs.kind === 'train_static' || obs.kind === 'train_moving') {
      if (y >= TRAIN_HEIGHT - 0.65) {
        supportY = Math.max(supportY, TRAIN_HEIGHT);
      }
    } else if (obs.kind === 'ramp') {
      const len = Math.max(0.1, maxZ - minZ);
      // Ramp rises as z moves from maxZ (front/entry) toward minZ (far/top)
      const progress = Math.min(1, Math.max(0, (maxZ - z) / len));
      const rampY = progress * TRAIN_HEIGHT;
      if (y >= rampY - 1.1) {
        supportY = Math.max(supportY, rampY);
      }
    }
  }
  return supportY;
}

export function stepRunnerPhysics(
  state: RunnerState,
  playerZ: number,
  input: StepInput,
): StepEvents {
  const events: StepEvents = {
    jumped: false,
    landed: false,
    slid: false,
    stumbled: false,
    crashed: false,
  };

  if (!state.alive) return events;

  const dt = Math.min(input.dt, 0.05);
  state.speed = computeRunnerSpeed(state.distance);
  state.distance += state.speed * dt;
  state.score += state.speed * dt * 1.25;

  // Timers
  if (state.jumpBufferTimer > 0) state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  if (state.slideBufferTimer > 0) state.slideBufferTimer = Math.max(0, state.slideBufferTimer - dt);
  if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  if (state.magnetTimer > 0) state.magnetTimer = Math.max(0, state.magnetTimer - dt);
  if (state.sneakersTimer > 0) state.sneakersTimer = Math.max(0, state.sneakersTimer - dt);

  if (state.stumbleCount > 0) {
    state.stumbleDecayTimer -= dt;
    if (state.stumbleDecayTimer <= 0) {
      state.stumbleCount = 0;
      state.stumbleDecayTimer = 0;
    }
  }

  // Smooth lateral lane damping
  const targetX = laneToX(state.targetLane);
  const alphaX = 1 - Math.exp(-16 * dt);
  state.x += (targetX - state.x) * alphaX;
  if (Math.abs(targetX - state.x) < 0.004) state.x = targetX;

  // Support height beneath feet
  const supportY = computeSupportHeightAt(state.x, state.y, playerZ, input.obstacles);
  state.groundHeight = supportY;

  if (state.grounded) {
    state.coyoteTimer = 0.09;
  } else if (state.coyoteTimer > 0) {
    state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  }

  // Handle slide buffer
  if (state.slideBufferTimer > 0) {
    state.slideBufferTimer = 0;
    if (!state.grounded && state.y > supportY + 0.15) {
      // Fast-fall slam into slide!
      state.vy = Math.min(state.vy, FAST_FALL_VELOCITY);
    }
    state.slideTimer = SLIDE_DURATION;
    events.slid = true;
  }

  if (state.slideTimer > 0) {
    state.slideTimer = Math.max(0, state.slideTimer - dt);
  }

  // Handle jump buffer (cancels slide!)
  if (state.jumpBufferTimer > 0 && (state.grounded || state.coyoteTimer > 0)) {
    state.jumpBufferTimer = 0;
    state.coyoteTimer = 0;
    state.slideTimer = 0;
    state.grounded = false;
    state.vy = state.sneakersTimer > 0 ? SUPER_JUMP_VELOCITY : JUMP_VELOCITY;
    events.jumped = true;
  }

  // Vertical integration
  if (!state.grounded || state.y > supportY + 0.02) {
    state.vy -= GRAVITY * dt;
    state.y += state.vy * dt;
    if (state.y <= supportY) {
      state.y = supportY;
      if (state.vy < -2.0) events.landed = true;
      state.vy = 0;
      state.grounded = true;
    } else {
      state.grounded = false;
    }
  } else {
    state.y = supportY;
    state.vy = 0;
    state.grounded = true;
  }

  // Move oncoming trains
  for (let i = 0; i < input.obstacles.length; i++) {
    const obs = input.obstacles[i];
    if (obs.kind === 'train_moving' && obs.speed) {
      obs.zStart += obs.speed * dt;
      obs.zEnd += obs.speed * dt;
    }
  }

  // Check collisions
  const playerHeight = state.slideTimer > 0 ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT;
  const playerBottom = state.y;
  const playerTop = state.y + playerHeight;

  for (let i = 0; i < input.obstacles.length; i++) {
    const obs = input.obstacles[i];
    if (obs.kind === 'ramp') continue; // Ramps are walkable

    const obsX = laneToX(obs.lane);
    const dx = Math.abs(state.x - obsX);
    const halfWidthSum = obs.kind === 'train_static' || obs.kind === 'train_moving'
      ? TRAIN_WIDTH * 0.45 + PLAYER_HALF_WIDTH
      : 0.82 + PLAYER_HALF_WIDTH;

    if (dx > halfWidthSum) continue;

    const minZ = Math.min(obs.zStart, obs.zEnd);
    const maxZ = Math.max(obs.zStart, obs.zEnd);
    if (playerZ < minZ - 0.3 || playerZ > maxZ + 0.3) continue;

    if (obs.kind === 'train_static' || obs.kind === 'train_moving') {
      // Standing or landing on roof is safe
      if (playerBottom >= TRAIN_HEIGHT - 0.55) continue;

      if (state.invulnTimer > 0) continue;

      // Side graze during lane change triggers stumble unless deep inside lane
      const isSideGraze = dx > TRAIN_WIDTH * 0.32 && playerZ < maxZ - 0.7;
      if (isSideGraze) {
        state.stumbleCount += 1;
        state.stumbleDecayTimer = STUMBLE_RECOVERY_TIME;
        state.invulnTimer = STUMBLE_INVULN_TIME;
        // Push player back out of the train side
        state.targetLane = Math.round(state.x / LANE_WIDTH) as LaneIndex;
        if (state.stumbleCount >= 2) {
          state.alive = false;
          events.crashed = true;
        } else {
          events.stumbled = true;
        }
        break;
      } else {
        state.alive = false;
        events.crashed = true;
        break;
      }
    } else if (obs.kind === 'barrier_low') {
      // Low barrier: bottom 0 to 1.05m
      if (playerBottom < 0.98) {
        if (state.invulnTimer > 0) continue;
        state.alive = false;
        events.crashed = true;
        break;
      }
    } else if (obs.kind === 'barrier_high') {
      // High overhead gantry bar: 1.08m to 2.55m (slide under!)
      if (playerTop > 1.08 && playerBottom < 2.5) {
        if (state.invulnTimer > 0) continue;
        state.alive = false;
        events.crashed = true;
        break;
      }
    } else if (obs.kind === 'barrier_full') {
      if (playerBottom < 2.65) {
        if (state.invulnTimer > 0) continue;
        state.alive = false;
        events.crashed = true;
        break;
      }
    }
  }

  return events;
}
