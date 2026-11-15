'use client';

import { useEffect } from 'react';
import { m } from 'framer-motion';
import { CHALLENGE_BONUS, type Challenge } from '@/lib/wordTowerV2/rush/challenges';
import type { ChallengeResult } from './useChallenge';

type T = (key: string, params?: Record<string, string | number>) => string;

export function challengeText(t: T, ch: Challenge): string {
  if (ch.kind === 'long') return t('wordTowerV2.challenge.long', { n: ch.minLen });
  return t(`wordTowerV2.challenge.${ch.kind}`);
}

/** The armed challenge, beside the next blocks: what to do with the next word, and the prize. */
export function ChallengeChip({ t, challenge, reducedMotion }: { t: T; challenge: Challenge | null; reducedMotion?: boolean }) {
  if (!challenge) return null;
  return (
    <m.div
      key={`${challenge.kind}-${'minLen' in challenge ? challenge.minLen : ''}`}
      data-wt2-challenge={challenge.kind}
      role="status"
      aria-label={`${t('wordTowerV2.challenge.label')}: ${challengeText(t, challenge)}. ${t('wordTowerV2.challenge.prize', { n: CHALLENGE_BONUS })}`}
      initial={reducedMotion ? false : { scale: 0.3, rotate: -10, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 15 }}
      className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-yellow py-0.5 pe-2 ps-1 text-neo-navy shadow-hard-sm"
    >
      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-neo-sm border-2 border-black bg-neo-pink text-sm motion-safe:animate-pulse">
        🎯
      </span>
      <span aria-hidden className="flex flex-col font-neo-display leading-none">
        <span className="text-xs font-black uppercase">{challengeText(t, challenge)}</span>
        <span className="text-[9px] font-bold uppercase opacity-80">{t('wordTowerV2.challenge.prize', { n: CHALLENGE_BONUS })}</span>
      </span>
    </m.div>
  );
}

export const CHALLENGE_RESULT_MS = 2200;

/** Done or missed, right after the floor lands. */
export function ChallengeResultToast({ t, result, onDone, reducedMotion, topOffset }: { t: T; result: ChallengeResult; onDone: () => void; reducedMotion?: boolean; topOffset: string }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, CHALLENGE_RESULT_MS);
    return () => window.clearTimeout(id);
  }, [result.key, onDone]);
  return (
    <m.div
      key={result.key}
      role="status"
      data-wt2-challenge-result={result.met ? 'met' : 'missed'}
      style={{ top: topOffset }}
      initial={reducedMotion ? false : { y: -20, scale: result.met ? 0.6 : 1, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 460, damping: result.met ? 12 : 24 }}
      className={`pointer-events-none absolute inset-x-0 z-40 mx-auto w-fit rounded-neo border-neo-thick border-black px-3 py-1.5 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard ${
        result.met ? 'bg-neo-lime' : 'bg-neo-cream'
      }`}
    >
      {result.met ? t('wordTowerV2.challenge.done', { n: CHALLENGE_BONUS }) : t('wordTowerV2.challenge.missed')}
    </m.div>
  );
}
