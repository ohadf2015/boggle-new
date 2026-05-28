'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, Minus, Hash, Target, Lock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import PlayerArchetypeBadge from './PlayerArchetypeBadge';
import { AchievementBadge } from '@/components/AchievementBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { GameAchievement } from '@/components/results/types';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { useSparklineTrend } from '@/hooks/useSparklineTrend';
import type { CoinReward, CoinRewardMode } from './CoinRewardDisplay';


/** Max achievement badges to show inline */
const MAX_VISIBLE_ACHIEVEMENTS = 3;

// ==================== Animation Variants ====================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 22 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25, delay: 0.4 },
  },
};

const achievementVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 18,
      delay: 0.5 + i * 0.08,
    },
  }),
};

// ==================== Types ====================

interface CompactResultsStatsProps {
  /** Number of valid words found */
  wordCount: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Total words submitted (valid + invalid) for fraction display */
  totalWords?: number;
  /** Optional player archetype to display */
  archetype?: PlayerArchetype | null;
  /** Game achievements earned (optional) */
  achievements?: GameAchievement[];
  /** Optional coin reward to display inline */
  coinReward?: CoinReward | null;
  /** Coin reward mode: 'earned' for authenticated users, 'teasing' for guests */
  coinRewardMode?: CoinRewardMode;

  /** Current game score for sparkline highlight */
  currentScore?: number;
  /** Additional className for the container */
  className?: string;
}

// ==================== Component ====================

/**
 * CompactResultsStats - Shared stats card for results pages
 *
 * Used in both SinglePlayerResults and ResultsPage (multiplayer)
 *
 * Layout:
 * - Row 1: Grid of stat cards (Words, Accuracy, Coins) with stagger entrance
 * - Row 2: Sparkline trend + Archetype badge (when available)
 */
const CompactResultsStats: React.FC<CompactResultsStatsProps> = memo(({
  wordCount,
  accuracy,
  archetype,
  achievements,
  coinReward,
  coinRewardMode = 'earned',
  currentScore,
  totalWords,
  className,
}) => {
  const { t } = useLanguage();
  const { sparklineScores, trend: visualTrend, hasSparkline } = useSparklineTrend(currentScore);

  // Check if we have coin/brain rewards to show
  const hasCoinReward = coinReward && coinReward.awarded > 0;
  const isTeasing = coinRewardMode === 'teasing';


  return (
    <m.div
      className={cn(
        'bg-neo-navy border-3 border-neo-black rounded-neo p-3 sm:p-4 shadow-hard space-y-3',
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Row 1: Core Stats + Rewards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Words */}
        <m.div
          variants={statCardVariants}
          whileHover={{ scale: 1.04, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } }}
          className="bg-white/10 rounded-neo border-2 border-white/20 p-2 sm:p-3 text-center"
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-neo bg-neo-lime text-neo-black flex items-center justify-center border border-neo-black">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white">{wordCount}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-white font-bold uppercase">
            {t('results.words')}
          </div>
        </m.div>

        {/* Accuracy */}
        <m.div
          variants={statCardVariants}
          whileHover={{ scale: 1.04, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } }}
          className="bg-white/10 rounded-neo border-2 border-white/20 p-2 sm:p-3 text-center"
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-neo bg-neo-pink text-neo-white flex items-center justify-center border border-neo-black">
              <Target className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white">
              {totalWords != null ? `${wordCount}/${totalWords}` : `${accuracy}%`}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-white font-bold uppercase">
            {t('results.accuracy')}
          </div>
        </m.div>

        {/* Coins - earned mode */}
        {hasCoinReward && !isTeasing && (
          <m.div
            variants={statCardVariants}
            whileHover={{ scale: 1.04, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } }}
            className="bg-neo-lime/20 rounded-neo border-2 border-neo-lime/40 p-2 sm:p-3 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Coins className="w-5 h-5 text-neo-lime" />
              <span className="text-xl sm:text-2xl font-black text-neo-lime">+{coinReward.awarded}</span>
            </div>
            <div className="text-[10px] sm:text-xs text-neo-lime/70 font-bold uppercase">
              {t('reveal.coins')}
            </div>
          </m.div>
        )}

        {/* Coins - teasing mode for guests */}
        {hasCoinReward && isTeasing && (
          <m.div
            variants={statCardVariants}
            whileHover={{ scale: 1.04, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } }}
            className="bg-slate-600/30 rounded-neo border-2 border-slate-500/50 p-2 sm:p-3 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Lock className="w-4 h-4 text-amber-400/70" />
              <Coins className="w-5 h-5 text-amber-400/50" />
              <span className="text-xl sm:text-2xl font-black text-amber-400/70">+{coinReward.awarded}</span>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-bold">
              {t('coins.signInShort')}
            </div>
          </m.div>
        )}

        {/* Empty placeholders to maintain grid when fewer items */}
        {!hasCoinReward && (
          <>
            <div className="hidden sm:block" />
            <div className="hidden sm:block" />
          </>
        )}
      </div>

      {/* Row 2: Sparkline + Archetype (only if we have either) */}
      {(hasSparkline || archetype) && (
        <m.div
          variants={rowVariants}
          className="flex items-center justify-between gap-3 pt-2 border-t border-white/10"
        >
          {/* Mini Sparkline with Trend */}
          {hasSparkline ? (
            <div className="flex items-center gap-2">
              <MiniSparkline
                data={sparklineScores}
                trend={visualTrend}
                width={70}
                height={32}
                variant="dark"
              />
              {visualTrend && (
                <div className="flex items-center gap-1">
                  <div className={cn(
                    'w-5 h-5',
                    visualTrend.direction === 'up' && 'text-neo-lime',
                    visualTrend.direction === 'down' && 'text-neo-red',
                    visualTrend.direction === 'stable' && 'text-neo-cyan'
                  )}>
                    {visualTrend.direction === 'up' && <TrendingUp className="w-5 h-5" />}
                    {visualTrend.direction === 'down' && <TrendingDown className="w-5 h-5" />}
                    {visualTrend.direction === 'stable' && <Minus className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    'text-xs font-bold',
                    visualTrend.direction === 'up' && 'text-neo-lime',
                    visualTrend.direction === 'down' && 'text-neo-red',
                    visualTrend.direction === 'stable' && 'text-white'
                  )}>
                    {visualTrend.direction === 'up' && (t('chart.improving'))}
                    {visualTrend.direction === 'down' && (t('chart.declining'))}
                    {visualTrend.direction === 'stable' && (t('chart.stable'))}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Archetype Badge */}
          {archetype && (
            <PlayerArchetypeBadge archetype={archetype} size="sm" showTooltip={true} />
          )}
        </m.div>
      )}

      {/* Row 3: Achievement badges with stagger pop-in */}
      {achievements && achievements.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/10">
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 15, delay: 0.45 }}
          >
            <Award className="w-4 h-4 text-neo-lime shrink-0" />
          </m.div>
          {achievements.slice(0, MAX_VISIBLE_ACHIEVEMENTS).map((ach, i) => (
            <m.div
              key={ach.key || ach.name || `ach-${i}`}
              custom={i}
              variants={achievementVariants}
              initial="hidden"
              animate="visible"
            >
              <AchievementBadge achievement={ach} index={i} />
            </m.div>
          ))}
          {achievements.length > MAX_VISIBLE_ACHIEVEMENTS && (
            <m.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs font-bold text-white px-1.5 py-0.5 bg-white/10 rounded-neo border border-white/20"
            >
              +{achievements.length - MAX_VISIBLE_ACHIEVEMENTS}
            </m.span>
          )}
        </div>
      )}
    </m.div>
  );
});

CompactResultsStats.displayName = 'CompactResultsStats';

export default CompactResultsStats;
