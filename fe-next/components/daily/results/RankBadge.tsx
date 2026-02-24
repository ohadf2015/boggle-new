/**
 * RankBadge Component
 * Animated rank badge with neo-brutalist pill styling.
 * Updated to complement the Speedometer Gauge results design.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { WordHuntStats } from './types';

export interface RankBadgeProps {
  stats: WordHuntStats;
  t: (key: string) => string;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ stats, t }) => {
  if (!stats.yourStats?.solved || stats.yourStats.rank === undefined) {
    return null;
  }

  const percentile = stats.totalPlayers > 0
    ? Math.round((1 - (stats.yourStats.rank - 1) / stats.totalPlayers) * 100)
    : 0;

  return (
    <motion.div
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
      <motion.div
        animate={{ rotate: [0, -4, 4, -3, 3, 0] }}
        transition={{ delay: 1.3, duration: 0.6, ease: 'easeInOut' }}
        className="relative inline-flex items-center gap-3 px-5 py-3 bg-amber-400 rounded-neo border-3 border-neo-black shadow-hard overflow-hidden"
      >
        {/* Golden shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ delay: 1.5, duration: 0.8, ease: 'easeInOut' }}
        />
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <Trophy className="w-5 h-5 text-neo-black" />
        </motion.div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-black text-neo-black text-xl leading-none">
            #{stats.yourStats.rank}
          </span>
          <span className="text-[11px] text-neo-black/60 font-bold">
            {t('wordHunt.results.outOf').replace('{total}', String(stats.totalPlayers))}
          </span>
        </div>
      </motion.div>

      {/* Percentile pill with glow */}
      {percentile > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 18 }}
          className="px-3 py-1 bg-neo-lime/10 border border-neo-lime/30 rounded-full text-xs font-bold text-neo-lime"
          style={{ boxShadow: '0 0 12px rgba(191, 255, 0, 0.2)' }}
        >
          {t('wordHunt.results.topPercentile').replace('{percentile}', String(percentile))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default RankBadge;
