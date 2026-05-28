'use client';

import React from 'react';
import type { WordHuntStats } from './types';

export interface StatsBlurbProps {
  stats: WordHuntStats;
  solved: boolean;
  t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    paramsWhenFallback?: Record<string, string | number>,
  ) => string;
}

const MIN_PLAYERS = 10;

export const StatsBlurb: React.FC<StatsBlurbProps> = ({ stats, solved, t }) => {
  if (stats.totalPlayers < MIN_PLAYERS) return null;

  const percentile = stats.yourStats?.percentile;
  const usePercentile = solved && typeof percentile === 'number' && percentile > 0;

  const text = usePercentile
    ? t(
        'wordHunt.stats.blurbPercentile',
        "You're in the top {percentile}% today.",
        { percentile: percentile as number },
      )
    : t(
        'wordHunt.stats.blurbSolveRate',
        'Only {solveRate}% of players solved today.',
        { solveRate: stats.solveRate },
      );

  return (
    <p className="text-center text-sm text-neo-white font-neo-body px-2">
      {text}
    </p>
  );
};

export default StatsBlurb;
