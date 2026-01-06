/**
 * RankBadge Component
 * Animated rank badge showing player's position
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

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', delay: 0.3 }}
      className="flex justify-center"
    >
      <div className="inline-block px-4 py-2 bg-amber-400 rounded-neo border-2 border-neo-black shadow-hard-sm">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-neo-black" />
          <span className="font-black text-neo-black text-sm">
            {t('wordHunt.results.rankOutOf')
              .replace('{rank}', String(stats.yourStats.rank))
              .replace('{total}', String(stats.totalPlayers))}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default RankBadge;
