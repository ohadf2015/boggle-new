import { memo } from 'react';
import { Hammer, Trophy, Users } from 'lucide-react';
import { floorsAt } from '@/lib/wordTowerV2/biomes';
import type { RewardId } from '@/lib/wordTowerV2/rewards';
import type { RunState } from '@/lib/wordTowerV2/run';
import { REWARD_ICON } from './v2Icons';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  heightM: number;
  score: number;
  bestM: number;
  run: RunState;
  /** Tenants who have visibly arrived (the HUD never runs ahead of the art). */
  tenants: number;
}

const EFFECT_CLASS: Record<'steady' | 'plumb' | 'wide', string> = {
  steady: 'bg-neo-cyan',
  plumb: 'bg-neo-purple',
  wide: 'bg-neo-lime',
};


/**
 * Word Tower v2 HUD: floor count first (it is an apartment tower), metres and
 * score under it and live crate effects as chips. The perfect-streak meter
 * lives in rewards/StreakBar.tsx — one streak channel, not two.
 * Celebrations live in V2Celebrations.
 */
export const V2Hud = memo(function V2Hud({ t, heightM, score, bestM, run, tenants }: Props) {
  const floors = Math.floor(floorsAt(heightM) + 0.05);
  const effects: Array<{ id: 'steady' | 'plumb' | 'wide'; n: number }> = [];
  if (run.steadyDrops > 0) effects.push({ id: 'steady', n: run.steadyDrops });
  if (run.plumbDrops > 0) effects.push({ id: 'plumb', n: run.plumbDrops });
  if (run.nextWidthMult > 1) effects.push({ id: 'wide', n: 1 });

  return (
    <>
      <div className="pointer-events-none absolute start-3 top-3 z-20 flex flex-col items-start gap-1.5" aria-live="polite">
        <div
          className="flex items-end gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-3 py-1 text-neo-navy shadow-hard lg:px-4 lg:py-1.5"
          aria-label={t('wordTowerV2.hud.floorA11y', { n: floors, m: heightM.toFixed(1) })}
        >
          <div className="flex flex-col leading-none" aria-hidden>
            <span className="font-neo-display text-[10px] font-black uppercase tracking-widest lg:text-xs">{t('wordTowerV2.hud.floor')}</span>
            <span className="font-neo-display text-4xl font-black tabular-nums lg:text-6xl">{floors}</span>
          </div>
          <span className="mb-1 font-neo-display text-sm font-bold tabular-nums opacity-80 lg:text-xl" aria-hidden>
            {heightM.toFixed(1)}
            {t('wordTowerV2.unitM')}
          </span>
        </div>
        {/* Score and the best line share ONE row: they answer the same question
            ("how am I doing?") and used to sit on two, above three more chip
            rows, so the top-left corner read as a stats dump. */}
        <div className="flex items-center gap-1.5">
          <div className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy/85 px-2 py-0.5 font-neo-display text-lg font-bold tabular-nums text-neo-cream lg:text-2xl">
            {score.toLocaleString()}
          </div>
          {bestM > 0.5 ? (
            <div className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-bold text-neo-navy shadow-hard-sm lg:text-base">
              <Trophy className="h-3.5 w-3.5 lg:h-5 lg:w-5" aria-hidden />
              {t('wordTower.hud.best', { m: bestM.toFixed(1) })}
            </div>
          ) : null}
        </div>
        {/* Everything the run BANKED, one row: wrecking balls, tenants, crate
            effects. Scrambles left are on the scramble button itself — the HUD
            copy of that number was pure duplication. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            key={`balls-${run.balls}`}
            className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-pink px-2 py-0.5 font-neo-display text-xs font-bold text-neo-navy shadow-hard-sm animate-neo-pop lg:text-base"
            aria-label={t('wordTowerV2.wreck.balls', { n: run.balls })}
          >
            <Hammer className="h-3.5 w-3.5 lg:h-5 lg:w-5" aria-hidden />
            {run.balls}
          </div>
          {tenants > 0 ? (
            <div
              key={`tenants-${tenants}`}
              className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-cream px-2 py-0.5 font-neo-display text-xs font-bold text-neo-navy shadow-hard-sm animate-neo-pop lg:text-base"
              aria-label={t('wordTowerV2.tenants', { n: tenants })}
            >
              <Users className="h-3.5 w-3.5 lg:h-5 lg:w-5" aria-hidden />
              {tenants}
            </div>
          ) : null}
          {effects.map(({ id, n }) => {
            const Icon = REWARD_ICON[id as RewardId];
            return (
              <div
                key={`${id}-${n}`}
                className={`flex items-center gap-1 rounded-neo border-neo border-black px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy shadow-hard-sm animate-neo-pop lg:text-base ${EFFECT_CLASS[id]}`}
                aria-label={t('wordTowerV2.hud.effect', { name: t(`wordTowerV2.reward.${id}.name`), n })}
              >
                <Icon className="h-3.5 w-3.5 lg:h-5 lg:w-5" aria-hidden />
                {id === 'wide' ? null : <span className="tabular-nums">×{n}</span>}
              </div>
            );
          })}
        </div>
      </div>

    </>
  );
});
