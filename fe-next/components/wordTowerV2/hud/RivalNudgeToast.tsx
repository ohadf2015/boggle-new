'use client';

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import type { GhostRival } from '@/lib/wordTowerV2/rush/types';

type T = (key: string, params?: Record<string, string | number>) => string;

export const RIVAL_NUDGE_MS = 5500;

/** The rival worth hitting: the next tower above you, and how far above. Null when nobody is ahead. */
export function rivalAhead(rival: GhostRival | null | undefined, heightM: number): { name: string; gapM: number } | null {
  if (!rival) return null;
  const gap = rival.peakM - heightM;
  if (!(gap > 0.5)) return null;
  return { name: rival.name, gapM: Math.ceil(gap) };
}

/** Bumps once each time the run earns another wrecking ball (never for the count it started with). */
export function useBallEarned(balls: number): number {
  const last = useRef<number | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    const prev = last.current;
    last.current = balls;
    if (prev !== null && balls > prev) setKey((k) => k + 1);
  }, [balls]);
  return key;
}

interface Props {
  t: T;
  balls: number;
  target: { name: string; gapM: number } | null;
  /** Present only while the rivals screen can open (between drops). */
  onWreck?: () => void;
  reducedMotion?: boolean;
}

/**
 * A wrecking ball used to land silently in a counter nobody read. Now earning
 * one says who to use it on: the tower right above you, by name and metres
 * (player ask, Nov 2026: "the wrecking ball should suggest it").
 */
export function RivalNudgeToast({ t, balls, target, onWreck, reducedMotion }: Props) {
  const key = useBallEarned(balls);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (key === 0) return;
    setShown(key);
    const id = window.setTimeout(() => setShown(0), RIVAL_NUDGE_MS);
    return () => window.clearTimeout(id);
  }, [key]);
  if (!shown) return null;

  return (
    <m.div
      key={shown}
      role="status"
      data-wt2-rival-nudge
      initial={reducedMotion ? false : { x: 40, rotate: 4, opacity: 0 }}
      animate={{ x: 0, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      className="pointer-events-auto flex w-full items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-pink p-2.5 text-neo-navy shadow-hard"
    >
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-yellow text-xl motion-safe:animate-neo-shake">
        ⚒️
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-neo-display text-base font-black uppercase leading-tight">{t('wordTowerV2.nudge.ballTitle')}</span>
        <span className="block text-xs font-bold leading-snug">
          {target ? t('wordTowerV2.nudge.ballAhead', { name: target.name, m: target.gapM }) : t('wordTowerV2.nudge.ballAny')}
        </span>
      </span>
      {onWreck ? (
        <button
          type="button"
          data-wt2-nudge-wreck
          onClick={() => {
            setShown(0);
            onWreck();
          }}
          className="shrink-0 rounded-neo border-neo-thick border-black bg-neo-cream px-2.5 py-1.5 font-neo-display text-sm font-black uppercase shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px]"
        >
          {t('wordTowerV2.nudge.wreck')}
        </button>
      ) : null}
    </m.div>
  );
}
