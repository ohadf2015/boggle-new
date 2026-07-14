/**
 * PastPerformanceCompare Component
 *
 * "How did I do vs my own past plays" — sits right under the score, next to
 * the rank/leaderboard cluster. Also carries a small randomized celebratory
 * "flourish" tag on a solve (variable reward — a bit different each time,
 * independent of score tier).
 */

'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { Trophy, TrendingUp } from 'lucide-react';
import type { PastWordHuntPerformance } from '@/utils/dailyChallenge/storage';

export interface PastPerformanceCompareProps {
  currentScore: number;
  solved: boolean;
  past: PastWordHuntPerformance | null;
  t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    paramsWhenFallback?: Record<string, string | number>,
  ) => string;
}

export type PerformanceComparison =
  | { kind: 'first-play' }
  | { kind: 'new-best'; delta: number }
  | { kind: 'vs-best'; delta: number };

export function computeComparison(currentScore: number, past: PastWordHuntPerformance | null): PerformanceComparison {
  if (!past) return { kind: 'first-play' };
  const delta = currentScore - past.bestScore;
  return delta > 0 ? { kind: 'new-best', delta } : { kind: 'vs-best', delta };
}

const FLOURISHES = [
  { key: 'wordHunt.results.flourishOnFire', fallback: 'On fire!' },
  { key: 'wordHunt.results.flourishNailedIt', fallback: 'Nailed it!' },
  { key: 'wordHunt.results.flourishSolidRun', fallback: 'Solid run!' },
] as const;

export function pickFlourish(rand: () => number = Math.random): (typeof FLOURISHES)[number] {
  return FLOURISHES[Math.floor(rand() * FLOURISHES.length)];
}

export const PastPerformanceCompare: React.FC<PastPerformanceCompareProps> = ({
  currentScore,
  solved,
  past,
  t,
}) => {
  const comparison = useMemo(() => computeComparison(currentScore, past), [currentScore, past]);
  const flourish = useMemo(() => (solved ? pickFlourish() : null), [solved]);

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 26 }}
      className="flex items-center justify-center gap-2 flex-wrap"
    >
      {comparison.kind === 'new-best' && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neo-yellow/20 border-2 border-neo-yellow/60 rounded-full text-xs font-black text-neo-yellow">
          <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
          {t('wordHunt.results.newPersonalBest', 'New personal best!')}
        </span>
      )}
      {comparison.kind === 'vs-best' && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neo-navy-light/50 border-2 border-slate-700/50 rounded-full text-xs font-bold text-neo-white">
          <TrendingUp className="w-3.5 h-3.5 text-neo-cyan" aria-hidden="true" />
          {t('wordHunt.results.vsYourBest', '{delta} vs your best', {
            delta: comparison.delta > 0 ? `+${comparison.delta}` : String(comparison.delta),
          })}
        </span>
      )}
      {comparison.kind === 'first-play' && (
        <span className="text-xs font-bold text-neo-white/70">
          {t('wordHunt.results.firstDailyPlay', 'Your first Word Hunt today — nice start!')}
        </span>
      )}
      {flourish && (
        <span className="inline-flex items-center px-2.5 py-1 bg-neo-pink/15 border-2 border-neo-pink/40 rounded-full text-xs font-black text-neo-pink">
          {t(flourish.key, flourish.fallback)}
        </span>
      )}
    </m.div>
  );
};

export default PastPerformanceCompare;
