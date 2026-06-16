'use client';

import { useState } from 'react';
import { Palette, Lock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOWER_SKINS } from '@/lib/wordTower/skins';
import type { UseTowerSkin } from './useTowerSkin';

interface Props {
  skin: UseTowerSkin;
  /** Player's personal-best height (m) — drives which skins read as unlocked. */
  bestHeightM: number;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  reducedMotion?: boolean;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/**
 * Compact tower-skin picker: a palette FAB that opens a sheet of skins. Unlocked
 * skins equip on tap; locked ones show the height still to climb (the carrot).
 * Self-contained open state so the parent mounts it with one line.
 */
export function WordTowerSkinPicker({ skin, bestHeightM, t, dir, reducedMotion }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger — a small palette button tucked under the top bar. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('wordTower.skin.open')}
        className="pointer-events-auto absolute end-2 top-[14%] z-[9] flex h-9 w-9 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-navy/85 text-neo-cyan shadow-hard backdrop-blur-sm active:translate-y-0.5 active:shadow-hard-pressed"
      >
        <Palette className="h-5 w-5" />
        {/* Live swatch dot of the equipped skin. */}
        <span
          className="absolute -bottom-1 -end-1 h-3 w-3 rounded-full border border-black"
          style={{ background: hex(skin.palette.city) }}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          dir={dir}
          role="dialog"
          aria-modal="true"
          aria-label={t('wordTower.skin.pickerTitle')}
          onClick={() => setOpen(false)}
        >
          <div
            className={cn(
              'max-h-[80vh] w-full max-w-md overflow-y-auto rounded-neo border-neo-thick border-black bg-neo-navy shadow-hard',
              !reducedMotion && 'animate-neo-pop',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-neo border-black/60 px-4 py-3">
              <h2 className="font-neo-display text-lg font-black uppercase tracking-wide text-neo-white">
                {t('wordTower.skin.pickerTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="rounded-neo border-neo border-black bg-neo-navy-light p-1 text-neo-white active:translate-y-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-2 p-3">
              {TOWER_SKINS.map((s) => {
                const unlocked = skin.isUnlocked(s.id);
                const equipped = skin.skinId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => unlocked && skin.setSkinId(s.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-neo border-neo-thick border-black px-3 py-2 text-start shadow-hard transition-transform',
                        equipped ? 'bg-neo-lime/15 ring-2 ring-neo-lime' : 'bg-neo-navy-light',
                        unlocked ? 'active:translate-y-0.5 active:shadow-hard-pressed' : 'opacity-55',
                      )}
                    >
                      {/* Material swatch — a 3-stop strip reading the skin's climb. */}
                      <span className="flex shrink-0 overflow-hidden rounded-neo border-neo border-black" aria-hidden>
                        <span className="h-9 w-3" style={{ background: hex(s.palette.city) }} />
                        <span className="h-9 w-3" style={{ background: hex(s.palette.stratosphere) }} />
                        <span className="h-9 w-3" style={{ background: hex(s.palette.galaxy) }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">
                          {t(s.nameKey)}
                          {!unlocked && <Lock className="h-3 w-3 text-neo-white/60" aria-hidden />}
                        </span>
                        <span className="block truncate font-neo-body text-[11px] text-neo-white/55">
                          {t(s.blurbKey)}
                        </span>
                      </span>
                      {/* Right rail — equipped tick / equip CTA / locked threshold. */}
                      {equipped ? (
                        <span className="flex shrink-0 items-center gap-1 font-neo-body text-[10px] font-bold uppercase text-neo-lime">
                          <Check className="h-3.5 w-3.5" /> {t('wordTower.skin.equipped')}
                        </span>
                      ) : unlocked ? (
                        <span className="shrink-0 rounded-neo border-neo border-black bg-neo-cyan px-2 py-0.5 font-neo-display text-[11px] font-black uppercase text-black">
                          {t('wordTower.skin.equip')}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-neo border-neo border-black bg-neo-navy px-2 py-0.5 font-neo-body text-[10px] font-bold uppercase tracking-wide text-neo-orange">
                          {t('wordTower.skin.locked', { m: s.unlockAtM })}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
