/**
 * RankBadge Component
 * Animated rank badge with two-phase reveal: scale-in + wobble, plus percentile display
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
      initial={{ scale: 0, rotate: -15, y: 20 }}
      animate={{ scale: 1, rotate: 0, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 12,
        delay: 0.6,
      }}
      className="flex flex-col items-center gap-2"
    >
      <motion.div
        animate={{ rotate: [0, -3, 3, -2, 0] }}
        transition={{ delay: 1.2, duration: 0.5, ease: 'easeInOut' }}
        className="inline-block px-5 py-3 bg-amber-400 rounded-neo border-3 border-neo-black shadow-hard"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-neo-black" />
          <div>
            <span className="font-black text-neo-black text-base block">
              #{stats.yourStats.rank}
            </span>
            <span className="text-[10px] text-neo-black/60 font-bold">
              {t('wordHunt.results.outOf').replace('{total}', String(stats.totalPlayers))}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Percentile display */}
      {percentile > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, type: 'spring', stiffness: 200, damping: 20 }}
          className="text-xs font-bold text-slate-400"
        >
          {t('wordHunt.results.topPercentile').replace('{percentile}', String(percentile))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default RankBadge;
