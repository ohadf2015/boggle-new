/**
 * RankBadge Component
 * Animated rank badge with neo-brutalist pill styling.
 * Updated to complement the Speedometer Gauge results design.
 */

'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { WordHuntStats } from './types';

export interface RankBadgeProps {
  stats: WordHuntStats;
  t: (key: string) => string;
}

/**
 * Smallest board on which a percentile is worth showing. Live daily boards hold
 * 2–8 players, where "Top 38%" (rank 3 of 8) or "Top 67%" (rank 2 of 3) is noise
 * wearing a statistic's clothes — it reads as a demotion of a decent finish. The
 * concrete "#N out of M" pill is honest at every board size and carries the
 * placement on its own.
 */
export const MIN_PLAYERS_FOR_PERCENTILE = 20;

export const RankBadge: React.FC<RankBadgeProps> = ({ stats, t }) => {
  if (!stats.yourStats?.solved || stats.yourStats.rank === undefined) {
    return null;
  }

  const percentile = stats.totalPlayers > 1
    ? Math.max(1, Math.round((stats.yourStats.rank / stats.totalPlayers) * 100))
    : 1;

  const showPercentile =
    stats.totalPlayers >= MIN_PLAYERS_FOR_PERCENTILE &&
    percentile > 0 &&
    percentile < 100;

  return (
    <m.div
      initial={{ scale: 0, rotate: -20, y: 30 }}
      animate={{ scale: [0, 1.15, 1], rotate: [-20, 3, 0], y: [30, -5, 0] }}
      transition={{
        duration: 0.7,
        delay: 0.6,
        times: [0, 0.6, 1],
        ease: 'easeOut',
      }}
      className="flex flex-col items-center gap-2"
    >
      <m.div
        animate={{ rotate: [0, -4, 4, -3, 3, 0] }}
        transition={{ delay: 1.3, duration: 0.6, ease: 'easeInOut' }}
        className="relative inline-flex items-center gap-3 px-5 py-3 bg-amber-400 rounded-neo border-3 border-neo-black shadow-hard overflow-hidden"
      >
        {/* Golden shimmer sweep */}
        <m.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ delay: 1.5, duration: 0.8, ease: 'easeInOut' }}
        />
        <m.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <Trophy className="w-5 h-5 text-neo-black" />
        </m.div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-black text-neo-black text-xl leading-none">
            #{stats.yourStats.rank}
          </span>
          <span className="text-[11px] text-neo-black/60 font-bold">
            {t('wordHunt.results.outOf').replace('{total}', String(stats.totalPlayers))}
          </span>
        </div>
      </m.div>

      {/* Percentile pill with glow — extra excitement for top 5%.
          Hidden at 100% (finished last), and hidden entirely on boards below
          MIN_PLAYERS_FOR_PERCENTILE. The rank pill (#N out of M) always conveys
          the placement. */}
      {showPercentile && (
        <m.div
          initial={{ opacity: 0, scale: 0.5, y: 8 }}
          animate={
            percentile <= 5
              ? { opacity: 1, scale: [0.5, 1.2, 1], y: 0 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 18 }}
          className={
            percentile <= 5
              ? 'px-4 py-1.5 bg-neo-yellow/20 border-2 border-neo-yellow/60 rounded-full text-sm font-black text-neo-yellow'
              : 'px-3 py-1 bg-neo-lime/10 border border-neo-lime/30 rounded-full text-xs font-bold text-neo-lime'
          }
          style={{
            boxShadow: percentile <= 5
              ? '0 0 20px rgba(255, 225, 53, 0.4), 0 0 40px rgba(255, 225, 53, 0.15)'
              : '0 0 12px rgba(191, 255, 0, 0.2)',
          }}
        >
          {t('wordHunt.results.topPercentile').replace('{percentile}', String(percentile))}
        </m.div>
      )}
    </m.div>
  );
};

export default RankBadge;
