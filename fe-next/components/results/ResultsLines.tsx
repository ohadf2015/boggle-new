'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { BestMissedWord } from './bestMissedWord';

type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Fires `fire` once per mount, the first time `ready` is true. */
function useOnce(ready: boolean, fire: () => void) {
  const sent = useRef(false);
  const latest = useRef(fire);
  latest.current = fire;
  useEffect(() => {
    if (!ready || sent.current) return;
    sent.current = true;
    latest.current();
  }, [ready]);
}

interface BestMissedWordLineProps {
  best: BestMissedWord | null;
  mode: string;
  language: string;
  t: TFn;
  className?: string;
}

/** "You missed STRANGER (8 letters, 500 points)" — one line, no panel. */
export function BestMissedWordLine({ best, mode, language, t, className }: BestMissedWordLineProps) {
  useOnce(!!best, () => {
    if (best) trackGrowthEvent('best_missed_word_shown', { word_length: best.letters, points: best.points, mode });
  });
  if (!best) return null;
  const shown = (language === 'he' ? applyHebrewFinalLetters(best.word) : best.word).toUpperCase();
  return (
    <p data-testid="best-missed-word" dir="auto" className={cn('font-neo-body font-bold text-sm leading-snug', className)}>
      {t('results.bestMissedWord', { word: shown, letters: best.letters, points: best.points })}
    </p>
  );
}

interface RewardLineProps {
  coins: number | null | undefined;
  xp: number | null | undefined;
  mode: string;
  t: TFn;
  className?: string;
  /** Optional leading glyph (Quick Play flies its coins from here). */
  leading?: React.ReactNode;
}

/** The one reward line: "+N coins · +N XP" (either part dropped when zero). */
export function RewardLine({ coins, xp, mode, t, className, leading }: RewardLineProps) {
  const c = coins && coins > 0 ? coins : 0;
  const x = xp && xp > 0 ? xp : 0;
  useOnce(c > 0 || x > 0, () => trackGrowthEvent('results_reward_line_shown', { coins: c, xp: x, mode }));
  if (c === 0 && x === 0) return null;
  const parts: Array<{ id: string; amount: number; label: string }> = [];
  if (c > 0) parts.push({ id: 'coins', amount: c, label: t('results.rewardLine.coins') });
  if (x > 0) parts.push({ id: 'xp', amount: x, label: t('results.rewardLine.xp') });
  return (
    <p data-testid="results-reward-line" className={cn('inline-flex flex-wrap items-center gap-1.5 font-neo-display font-bold tabular-nums', className)}>
      {leading}
      {parts.map((p, i) => (
        <span key={p.id} data-testid={`results-reward-${p.id}`} className="inline-flex items-baseline gap-1">
          {i > 0 && <span aria-hidden="true" className="opacity-60">·</span>}
          {/* "+N" is an LTR island: never "N+" in Hebrew. */}
          <span dir="ltr">+{p.amount}</span>
          <span>{p.label}</span>
        </span>
      ))}
    </p>
  );
}
