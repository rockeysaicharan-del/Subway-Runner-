import React from 'react';
import { ArrowLeft, Coins, Lock } from 'lucide-react';
import { canUnlockSkin, formatCoins, PlayerProgress } from '../game/economy';
import { SkinId, SUIT_SKINS } from '../game/skins';
import { SpiderMaskIcon } from './SpiderMaskIcon';

interface SkinWardrobeModalProps {
  progress: PlayerProgress;
  previewSkinId: SkinId;
  onSelectPreview: (skinId: SkinId) => void;
  onUnlockOrEquip: (skinId: SkinId) => void;
  onClose: () => void;
  onStartWithEquipped: () => void;
}

export const SkinWardrobeModal: React.FC<SkinWardrobeModalProps> = ({
  progress,
  previewSkinId,
  onSelectPreview,
  onUnlockOrEquip,
  onClose,
  onStartWithEquipped,
}) => {
  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none"
      role="dialog"
      aria-label="Spider-Masks Wardrobe"
    >
      {/* Top Bar: Back + Coin Balance */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900/95 border border-slate-700 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Done</span>
        </button>

        <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-slate-900/95 border border-sky-400/50">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-display text-2xl font-bold tracking-tight tabular-nums text-amber-300">
              {formatCoins(progress.halfCoins)}
            </span>
            <span className="text-xs text-slate-300 font-medium">Coins</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            1 Pickup Coin = 0.5 Value (2 coins = 1 Full Coin)
          </span>
        </div>
      </div>

      {/* Right-Docked Mask List (keeps left 3D cuboidal suit showcase unobstructed) */}
      <div className="flex flex-col lg:items-end gap-3 mt-auto max-h-[82vh]">
        <div className="w-full lg:w-[460px] rounded-2xl bg-slate-950/94 border border-slate-800 p-4 sm:p-5 pointer-events-auto shadow-2xl flex flex-col max-h-full">
          <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <SpiderMaskIcon skinId={previewSkinId} size={28} />
              <h2 className="font-display text-2xl font-extrabold tracking-wide text-sky-400 leading-none uppercase">
                Spider-Masks
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 sm:hidden">1 pickup = 0.5 coin</span>
          </div>

          {/* 5 Mask-Only Skin Cards */}
          <div
            className="flex flex-col gap-2.5 overflow-y-auto pr-0.5"
            role="listbox"
            aria-label="Select suit skin"
          >
            {SUIT_SKINS.map((skin) => {
              const unlocked = progress.unlockedSkins.includes(skin.id);
              const equipped = progress.equippedSkin === skin.id;
              const selected = previewSkinId === skin.id;
              const affordable = canUnlockSkin(progress, skin.id);

              return (
                <div
                  key={skin.id}
                  role="option"
                  aria-selected={selected}
                  tabIndex={0}
                  onClick={() => onSelectPreview(skin.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectPreview(skin.id);
                    }
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    equipped
                      ? 'bg-indigo-950/85 border-sky-400 ring-1 ring-sky-400/70'
                      : selected
                        ? 'bg-slate-900 border-amber-400/90'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {/* Mask-Only Skin Logo Tile */}
                  <div className="w-13 h-13 shrink-0 rounded-xl bg-slate-950/90 border border-white/10 flex items-center justify-center">
                    <SpiderMaskIcon skinId={skin.id} size={42} />
                  </div>

                  {/* Title & Concise Subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg font-bold text-white leading-tight truncate">
                      {skin.yearLabel} {skin.name}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {skin.subtitle}
                    </div>
                  </div>

                  {/* Equip / Equipped / Lock-Cost Action Button */}
                  <div className="shrink-0">
                    {unlocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPreview(skin.id);
                          onUnlockOrEquip(skin.id);
                        }}
                        disabled={equipped}
                        className={`px-3.5 py-2 rounded-lg font-bold text-xs tracking-wide uppercase transition-colors whitespace-nowrap ${
                          equipped
                            ? 'bg-sky-400 text-slate-950 cursor-default'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                        }`}
                      >
                        {equipped ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPreview(skin.id);
                          if (affordable) onUnlockOrEquip(skin.id);
                        }}
                        disabled={!affordable}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs tabular-nums transition-colors whitespace-nowrap ${
                          affordable
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 border border-slate-700 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-300" />
                        <span>{skin.costCoins}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onStartWithEquipped}
            data-start="true"
            className="mt-3.5 w-full py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-display text-xl font-extrabold tracking-wide uppercase transition-colors cursor-pointer shrink-0"
          >
            Tap to Start
          </button>
        </div>
      </div>
    </div>
  );
};
