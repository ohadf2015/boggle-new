'use client';

import { streakMeter, type StreakBand } from '@/lib/wordTowerV2/rewards';

type T = (key: string, params?: Record<string, string | number>) => string;

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
export function StreakRing({ t, combo, bestCombo, reducedMotion }: { t: T; combo: number; bestCombo: number; reducedMotion?: boolean }) {
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
