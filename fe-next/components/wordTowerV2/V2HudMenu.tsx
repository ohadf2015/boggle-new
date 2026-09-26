'use client';

import { X } from 'lucide-react';
import type { RunState } from '@/lib/wordTowerV2/run';
import type { Estate } from '@/lib/wordTowerV2/estate';
import { type RewardId } from '@/lib/wordTowerV2/rewards';
import { whatsNew } from './estate/estateArt';
import { StreakRing } from './StreakRing';
import { REWARD_ICON } from './v2Icons';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  open: boolean;
  onClose: () => void;
  run: RunState;
  tenants: number;
  estate: Estate;
  raids: number;
  onOpenEstate: () => void;
  reducedMotion?: boolean;
}

const EFFECT_CLASS: Record<'steady' | 'plumb' | 'wide', string> = {
  steady: 'bg-neo-cyan',
  plumb: 'bg-neo-purple',
  wide: 'bg-neo-lime',
};

/**
 * Bottom sheet menu for secondary HUD items at mobile.
 * Contains: streak ring, balls, tenants, effects, and estate button.
 * Reachable via a menu button in the top HUD row.
 */
export function V2HudMenu({
  t,
  open,
  onClose,
  run,
  tenants,
  estate,
  raids,
  onOpenEstate,
  reducedMotion,
}: Props) {
  const effects: Array<{ id: 'steady' | 'plumb' | 'wide'; n: number }> = [];
  if (run.steadyDrops > 0) effects.push({ id: 'steady', n: run.steadyDrops });
  if (run.plumbDrops > 0) effects.push({ id: 'plumb', n: run.plumbDrops });
  if (run.nextWidthMult > 1) effects.push({ id: 'wide', n: 1 });

  const secondary = run.balls > 0 || tenants > 0 || effects.length > 0;

  const news = whatsNew(estate, raids);
  const waiting = news.raids + news.damaged.length + news.affordable.length;

  if (!open) {
    return null;
  }

  return (
    <>
      {/* Backdrop to close drawer on tap */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom sheet drawer */}
      <div
        data-wt2-hud-menu
        className="fixed bottom-0 inset-x-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-neo border-t-neo-thick border-neo-cyan bg-neo-navy shadow-hard-up"
      >
        {/* Close button at top */}
        <div className="sticky top-0 flex items-center justify-between border-b-neo border-neo-cyan/40 bg-neo-navy px-4 py-3">
          <h2 className="font-neo-display text-sm font-bold text-neo-cream uppercase">
            {t('wordTowerV2.hud.menu')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('wordTowerV2.results.close')}
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Menu content */}
        <div className="flex flex-col gap-4 px-4 py-4">
          {/* Streak ring */}
          <div>
            <h3 className="mb-2 text-xs font-bold text-neo-cream/60 uppercase">
              {t('wordTowerV2.streak.label')}
            </h3>
            <div className="flex justify-center">
              <StreakRing
                t={t}
                combo={run.combo}
                bestCombo={run.bestCombo}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>

          {/* Secondary items (balls, tenants, effects) */}
          {secondary ? (
            <div>
              <h3 className="mb-2 text-xs font-bold text-neo-cream/60 uppercase">
                {t('wordTowerV2.hud.banked')}
              </h3>
              <div data-wt2-topbar-secondary className="flex flex-wrap items-center gap-1.5">
                {run.balls > 0 ? (
                  <div
                    className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-pink px-1.5 py-0.5 font-neo-display text-[11px] font-bold text-neo-navy shadow-hard-sm lg:text-base"
                    aria-label={t('wordTowerV2.wreck.balls', { n: run.balls })}
                  >
                    <span aria-hidden>⚒️</span>
                    <span aria-hidden>{run.balls}</span>
                  </div>
                ) : null}
                {tenants > 0 ? (
                  <div
                    className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-[11px] font-bold text-neo-navy shadow-hard-sm lg:text-base"
                    aria-label={t('wordTowerV2.tenants', { n: tenants })}
                  >
                    <span aria-hidden>👥</span>
                    <span aria-hidden>{tenants}</span>
                  </div>
                ) : null}
                {effects.map(({ id, n }) => {
                  const Icon = REWARD_ICON[id as RewardId];
                  return (
                    <div
                      key={`${id}-${n}`}
                      className={`flex items-center gap-1 rounded-neo border-neo border-black px-1.5 py-0.5 font-neo-display text-[11px] font-black text-neo-navy shadow-hard-sm lg:text-base ${EFFECT_CLASS[id]}`}
                      aria-label={t('wordTowerV2.hud.effect', { name: t(`wordTowerV2.reward.${id}.name`), n })}
                    >
                      <Icon className="h-3 w-3 shrink-0 lg:h-5 lg:w-5" aria-hidden />
                      <span className="uppercase" aria-hidden>
                        {t(`wordTowerV2.reward.${id}.name`)}
                      </span>
                      {id === 'wide' ? null : (
                        <span className="tabular-nums" aria-hidden>
                          ×{n}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Estate entry */}
          <button
            type="button"
            onClick={() => {
              onOpenEstate();
              onClose();
            }}
            className="w-full rounded-neo border-neo-thick border-black bg-neo-cream px-4 py-3 font-neo-display font-bold text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            aria-label={t('wordTowerV2.estate.open')}
          >
            <div className="flex items-center justify-between">
              <span>{t('wordTowerV2.estate.open')}</span>
              {waiting > 0 ? (
                <span className="ml-2 rounded-full bg-neo-pink px-2 py-0.5 text-xs font-black tabular-nums text-neo-navy">
                  {waiting}
                </span>
              ) : null}
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
