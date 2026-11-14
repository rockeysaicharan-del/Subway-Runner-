import { DEFAULT_SKIN_ID, getSkinById, SkinId, SUIT_SKINS } from './skins';

export const HALF_COINS_PER_PICKUP = 1; // 1 pickup = 1/2 coin; 2 pickups = 1 full coin
export const STORAGE_KEY = 'subway_web_runner_progress_v1';

export interface PlayerProgress {
  halfCoins: number; // 1 halfCoin = 0.5 coin
  unlockedSkins: SkinId[];
  equippedSkin: SkinId;
  bestScore: number;
  bestDistance: number;
}

export function createDefaultProgress(): PlayerProgress {
  return {
    halfCoins: 0,
    unlockedSkins: [DEFAULT_SKIN_ID],
    equippedSkin: DEFAULT_SKIN_ID,
    bestScore: 0,
    bestDistance: 0,
  };
}

export function addCoinPickups(currentHalfCoins: number, pickups = 1): number {
  const safeCurrent = Math.max(0, Math.round(currentHalfCoins));
  const safePickups = Math.max(0, Math.round(pickups));
  return safeCurrent + safePickups * HALF_COINS_PER_PICKUP;
}

export function halfCoinsToCoins(halfCoins: number): number {
  return Math.max(0, Math.round(halfCoins)) / 2;
}

export function formatCoins(halfCoins: number): string {
  const safeHalf = Math.max(0, Math.round(halfCoins));
  if (safeHalf % 2 === 0) {
    return String(safeHalf / 2);
  }
  return (safeHalf / 2).toFixed(1);
}

export function canUnlockSkin(progress: PlayerProgress, skinId: SkinId): boolean {
  if (progress.unlockedSkins.includes(skinId)) return false;
  const skin = getSkinById(skinId);
  return progress.halfCoins >= skin.costCoins * 2;
}

export function unlockSkin(
  progress: PlayerProgress,
  skinId: SkinId,
): { progress: PlayerProgress; unlocked: boolean } {
  if (progress.unlockedSkins.includes(skinId)) {
    return {
      progress: { ...progress, equippedSkin: skinId },
      unlocked: true,
    };
  }
  const skin = getSkinById(skinId);
  const requiredHalfCoins = skin.costCoins * 2;
  if (progress.halfCoins < requiredHalfCoins) {
    return { progress, unlocked: false };
  }
  return {
    progress: {
      ...progress,
      halfCoins: progress.halfCoins - requiredHalfCoins,
      unlockedSkins: [...progress.unlockedSkins, skinId],
      equippedSkin: skinId,
    },
    unlocked: true,
  };
}

export function equipSkin(progress: PlayerProgress, skinId: SkinId): PlayerProgress {
  if (!progress.unlockedSkins.includes(skinId)) {
    return progress;
  }
  return {
    ...progress,
    equippedSkin: skinId,
  };
}

export function recordRunResult(
  progress: PlayerProgress,
  runHalfCoins: number,
  runScore: number,
  runDistance: number,
): PlayerProgress {
  return {
    ...progress,
    halfCoins: addCoinPickups(progress.halfCoins, runHalfCoins),
    bestScore: Math.max(progress.bestScore, Math.round(runScore)),
    bestDistance: Math.max(progress.bestDistance, Math.round(runDistance)),
  };
}

export function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createDefaultProgress();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const validIds = new Set<SkinId>(SUIT_SKINS.map((s) => s.id));
    const unlocked = Array.isArray(parsed.unlockedSkins)
      ? parsed.unlockedSkins.filter((id): id is SkinId => validIds.has(id))
      : [];
    if (!unlocked.includes(DEFAULT_SKIN_ID)) {
      unlocked.unshift(DEFAULT_SKIN_ID);
    }
    const equipped =
      parsed.equippedSkin && unlocked.includes(parsed.equippedSkin)
        ? parsed.equippedSkin
        : DEFAULT_SKIN_ID;
    return {
      halfCoins: typeof parsed.halfCoins === 'number' && parsed.halfCoins >= 0 ? Math.round(parsed.halfCoins) : 0,
      unlockedSkins: unlocked,
      equippedSkin: equipped,
      bestScore: typeof parsed.bestScore === 'number' && parsed.bestScore >= 0 ? Math.round(parsed.bestScore) : 0,
      bestDistance: typeof parsed.bestDistance === 'number' && parsed.bestDistance >= 0 ? Math.round(parsed.bestDistance) : 0,
    };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore quota or storage restriction errors
  }
}
