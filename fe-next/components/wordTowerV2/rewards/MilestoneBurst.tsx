'use client';

import { useEffect } from 'react';
import { AnimatePresence, m } from 'framer-motion';
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
const STARS = [
  { x: -120, y: -70 },
  { x: -64, y: 60 },
  { x: -16, y: -78 },
  { x: 32, y: 64 },
  { x: 88, y: -70 },
  { x: 132, y: 52 },
];

/**
 * Every fifth floor pays a burst: the number slams in with an overshoot, a
 * shock ring punches out behind it and stars spray. Every piece is a small
 * element, never a full-screen layer, so it stays cheap on phones.
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
      className={`pointer-events-none absolute start-0 top-[46%] z-20 flex justify-center px-4 ${wide ? 'end-[22rem] xl:end-[26rem]' : 'end-0'}`}
      aria-live="polite"
    >
      <AnimatePresence>
        {milestone ? (
          <m.div
            key={milestone.key}
            initial={reducedMotion ? { opacity: 1 } : { scale: 0.3, opacity: 0, rotate: -14, y: 24 }}
            animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: -2, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.25, y: -12 }}
            transition={{ type: 'spring', stiffness: 520, damping: 13 }}
            className="relative flex max-w-full items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink px-5 py-2 text-neo-navy shadow-hard-lg"
            aria-label={t('wordTowerV2.milestone.a11y', { n: milestone.floors })}
          >
            {reducedMotion ? null : (
              <m.span
                data-wt2-milestone-ring
                aria-hidden
                className="absolute left-1/2 top-1/2 -z-10 h-24 w-24 rounded-full border-[6px] border-neo-yellow"
                style={{ marginLeft: -48, marginTop: -48 }}
                initial={{ scale: 0.4, opacity: 1 }}
                animate={{ scale: 3.2, opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            )}
            <m.span
              className="font-neo-display text-5xl font-black tabular-nums lg:text-7xl"
              aria-hidden
              initial={reducedMotion ? false : { scale: 1.8 }}
              animate={reducedMotion ? undefined : { scale: [1.8, 0.9, 1] }}
              transition={{ duration: 0.4, times: [0, 0.6, 1], ease: 'easeOut', delay: 0.05 }}
            >
              {milestone.floors}
            </m.span>
            <span className="min-w-0 break-words font-neo-display text-xl font-black uppercase leading-tight lg:text-3xl" aria-hidden>
              {t('wordTowerV2.milestone.floors')}
            </span>
            {reducedMotion
              ? null
              : STARS.map((s) => (
                  <m.img
                    key={s.x}
                    src={STAR_ART}
                    alt=""
                    aria-hidden
                    className="absolute left-1/2 top-1/2 h-8 w-8"
                    initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                    animate={{ x: s.x, y: s.y, scale: 1, opacity: 0, rotate: s.x }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                ))}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
