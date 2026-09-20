'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Milestone } from './useRunRewards';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  milestone: Milestone | null;
  onDone: () => void;
  /** Desktop/TV: centre over the play column, not under the side panel. */
  wide?: boolean;
  reducedMotion?: boolean;
}

const HOLD_MS = 1300;
const STAR_ART = '/images/word-tower-v2/empire/fx-star.webp';
const STARS = [-120, -64, -16, 32, 88, 132];

/**
 * Every fifth floor pays a burst: the number the player is chasing, thrown big
 * across the middle with a shower of stars. Short — it must never sit on the
 * next drop.
 */
export function MilestoneBurst({ t, milestone, onDone, wide, reducedMotion }: Props) {
  const key = milestone?.key;
  useEffect(() => {
    if (key === undefined) return;
    const id = window.setTimeout(onDone, HOLD_MS);
    return () => window.clearTimeout(id);
  }, [key, onDone]);

  return (
    <div
      className={`pointer-events-none absolute start-0 top-[46%] z-20 flex justify-center ${wide ? 'end-[22rem] xl:end-[26rem]' : 'end-0'}`}
      aria-live="polite"
    >
      <AnimatePresence>
        {milestone ? (
          <motion.div
            key={milestone.key}
            initial={reducedMotion ? { opacity: 1 } : { scale: 0.4, opacity: 0, rotate: -6 }}
            animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: -2 }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.3 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            className="relative flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink px-5 py-2 text-neo-navy shadow-hard-lg"
            aria-label={t('wordTowerV2.milestone.a11y', { n: milestone.floors })}
          >
            <span className="font-neo-display text-5xl font-black tabular-nums" aria-hidden>
              {milestone.floors}
            </span>
            <span className="font-neo-display text-xl font-black uppercase leading-tight" aria-hidden>
              {t('wordTowerV2.milestone.floors')}
            </span>
            {reducedMotion
              ? null
              : STARS.map((dx, i) => (
                  <motion.img
                    key={dx}
                    src={STAR_ART}
                    alt=""
                    aria-hidden
                    className="absolute left-1/2 top-1/2 h-8 w-8"
                    initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                    animate={{ x: dx, y: i % 2 === 0 ? -70 : 60, scale: 1, opacity: 0, rotate: dx }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
