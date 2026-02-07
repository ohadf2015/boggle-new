'use client';

import React, { memo } from 'react';
import { Coins, Brain, TrendingUp, TrendingDown, Minus, Hash, Target, Lock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import PlayerArchetypeBadge from './PlayerArchetypeBadge';
import { AchievementBadge } from '@/components/AchievementBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { GameAchievement } from '@/components/results/types';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { useSparklineTrend } from '@/hooks/useSparklineTrend';
import type { CoinReward, CoinRewardMode } from './CoinRewardDisplay';
import type { BrainPointsReward } from './BrainPointsDisplay';

/** Max achievement badges to show inline */
const MAX_VISIBLE_ACHIEVEMENTS = 3;

interface CompactResultsStatsProps {
  /** Number of valid words found */
  wordCount: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Optional player archetype to display */
  archetype?: PlayerArchetype | null;
  /** Game achievements earned (optional) */
  achievements?: GameAchievement[];
  /** Optional coin reward to display inline */
  coinReward?: CoinReward | null;
  /** Coin reward mode: 'earned' for authenticated users, 'teasing' for guests */
  coinRewardMode?: CoinRewardMode;
  /** Optional brain points reward to display inline */
  brainPointsReward?: BrainPointsReward | null;
  /** Current game score for sparkline highlight */
  currentScore?: number;
  /** Additional className for the container */
  className?: string;
}

/**
 * CompactResultsStats - Shared stats card for results pages
 *
 * Used in both SinglePlayerResults and ResultsPage (multiplayer)
 *
 * Layout:
 * - Row 1: Grid of stat cards (Words, Accuracy, Coins, Brain Points)
 * - Row 2: Sparkline trend + Archetype badge (when available)
 *
 * Designed to sit below ResultsWinnerBanner, which shows rank and score.
 */
const CompactResultsStats: React.FC<CompactResultsStatsProps> = memo(({
  wordCount,
  accuracy,
  archetype,
  achievements,
  coinReward,
  coinRewardMode = 'earned',
  brainPointsReward,
  currentScore,
  className,
}) => {
  const { t } = useLanguage();
  const { sparklineScores, trend: visualTrend, hasSparkline } = useSparklineTrend(currentScore);

  // Check if we have coin/brain rewards to show
  const hasCoinReward = coinReward && coinReward.awarded > 0;
  const isTeasing = coinRewardMode === 'teasing';
  const hasBrainReward = brainPointsReward && brainPointsReward.scoreDelta !== 0;

  return (
    <div className={cn(
      'bg-neo-navy border-3 border-neo-black rounded-neo p-3 sm:p-4 shadow-hard space-y-3',
      className
    )}>
      {/* Row 1: Core Stats + Rewards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Words */}
        <div className="bg-white/10 rounded-neo border-2 border-white/20 p-2 sm:p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-neo bg-neo-lime text-neo-black flex items-center justify-center border border-neo-black">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white">{wordCount}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-white/60 font-bold uppercase">
            {t('results.words') || 'Words'}
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white/10 rounded-neo border-2 border-white/20 p-2 sm:p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-neo bg-neo-pink text-neo-white flex items-center justify-center border border-neo-black">
              <Target className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white">{accuracy}%</span>
          </div>
          <div className="text-[10px] sm:text-xs text-white/60 font-bold uppercase">
            {t('results.accuracy') || 'Accuracy'}
          </div>
        </div>

        {/* Coins - earned mode */}
        {hasCoinReward && !isTeasing && (
          <div className="bg-neo-lime/20 rounded-neo border-2 border-neo-lime/40 p-2 sm:p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Coins className="w-5 h-5 text-neo-lime" />
              <span className="text-xl sm:text-2xl font-black text-neo-lime">+{coinReward.awarded}</span>
            </div>
            <div className="text-[10px] sm:text-xs text-neo-lime/70 font-bold uppercase">
              {t('reveal.coins') || 'Coins'}
            </div>
          </div>
        )}

        {/* Coins - teasing mode for guests */}
        {hasCoinReward && isTeasing && (
          <div className="bg-slate-600/30 rounded-neo border-2 border-slate-500/50 p-2 sm:p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Lock className="w-4 h-4 text-amber-400/70" />
              <Coins className="w-5 h-5 text-amber-400/50" />
              <span className="text-xl sm:text-2xl font-black text-amber-400/70">+{coinReward.awarded}</span>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-bold">
              {t('coins.signInShort') || 'Sign in'}
            </div>
          </div>
        )}

        {/* Brain Points */}
        {hasBrainReward && (
          <div className={cn(
            'rounded-neo border-2 p-2 sm:p-3 text-center',
            brainPointsReward.scoreDelta > 0
              ? 'bg-neo-purple/20 border-neo-purple/40'
              : 'bg-neo-red/20 border-neo-red/40'
          )}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Brain className={cn(
                'w-5 h-5',
                brainPointsReward.scoreDelta > 0 ? 'text-neo-purple' : 'text-neo-red'
              )} />
              <span className={cn(
                'text-xl sm:text-2xl font-black',
                brainPointsReward.scoreDelta > 0 ? 'text-neo-purple' : 'text-neo-red'
              )}>
                {brainPointsReward.scoreDelta > 0 ? '+' : ''}{brainPointsReward.scoreDelta}
              </span>
            </div>
            <div className={cn(
              'text-[10px] sm:text-xs font-bold uppercase',
              brainPointsReward.scoreDelta > 0 ? 'text-neo-purple/70' : 'text-neo-red/70'
            )}>
              {t('brain.points') || 'Brain'}
            </div>
          </div>
        )}

        {/* Empty placeholders to maintain grid when fewer items */}
        {!hasCoinReward && !hasBrainReward && (
          <>
            <div className="hidden sm:block" />
            <div className="hidden sm:block" />
          </>
        )}
        {hasCoinReward && !hasBrainReward && (
          <div className="hidden sm:block" />
        )}
        {!hasCoinReward && hasBrainReward && (
          <div className="hidden sm:block" />
        )}
      </div>

      {/* Row 2: Sparkline + Archetype (only if we have either) */}
      {(hasSparkline || archetype) && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
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
                    visualTrend.direction === 'stable' && 'text-white/60'
                  )}>
                    {visualTrend.direction === 'up' && (t('chart.improving') || 'Improving')}
                    {visualTrend.direction === 'down' && (t('chart.declining') || 'Declining')}
                    {visualTrend.direction === 'stable' && (t('chart.stable') || 'Stable')}
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
        </div>
      )}

      {/* Row 3: Achievement badges (if any) */}
      {achievements && achievements.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/10">
          <Award className="w-4 h-4 text-neo-lime flex-shrink-0" />
          {achievements.slice(0, MAX_VISIBLE_ACHIEVEMENTS).map((ach, i) => (
            <AchievementBadge key={ach.key || ach.name || `ach-${i}`} achievement={ach} index={i} />
          ))}
          {achievements.length > MAX_VISIBLE_ACHIEVEMENTS && (
            <span className="text-xs font-bold text-white/60 px-1.5 py-0.5 bg-white/10 rounded-neo border border-white/20">
              +{achievements.length - MAX_VISIBLE_ACHIEVEMENTS}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

CompactResultsStats.displayName = 'CompactResultsStats';

export default CompactResultsStats;
