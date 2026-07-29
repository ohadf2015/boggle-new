'use client';

/**
 * GlobalRankBadge - Display player's global leaderboard position
 *
 * Shows a styled badge with the player's rank on the global leaderboard.
 */

import React from 'react';
import { m } from 'framer-motion';
import { Globe } from 'lucide-react';

interface GlobalRankBadgeProps {
  rank: number;
  label: string;
}

/**
 * Animated badge showing global rank position
 */
export function GlobalRankBadge({ rank, label }: GlobalRankBadgeProps): React.ReactElement {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 26 }}
      className="flex items-center justify-center"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-cyan/50 bg-neo-cyan/10">
        <Globe className="w-4 h-4 text-neo-cyan" />
        <span className="text-sm font-bold text-neo-white">{label}:</span>
        <span className="text-lg font-black text-neo-cyan">#{rank}</span>
      </div>
    </m.div>
  );
}
