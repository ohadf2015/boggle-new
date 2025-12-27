'use client';

import React, { memo } from 'react';
import { FaListUl, FaTrophy, FaComments } from 'react-icons/fa';

interface MobileWordStatsProps {
  wordCount: number;
  rank: number;
  totalPlayers: number;
  t: (key: string, params?: Record<string, string | number>) => string;
  onOpenWords: () => void;
  onOpenLeaderboard: () => void;
  onOpenChat: () => void;
}

/**
 * MobileWordStats - Compact stats bar for mobile view
 * Shows word count and rank, with tap-to-expand functionality
 */
export const MobileWordStats = memo<MobileWordStatsProps>(({
  wordCount,
  rank,
  totalPlayers,
  t,
  onOpenWords,
  onOpenLeaderboard,
  onOpenChat,
}) => {
  return (
    <div className="lg:hidden bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo shadow-hard flex items-center justify-between px-3 py-2">
      {/* Word count - tap to open words drawer */}
      <button
        onClick={onOpenWords}
        className="flex items-center gap-2 px-3 py-1.5 bg-neo-cyan rounded-neo border-2 border-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard transition-all"
      >
        <FaListUl className="text-neo-black" />
        <span className="font-black text-neo-black">
          {wordCount} {t('playerView.words') || 'words'}
        </span>
      </button>

      {/* Rank - tap to open leaderboard drawer */}
      <button
        onClick={onOpenLeaderboard}
        className="flex items-center gap-2 px-3 py-1.5 bg-neo-purple text-white rounded-neo border-2 border-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard transition-all"
      >
        <FaTrophy className="text-neo-yellow" />
        <span className="font-black text-neo-cream">
          #{rank}/{totalPlayers}
        </span>
      </button>

      {/* Chat button */}
      <button
        onClick={onOpenChat}
        className="flex items-center gap-2 px-3 py-1.5 bg-neo-gray text-white rounded-neo border-2 border-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard transition-all"
      >
        <FaComments className="text-neo-cyan" />
      </button>
    </div>
  );
});

MobileWordStats.displayName = 'MobileWordStats';

export default MobileWordStats;
