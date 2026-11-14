import React from 'react';
import { Coins, Pause, Volume2, VolumeX } from 'lucide-react';
import { formatCoins } from '../game/economy';
import { HudSnapshot } from '../game/SubwayScene';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  onToggleMute,
  onPause,
}) => {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none p-4 sm:p-6 flex flex-col justify-between">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Score & Distance */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <span
              className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white tabular-nums hud-stroke leading-none"
              data-testid="hud-score"
            >
              {hud.score}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 hud-stroke">
              Score
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-100 tabular-nums hud-stroke">
            <span data-testid="hud-distance">{hud.distance} m</span>
            <span aria-hidden="true">·</span>
            <span>{hud.speed} km/h</span>
          </div>
          {hud.stumbleWarning && (
            <div className="mt-1 inline-flex items-center px-2.5 py-1 rounded bg-red-600/90 text-white text-xs font-bold uppercase tracking-wider w-fit">
              Venom Close
            </div>
          )}
        </div>

        {/* Top-Right: Half-Coin Counter + Mute / Pause Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-950/80 border border-slate-700/80">
            <Coins className="w-5 h-5 text-amber-400" />
            <span
              className="font-display text-2xl sm:text-3xl font-extrabold text-amber-300 tabular-nums leading-none"
              data-testid="hud-coins"
            >
              {formatCoins(hud.runHalfCoins)}
            </span>
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="pointer-events-auto w-11 h-11 rounded-lg bg-slate-950/85 border border-slate-700/80 flex items-center justify-center text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause game (P or Escape)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="pointer-events-auto w-11 h-11 rounded-lg bg-slate-950/85 border border-slate-700/80 flex items-center justify-center text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom-Left Active Powerups */}
      <div className="flex flex-col gap-2 items-start">
        {hud.magnetRemaining > 0 && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/85 border border-red-500/60">
            <span className="text-xs font-bold uppercase tracking-wider text-red-300">
              Magnet
            </span>
            <span className="font-display text-lg font-bold text-white tabular-nums">
              {hud.magnetRemaining.toFixed(1)}s
            </span>
          </div>
        )}
        {hud.sneakersRemaining > 0 && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/85 border border-cyan-500/60">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Super Jump
            </span>
            <span className="font-display text-lg font-bold text-white tabular-nums">
              {hud.sneakersRemaining.toFixed(1)}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
