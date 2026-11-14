import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { GameHud } from './components/GameHud';
import { SkinWardrobeModal } from './components/SkinWardrobeModal';
import { SpiderMaskIcon } from './components/SpiderMaskIcon';
import {
  equipSkin,
  formatCoins,
  loadProgress,
  PlayerProgress,
  recordRunResult,
  saveProgress,
  unlockSkin,
} from './game/economy';
import { getSkinById, SkinId } from './game/skins';
import { GameMode, HudSnapshot, mountSubwayScene, SubwayController } from './game/SubwayScene';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  distance: 0,
  runHalfCoins: 0,
  speed: 63,
  magnetRemaining: 0,
  sneakersRemaining: 0,
  stumbleWarning: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SubwayController | null>(null);

  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [mode, setMode] = useState<GameMode>('title');
  const [previewSkin, setPreviewSkin] = useState<SkinId>(() => loadProgress().equippedSkin);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [finalRun, setFinalRun] = useState<HudSnapshot | null>(null);
  const [muted, setMuted] = useState(false);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    document.body.dataset.state = mode;
  }, [mode]);

  const handleGameOver = useCallback((snapshot: HudSnapshot) => {
    setFinalRun(snapshot);
    setMode('gameover');
    setProgress((prev) => {
      const updated = recordRunResult(
        prev,
        snapshot.runHalfCoins,
        snapshot.score,
        snapshot.distance,
      );
      saveProgress(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = mountSubwayScene(container, progressRef.current.equippedSkin, {
      onHudUpdate: (snap) => setHud(snap),
      onGameOver: handleGameOver,
      onModeChange: (nextMode) => setMode(nextMode),
    });
    controllerRef.current = controller;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setMode('playing');
      controller.startRun(true);
    }

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [handleGameOver]);

  const startGame = useCallback((skipIntro = false) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setFinalRun(null);
    setHud(INITIAL_HUD);
    setMode('playing');
    controllerRef.current?.setSkin(progressRef.current.equippedSkin);
    controllerRef.current?.startRun(skipIntro);
  }, []);

  const openSkins = useCallback(() => {
    const equipped = progressRef.current.equippedSkin;
    setPreviewSkin(equipped);
    setMode('skins');
    controllerRef.current?.setSkin(equipped);
    controllerRef.current?.setMode('skins');
  }, []);

  const closeSkinsToTitle = useCallback(() => {
    const equipped = progressRef.current.equippedSkin;
    setPreviewSkin(equipped);
    setMode('title');
    controllerRef.current?.setSkin(equipped);
    controllerRef.current?.resetToTitle();
  }, []);

  const pauseGame = useCallback(() => {
    if (modeRef.current !== 'playing') return;
    setMode('paused');
    controllerRef.current?.setMode('paused');
  }, []);

  const resumeGame = useCallback(() => {
    if (modeRef.current !== 'paused') return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMode('playing');
    controllerRef.current?.setMode('playing');
  }, []);

  const returnToTitle = useCallback(() => {
    setMode('title');
    controllerRef.current?.setSkin(progressRef.current.equippedSkin);
    controllerRef.current?.resetToTitle();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      controllerRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleSelectPreview = useCallback((skinId: SkinId) => {
    setPreviewSkin(skinId);
    controllerRef.current?.setSkin(skinId);
  }, []);

  const handleUnlockOrEquip = useCallback((skinId: SkinId) => {
    setProgress((prev) => {
      const next = prev.unlockedSkins.includes(skinId)
        ? equipSkin(prev, skinId)
        : unlockSkin(prev, skinId).progress;
      saveProgress(next);
      controllerRef.current?.setSkin(next.equippedSkin);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (modeRef.current === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startGame(false);
      } else if (modeRef.current === 'playing' && (e.code === 'Escape' || e.code === 'KeyP')) {
        e.preventDefault();
        pauseGame();
      } else if (modeRef.current === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
        e.preventDefault();
        resumeGame();
      } else if (e.code === 'KeyM') {
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pauseGame, resumeGame, startGame, toggleMute]);

  const equippedSkin = getSkinById(progress.equippedSkin);

  return (
    <main className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Isolated WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" data-testid="webgl-canvas" />

      {/* Title Screen — No Logo, Street McDonald's + Peter + Venom Backdrop */}
      {mode === 'title' && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 pointer-events-none">
          {/* Top-Right Compact Stats */}
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-slate-950/90 border border-slate-700/80 pointer-events-auto">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span
                  className="font-display text-2xl font-bold text-amber-300 tabular-nums leading-none"
                  data-testid="bank-coins"
                >
                  {formatCoins(progress.halfCoins)}
                </span>
                <span className="text-xs text-slate-300 font-medium">Coins</span>
              </div>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-300 font-medium tabular-nums">
                Best {progress.bestScore}
              </span>
            </div>
          </div>

          {/* Right/Bottom Action Region leaving Left McDonald's + Peter + Venom Clear */}
          <div className="flex flex-col items-end justify-end gap-4 mt-auto">
            <div className="w-full max-w-md rounded-xl bg-slate-950/92 border border-slate-800 p-6 pointer-events-auto shadow-2xl">
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
                ROOFTOP RUN
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-2">
                <SpiderMaskIcon skinId={equippedSkin.id} size={18} />
                <span>Active Suit: {equippedSkin.yearLabel} {equippedSkin.name}</span>
                <span aria-hidden="true">·</span>
                <span>1 Coin = 0.5 Credit</span>
              </div>

              <div className="flex items-center gap-3 mt-5">
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startGame(false)}
                  className="flex-1 py-3 px-6 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display text-2xl font-extrabold tracking-wide uppercase transition-colors cursor-pointer whitespace-nowrap"
                >
                  Tap to Start
                </button>
                <button
                  type="button"
                  onClick={openSkins}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <SpiderMaskIcon skinId={progress.equippedSkin} size={24} />
                  <span>Skins</span>
                </button>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-200 hud-stroke tracking-wide">
              A/D or Left/Right Move · W/Space Jump · S Slide · Esc Pause
            </p>
          </div>
        </div>
      )}

      {/* Skins Wardrobe */}
      {mode === 'skins' && (
        <SkinWardrobeModal
          progress={progress}
          previewSkinId={previewSkin}
          onSelectPreview={handleSelectPreview}
          onUnlockOrEquip={handleUnlockOrEquip}
          onClose={closeSkinsToTitle}
          onStartWithEquipped={() => startGame(false)}
        />
      )}

      {/* Active Gameplay HUD */}
      {mode === 'playing' && (
        <GameHud
          hud={hud}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={pauseGame}
        />
      )}

      {/* Pause Modal */}
      {mode === 'paused' && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75"
          role="dialog"
          aria-label="Game Paused"
        >
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              PAUSED
            </h2>
            <div className="grid grid-cols-2 gap-3 my-5">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Score</div>
                <div className="font-display text-2xl font-bold text-white tabular-nums mt-0.5">
                  {hud.score}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Run Coins</div>
                <div className="font-display text-2xl font-bold text-amber-300 tabular-nums mt-0.5">
                  {formatCoins(hud.runHalfCoins)}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={resumeGame}
                className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => startGame(true)}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Restart Run
              </button>
              <button
                type="button"
                onClick={returnToTitle}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {mode === 'gameover' && finalRun && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75"
          role="dialog"
          aria-label="Run Complete"
        >
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Caught on the Rooftop
            </div>
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-white leading-none mt-1">
              RUN OVER
            </h2>

            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Score</div>
                <div className="font-display text-2xl font-bold text-white tabular-nums mt-0.5">
                  {finalRun.score}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Distance</div>
                <div className="font-display text-2xl font-bold text-white tabular-nums mt-0.5">
                  {finalRun.distance}m
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Coins</div>
                <div className="font-display text-2xl font-bold text-amber-300 tabular-nums mt-0.5">
                  +{formatCoins(finalRun.runHalfCoins)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 mb-5 px-1 tabular-nums">
              <span>Bank Total: {formatCoins(progress.halfCoins)} Coins</span>
              <span>Best Score: {progress.bestScore}</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={() => startGame(true)}
                className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display text-xl font-bold tracking-wide uppercase transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={openSkins}
                  className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  Skins
                </button>
                <button
                  type="button"
                  onClick={returnToTitle}
                  className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
