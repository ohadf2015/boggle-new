'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Target, Hash, Award, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import PlayerArchetypeBadge from './PlayerArchetypeBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

interface YourQuickStatsProps {
  rank: number;
  totalPlayers: number;
  score: number;
  winnerScore: number;
  wordsFound: number;
  accuracy: number;
  bestWord: string;
  bestWordScore: number;
  archetype: PlayerArchetype | null;
  isWinner: boolean;
}

/**
 * Neo-Brutalist Quick Stats Card
 * Shows the current player's key performance metrics at a glance
 */
const YourQuickStats = memo<YourQuickStatsProps>(({
  rank,
  totalPlayers,
  score,
  winnerScore,
  wordsFound,
  accuracy,
  bestWord,
  bestWordScore,
  archetype,
  isWinner,
}) => {
  const { t } = useLanguage();

  const pointsFromWinner = winnerScore - score;
  const getRankSuffix = (r: number) => {
    if (r === 1) return 'st';
    if (r === 2) return 'nd';
    if (r === 3) return 'rd';
    return 'th';
  };

  // Rank-specific styling
  const rankColors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-neo-lime', text: 'text-neo-black', border: 'border-neo-black' },
    2: { bg: 'bg-slate-300', text: 'text-slate-800', border: 'border-neo-black' },
    3: { bg: 'bg-neo-lime', text: 'text-neo-black', border: 'border-neo-black' },
  };

  const rankStyle = rankColors[rank] || { bg: 'bg-neo-cream', text: 'text-neo-black', border: 'border-neo-black' };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="w-full max-w-sm mx-auto mb-4"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-neo border-3 border-neo-black shadow-hard',
          'bg-neo-navy'
        )}
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        {/* Halftone texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '8px 8px',
          }}
        />

        <div className="relative z-10 p-3 sm:p-4">
          {/* Top row: Rank badge + Score */}
          <div className="flex items-center justify-between mb-3">
            {/* Rank Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.1 }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2',
                rankStyle.bg,
                rankStyle.text,
                rankStyle.border,
                'shadow-hard-sm'
              )}
            >
              <span className="text-2xl sm:text-3xl font-black">
                #{rank}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase opacity-75">
                  {rank}{getRankSuffix(rank)} {t('results.place') || 'Place'}
                </span>
              </div>
            </motion.div>

            {/* Score */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.2 }}
              className="text-right"
            >
              <div className="text-3xl sm:text-4xl font-black text-white">
                {score}
              </div>
              <div className="text-[10px] font-bold uppercase text-white/60">
                {t('results.points') || 'Points'}
              </div>
            </motion.div>
          </div>

          {/* Gap to winner (if not winner) */}
          {!isWinner && pointsFromWinner > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.25 }}
              className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-neo bg-neo-cyan/20 border border-neo-cyan/40"
            >
              <TrendingUp className="w-3.5 h-3.5 text-neo-cyan" />
              <span className="text-xs font-bold text-neo-cyan">
                {t('results.pointsFromFirst', { points: pointsFromWinner }) ||
                  `Just ${pointsFromWinner} pts from 1st!`}
              </span>
            </motion.div>
          )}

          {/* Key Stats Grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {/* Words Found */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.3 }}
              className="bg-white/10 rounded-neo border border-white/20 p-1.5 text-center"
            >
              <div className="flex justify-center mb-0.5">
                <div className="w-5 h-5 rounded bg-neo-lime text-neo-black border border-neo-black flex items-center justify-center">
                  <Hash className="w-3 h-3 text-neo-black" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-white">
                {wordsFound}
              </div>
              <div className="text-[9px] font-bold uppercase text-white/60">
                {t('results.words') || 'Words'}
              </div>
            </motion.div>

            {/* Accuracy */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.35 }}
              className="bg-white/10 rounded-neo border border-white/20 p-1.5 text-center"
            >
              <div className="flex justify-center mb-0.5">
                <div className="w-5 h-5 rounded bg-neo-pink text-white border border-neo-black flex items-center justify-center">
                  <Target className="w-3 h-3 text-neo-black" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-white">
                {accuracy}%
              </div>
              <div className="text-[9px] font-bold uppercase text-white/60">
                {t('results.accuracy') || 'Accuracy'}
              </div>
            </motion.div>

            {/* Best Word */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.4 }}
              className="bg-white/10 rounded-neo border border-white/20 p-1.5 text-center"
            >
              <div className="flex justify-center mb-0.5">
                <div className="w-5 h-5 rounded bg-neo-pink text-white border border-neo-black flex items-center justify-center">
                  <Award className="w-3 h-3 text-neo-cream" />
                </div>
              </div>
              <div className="text-xs sm:text-sm font-black text-white uppercase truncate">
                {bestWord || '-'}
              </div>
              <div className="text-[9px] font-bold uppercase text-white/60">
                {bestWordScore > 0 ? `${bestWordScore} ${t('results.points') || 'pts'}` : (t('results.bestWord') || 'Best')}
              </div>
            </motion.div>
          </div>

          {/* Archetype Badge */}
          {archetype && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.5 }}
              className="flex justify-center"
            >
              <PlayerArchetypeBadge archetype={archetype} size="lg" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

YourQuickStats.displayName = 'YourQuickStats';

export default YourQuickStats;
