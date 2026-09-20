'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { STREAK_PIPS, type StreakBand, streakMeter } from '@/lib/wordTowerV2/rewards';

type T = (key: string, params?: Record<string, string | number>) => string;

const STAR_ART = '/images/word-tower-v2/empire/fx-star.webp';
const CRATE_ART = '/images/word-tower-v2/empire/chest-rare-closed.webp';

interface Props {
  t: T;
  /** Perfect streak right now. */
  combo: number;
  /** Best streak this run — drawn dim so the meter always has something in it. */
  bestCombo: number;
  /** TowerCanvas's own className: the meter centres on the PLAY column, not the screen. */
  canvasClass: string;
  /** Desktop/TV: the play column is wider, so the meter is too. */
  wide?: boolean;
  reducedMotion?: boolean;
}

/** The run's best streak, behind the live fill. */
const BAND_GHOST = 'bg-neo-cyan';

/** Filled-segment colour per band — the bar gets hotter as the streak grows. */
const BAND_FILL: Record<StreakBand, string> = {
  idle: 'bg-neo-lime',
  warm: 'bg-neo-yellow',
  hot: 'bg-neo-orange',
  max: 'bg-neo-pink',
};

/**
 * The live perfect-streak meter, pinned to the top of the play area for the
 * whole run — the one channel that tells the player mid-drop what the streak is
 * worth and how close the next guaranteed RARE crate is.
 *
 * It is on screen from streak 0, because that is the state most of a run is in:
 * empty, it still states the deal ("3 perfect drops -> rare crate"). The marker
 * is not decoration — `rollReward` really does force a rare crate on every
 * `RARE_COMBOS`-th perfect, and `applyLanding` really pays
 * `PERFECT_BONUS x combo`, so every number here is one the run honours.
 */
export const StreakBar = memo(function StreakBar({ t, combo, bestCombo, canvasClass, wide, reducedMotion }: Props) {
  const meter = streakMeter(combo, bestCombo);
  const markerPips = meter.markerAt <= STREAK_PIPS ? meter.markerAt : null;

  return (
    <div className={`pointer-events-none z-20 ${canvasClass}`}>
      <div
        className={`absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 ${wide ? 'top-[5.5rem]' : 'top-[9.75rem]'}`}
        aria-label={t('wordTowerV2.streak.meterA11y', { n: combo, mult: meter.mult, rare: meter.toMarker })}
      >
      <div
        className={`flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-navy px-1.5 py-1 shadow-hard lg:gap-2.5 lg:px-2.5 lg:py-1.5 ${
          wide ? 'w-[32rem] xl:w-[44rem]' : 'w-[19.5rem]'
        }`}
        aria-hidden
      >
        {/* The star is the streak's anchor: it lights up the moment one starts. */}
        <motion.span
          key={`star-${meter.filled}`}
          animate={reducedMotion || meter.filled === 0 ? undefined : { scale: [1, 1.35, 1], rotate: [0, 14, 0] }}
          transition={{ duration: 0.34 }}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-neo border-black lg:h-10 lg:w-10 ${BAND_FILL[meter.band]}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={STAR_ART} alt="" className="h-5 w-5 lg:h-7 lg:w-7" />
        </motion.span>

        <div className="relative h-5 flex-1 rounded-[3px] border-neo border-black bg-black lg:h-8">
          <div className="absolute inset-0 flex gap-[2px] p-[2px]">
            {Array.from({ length: STREAK_PIPS }, (_, i) => (
              <motion.span
                key={i}
                initial={false}
                animate={{ scaleY: i < meter.filled ? 1 : i < meter.ghost ? 0.86 : 0.72 }}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 22 }}
                className={`h-full flex-1 rounded-[1px] ${
                  i < meter.filled ? BAND_FILL[meter.band] : i < meter.ghost ? `${BAND_GHOST} opacity-60` : 'bg-neo-cream/25'
                }`}
              />
            ))}
          </div>
          {/* The rare-crate marker: where the streak stops paying coins and
              starts paying a guaranteed crate. */}
          {markerPips !== null ? (
            <span
              className="absolute -top-1 bottom-[-0.25rem] w-[3px] -translate-x-1/2 bg-black lg:-top-1.5 lg:bottom-[-0.375rem]"
              style={{ left: `${(markerPips / STREAK_PIPS) * 100}%` }}
            />
          ) : null}
        </div>

        {/* The deal, folded INTO the strip: the crate and the number of perfect
            drops still owed for it. Round 2 spent a second stacked pill on this
            sentence and the top band read as a stats dump. */}
        {markerPips !== null ? (
          <motion.span
            key={`crate-${meter.toMarker}`}
            animate={reducedMotion || meter.toMarker > 1 ? undefined : { scale: [1, 1.22, 1] }}
            transition={{ duration: 0.5, repeat: reducedMotion ? 0 : Infinity, repeatDelay: 0.8 }}
            title={t('wordTowerV2.streak.toRare', { n: meter.toMarker })}
            className={`relative flex h-7 shrink-0 items-center gap-0.5 rounded-neo border-neo border-black px-1 lg:h-10 lg:gap-1 lg:px-1.5 ${
              meter.toMarker === 1 ? 'bg-neo-yellow' : 'bg-neo-cyan'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CRATE_ART} alt="" className="h-6 w-6 lg:h-8 lg:w-8" />
            <span className="font-neo-display text-sm font-black tabular-nums text-neo-navy lg:text-2xl">{meter.toMarker}</span>
          </motion.span>
        ) : null}
      </div>
      </div>
    </div>
  );
});
