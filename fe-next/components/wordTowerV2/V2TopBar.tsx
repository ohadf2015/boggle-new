'use client';

import { memo, type RefObject } from 'react';
import { Building2, Hammer, Trophy, Users } from 'lucide-react';
import { floorsAt } from '@/lib/wordTowerV2/biomes';
import type { Estate } from '@/lib/wordTowerV2/estate';
import { type RewardId, type StreakBand, streakMeter } from '@/lib/wordTowerV2/rewards';
import type { RunState } from '@/lib/wordTowerV2/run';
import { ITEM, whatsNew } from './estate/estateArt';
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
  estate: Estate;
  /** Coins banked THIS run — added to the bank for display, never stored twice. */
  runCoins: number;
  /** Raids waiting, for the empire badge. */
  raids: number;
  /** ImpactBurst flies its coins into this exact rect. */
  coinsRef: RefObject<HTMLDivElement | null>;
  onOpenEstate: () => void;
  /** Desktop/TV: the play column is narrower, so the bar is too. */
  wide?: boolean;
  reducedMotion?: boolean;
}

const EFFECT_CLASS: Record<'steady' | 'plumb' | 'wide', string> = {
  steady: 'bg-neo-cyan',
  plumb: 'bg-neo-purple',
  wide: 'bg-neo-lime',
};

/**
 * Ring stroke per streak band — it gets hotter as the streak grows.
 *
 * These are `stroke` ATTRIBUTES, not `stroke-neo-*` classes: only lime, cyan,
 * pink and purple have that utility generated, so `stroke-neo-yellow` and
 * `stroke-neo-orange` would silently paint nothing.
 */
const BAND_STROKE: Record<StreakBand, string> = {
  idle: 'var(--neo-lime)',
  warm: 'var(--neo-yellow)',
  hot: 'var(--neo-orange)',
  max: 'var(--neo-pink)',
};

/** The prize the ring counts down to — same art the crate banner uses. */
const CRATE_ART = '/images/word-tower-v2/empire/chest-rare-closed.webp';

const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;

/**
 * The perfect-streak meter as a RING instead of a full-width bar.
 *
 * Same deal as before — the fill is `streakMeter().ratio`, and the number in
 * the middle is the perfect drops still owed for the next guaranteed rare
 * crate — but it costs one slot in the HUD row instead of a 19.5rem strip
 * across the play area.
 */
function StreakRing({ t, combo, bestCombo, reducedMotion }: { t: T; combo: number; bestCombo: number; reducedMotion?: boolean }) {
  const meter = streakMeter(combo, bestCombo);
  const ghostRatio = Math.max(meter.ratio, meter.ghost / Math.max(1, meter.markerAt));

  return (
    <div
      data-wt2-streak-ring
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-neo-thick border-black bg-neo-navy shadow-hard lg:h-14 lg:w-14"
      aria-label={t('wordTowerV2.streak.meterA11y', { n: combo, mult: meter.mult, rare: meter.toMarker })}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r={RING_R} fill="none" stroke="var(--neo-cream)" strokeOpacity={0.22} strokeWidth="4" />
        {/* The run's best streak, behind the live fill: the meter still reads as
            a meter in the frames right after a streak breaks. */}
        <circle
          cx="18"
          cy="18"
          r={RING_R}
          fill="none"
          stroke="var(--neo-cyan)"
          strokeOpacity={0.45}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${ghostRatio * RING_C} ${RING_C}`}
        />
        <circle
          cx="18"
          cy="18"
          r={RING_R}
          fill="none"
          stroke={BAND_STROKE[meter.band]}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${meter.ratio * RING_C} ${RING_C}`}
          className={reducedMotion ? undefined : 'transition-[stroke-dasharray] duration-300'}
        />
      </svg>
      {/* The prize sits INSIDE the ring and the countdown rides its edge: the
          crate hung outside on a negative offset read as a detached sticker. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CRATE_ART} alt="" aria-hidden className="relative h-5 w-5 lg:h-7 lg:w-7" />
      <span
        className="absolute -bottom-1 -end-1 min-w-[1.1rem] rounded-full border-neo border-black bg-neo-cream px-1 text-center font-neo-display text-[11px] font-black tabular-nums leading-tight text-neo-navy lg:text-sm"
        aria-hidden
      >
        {meter.toMarker}
      </span>
      {combo >= 2 ? (
        <span className="absolute -start-1.5 -top-1.5 rounded-neo border-neo border-black bg-neo-orange px-1 font-neo-display text-[10px] font-black tabular-nums text-neo-navy shadow-hard-sm lg:text-xs">
          ×{meter.mult}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Word Tower v2's whole top band, in ONE row.
 *
 * It replaces five independently-positioned layers (the HUD column, the empire
 * button, the coin rail, the streak bar, each with its own hand-tuned `top-*`)
 * with a single flex row, so nothing can overlap and the play area keeps its
 * height. `pe-12` reserves the corner the global mute FAB is pinned to.
 *
 * Coins are ONE number — bank plus this run — because two visually identical
 * yellow coin pills two rows apart was the single worst thing in the old HUD.
 */
export const V2TopBar = memo(function V2TopBar({
  t,
  heightM,
  score,
  bestM,
  run,
  tenants,
  estate,
  runCoins,
  raids,
  coinsRef,
  onOpenEstate,
  wide,
  reducedMotion,
}: Props) {
  const floors = Math.floor(floorsAt(heightM) + 0.05);
  const coins = estate.coins + runCoins;
  const news = whatsNew(estate, raids);
  const waiting = news.raids + news.damaged.length + news.affordable.length;

  const effects: Array<{ id: 'steady' | 'plumb' | 'wide'; n: number }> = [];
  if (run.steadyDrops > 0) effects.push({ id: 'steady', n: run.steadyDrops });
  if (run.plumbDrops > 0) effects.push({ id: 'plumb', n: run.plumbDrops });
  if (run.nextWidthMult > 1) effects.push({ id: 'wide', n: 1 });

  const secondary = run.balls > 0 || tenants > 0 || effects.length > 0;

  return (
    <div
      data-wt2-topbar
      className={`pointer-events-none absolute top-[max(0.5rem,env(safe-area-inset-top))] z-40 flex flex-col gap-1.5 ${
        wide ? 'inset-x-3' : 'inset-x-3 pe-12'
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        {/* Primary: how high am I. Floor leads — it is an apartment tower. */}
        <div
          className="flex items-baseline gap-1.5 rounded-neo border-neo-thick border-black bg-neo-lime px-2.5 py-1 text-neo-navy shadow-hard lg:px-3.5 lg:py-1.5"
          aria-label={t('wordTowerV2.hud.floorA11y', { n: floors, m: heightM.toFixed(1) })}
        >
          <span className="font-neo-display text-2xl font-black leading-none tabular-nums lg:text-4xl" aria-hidden>
            {floors}
          </span>
          <span className="font-neo-display text-[11px] font-bold tabular-nums opacity-75 lg:text-base" aria-hidden>
            {heightM.toFixed(1)}
            {t('wordTowerV2.unitM')}
          </span>
        </div>

        <div className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy/85 px-2 py-0.5 font-neo-display text-base font-bold tabular-nums text-neo-cream lg:text-2xl">
          {score.toLocaleString()}
        </div>

        {bestM > 0.5 ? (
          <div
            className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-[11px] font-bold text-neo-navy shadow-hard-sm lg:text-base"
            aria-label={t('wordTower.hud.best', { m: bestM.toFixed(1) })}
          >
            <Trophy className="h-3 w-3 lg:h-5 lg:w-5" aria-hidden />
            <span aria-hidden>{bestM.toFixed(1)}</span>
          </div>
        ) : null}

        <div className="ms-auto flex items-center gap-2">
          <StreakRing t={t} combo={run.combo} bestCombo={run.bestCombo} reducedMotion={reducedMotion} />

          {/* ONE coin number: the bank plus what this run has banked into it. */}
          <div
            ref={coinsRef}
            className="flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-yellow px-2 py-1 text-neo-navy shadow-hard lg:px-3"
            aria-label={t('wordTowerV2.coins.run', { n: coins })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ITEM.coin} alt="" aria-hidden className="h-4 w-4 lg:h-6 lg:w-6" />
            <span className="font-neo-display text-base font-black tabular-nums lg:text-2xl" aria-hidden>
              {coins.toLocaleString()}
            </span>
          </div>

          {/* Icon only: the coin count next to it already answered "how rich am I". */}
          <button
            type="button"
            onClick={onOpenEstate}
            aria-label={t('wordTowerV2.estate.open')}
            className="pointer-events-auto relative flex h-9 w-9 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed lg:h-12 lg:w-12"
          >
            <Building2 className="h-5 w-5 lg:h-7 lg:w-7" aria-hidden />
            {waiting > 0 ? (
              <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-neo border-black bg-neo-pink px-1 font-neo-display text-[11px] font-black shadow-hard-sm animate-neo-pop">
                {waiting}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Everything the run BANKED. Absent entirely when there is nothing in
          it — an empty row of chips is the clutter this bar exists to remove. */}
      {secondary ? (
        <div data-wt2-topbar-secondary className="flex flex-wrap items-center gap-1.5">
          {run.balls > 0 ? (
            <div
              key={`balls-${run.balls}`}
              className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-pink px-1.5 py-0.5 font-neo-display text-[11px] font-bold text-neo-navy shadow-hard-sm animate-neo-pop lg:text-base"
              aria-label={t('wordTowerV2.wreck.balls', { n: run.balls })}
            >
              <Hammer className="h-3 w-3 lg:h-5 lg:w-5" aria-hidden />
              <span aria-hidden>{run.balls}</span>
            </div>
          ) : null}
          {tenants > 0 ? (
            <div
              key={`tenants-${tenants}`}
              className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-[11px] font-bold text-neo-navy shadow-hard-sm animate-neo-pop lg:text-base"
              aria-label={t('wordTowerV2.tenants', { n: tenants })}
            >
              <Users className="h-3 w-3 lg:h-5 lg:w-5" aria-hidden />
              <span aria-hidden>{tenants}</span>
            </div>
          ) : null}
          {effects.map(({ id, n }) => {
            const Icon = REWARD_ICON[id as RewardId];
            return (
              <div
                key={`${id}-${n}`}
                className={`flex items-center gap-1 rounded-neo border-neo border-black px-1.5 py-0.5 font-neo-display text-[11px] font-black text-neo-navy shadow-hard-sm animate-neo-pop lg:text-base ${EFFECT_CLASS[id]}`}
                aria-label={t('wordTowerV2.hud.effect', { name: t(`wordTowerV2.reward.${id}.name`), n })}
              >
                <Icon className="h-3 w-3 lg:h-5 lg:w-5" aria-hidden />
                {id === 'wide' ? null : <span className="tabular-nums">×{n}</span>}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});
