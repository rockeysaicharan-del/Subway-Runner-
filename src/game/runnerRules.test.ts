import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCoinPickups,
  canUnlockSkin,
  createDefaultProgress,
  equipSkin,
  formatCoins,
  halfCoinsToCoins,
  unlockSkin,
} from './economy';
import {
  createInitialRunnerState,
  LANE_WIDTH,
  stepRunnerPhysics,
  switchLane,
  TrackObstacle,
  TRAIN_HEIGHT,
  triggerJump,
  triggerSlide,
} from './runnerRules';
import { SUIT_SKINS } from './skins';

test('skin catalog matches required years and coin costs', () => {
  assert.equal(SUIT_SKINS.length, 5);
  assert.deepEqual(
    SUIT_SKINS.map((s) => ({ id: s.id, cost: s.costCoins })),
    [
      { id: '2002', cost: 0 },
      { id: '2004', cost: 100 },
      { id: '2007', cost: 200 },
      { id: '2016', cost: 500 },
      { id: '2018-2019', cost: 1000 },
    ],
  );
});

test('half-coin economy: 1 coin pickup = 0.5 coin, 2 coin pickups = 1 coin', () => {
  let halfCoins = 0;
  halfCoins = addCoinPickups(halfCoins, 1);
  assert.equal(halfCoinsToCoins(halfCoins), 0.5);
  assert.equal(formatCoins(halfCoins), '0.5');

  halfCoins = addCoinPickups(halfCoins, 1);
  assert.equal(halfCoinsToCoins(halfCoins), 1);
  assert.equal(formatCoins(halfCoins), '1');

  halfCoins = addCoinPickups(halfCoins, 1);
  assert.equal(halfCoinsToCoins(halfCoins), 1.5);
  assert.equal(formatCoins(halfCoins), '1.5');
});

test('default skin is 2002 and unlocking skins deducts exact coin cost', () => {
  let progress = createDefaultProgress();
  assert.equal(progress.equippedSkin, '2002');
  assert.deepEqual(progress.unlockedSkins, ['2002']);

  // Cannot equip locked 2004 skin
  progress = equipSkin(progress, '2004');
  assert.equal(progress.equippedSkin, '2002');

  // 199 pickups = 99.5 coins -> cannot unlock 100-coin 2004 skin
  progress.halfCoins = 199;
  assert.equal(canUnlockSkin(progress, '2004'), false);
  const failed = unlockSkin(progress, '2004');
  assert.equal(failed.unlocked, false);

  // 200 pickups = 100 coins -> unlocks 2004 skin and equips it
  progress.halfCoins = addCoinPickups(progress.halfCoins, 1);
  assert.equal(halfCoinsToCoins(progress.halfCoins), 100);
  assert.equal(canUnlockSkin(progress, '2004'), true);

  const ok = unlockSkin(progress, '2004');
  assert.equal(ok.unlocked, true);
  assert.equal(ok.progress.halfCoins, 0);
  assert.equal(ok.progress.equippedSkin, '2004');
  assert.ok(ok.progress.unlockedSkins.includes('2004'));
});

test('lane switching clamps to 3 lanes (-1, 0, +1)', () => {
  const state = createInitialRunnerState();
  assert.equal(state.targetLane, 0);
  assert.equal(switchLane(state, -1), true);
  assert.equal(state.targetLane, -1);
  assert.equal(switchLane(state, -1), false);
  assert.equal(state.targetLane, -1);
  assert.equal(switchLane(state, 1), true);
  assert.equal(switchLane(state, 1), true);
  assert.equal(state.targetLane, 1);
  assert.equal(switchLane(state, 1), false);
});

test('jumping clears a low barrier while standing hits it', () => {
  const lowBarrier: TrackObstacle = {
    id: 1,
    kind: 'barrier_low',
    lane: 0,
    zStart: 0.4,
    zEnd: -0.4,
  };

  // Standing crashes
  const groundedState = createInitialRunnerState();
  const crashEvents = stepRunnerPhysics(groundedState, 0, {
    dt: 0.016,
    obstacles: [lowBarrier],
  });
  assert.equal(crashEvents.crashed, true);
  assert.equal(groundedState.alive, false);

  // Jumping clears it cleanly
  const jumpState = createInitialRunnerState();
  triggerJump(jumpState);
  for (let i = 0; i < 12; i++) {
    stepRunnerPhysics(jumpState, 5, { dt: 0.016, obstacles: [] });
  }
  assert.ok(jumpState.y > 1.1);
  const clearEvents = stepRunnerPhysics(jumpState, 0, {
    dt: 0.016,
    obstacles: [lowBarrier],
  });
  assert.equal(clearEvents.crashed, false);
  assert.equal(jumpState.alive, true);
});

test('sliding ducks cleanly under high overhead barrier', () => {
  const highBarrier: TrackObstacle = {
    id: 2,
    kind: 'barrier_high',
    lane: 0,
    zStart: 0.4,
    zEnd: -0.4,
  };

  // Standing hits high barrier
  const standing = createInitialRunnerState();
  const hit = stepRunnerPhysics(standing, 0, { dt: 0.016, obstacles: [highBarrier] });
  assert.equal(hit.crashed, true);

  // Sliding passes safely underneath
  const sliding = createInitialRunnerState();
  triggerSlide(sliding);
  const safe = stepRunnerPhysics(sliding, 0, { dt: 0.016, obstacles: [highBarrier] });
  assert.equal(safe.crashed, false);
  assert.equal(sliding.alive, true);
});

test('running up a ramp raises player onto train roof safely', () => {
  const rampAndTrain: TrackObstacle[] = [
    { id: 3, kind: 'ramp', lane: 0, zStart: 0, zEnd: -8 },
    { id: 4, kind: 'train_static', lane: 0, zStart: -8, zEnd: -20 },
  ];

  const state = createInitialRunnerState();
  // Walk up ramp from z = 0 to z = -4
  for (let z = 0; z >= -4; z -= 0.5) {
    stepRunnerPhysics(state, z, { dt: 0.016, obstacles: rampAndTrain });
  }
  assert.ok(Math.abs(state.y - TRAIN_HEIGHT * 0.5) < 0.05);

  // Finish ramp to train roof (z = -8 to -10)
  for (let z = -4.5; z >= -10; z -= 0.5) {
    const events = stepRunnerPhysics(state, z, { dt: 0.016, obstacles: rampAndTrain });
    assert.equal(events.crashed, false);
  }
  assert.equal(state.alive, true);
  assert.equal(state.groundHeight, TRAIN_HEIGHT);
  assert.equal(LANE_WIDTH, 2.65);
});
