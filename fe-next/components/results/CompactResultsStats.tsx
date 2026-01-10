'use client';

import React, { memo, useEffect, useState, useMemo } from 'react';
import { Coins, Brain, TrendingUp, TrendingDown, Minus, Hash, Target, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import PlayerArchetypeBadge from './PlayerArchetypeBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import { getChartData, calculateTrend, type GameHistoryEntry, type PerformanceTrend } from '@/utils/gameHistoryManager';
import type { CoinReward, CoinRewardMode } from './CoinRewardDisplay';
import type { BrainPointsReward } from './BrainPointsDisplay';

interface CompactResultsStatsProps {
  /** Number of valid words found */
  wordCount: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Optional player archetype to display */
  archetype?: PlayerArchetype | null;
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
 * MiniSparkline - Tiny SVG sparkline for performance history
 * Shows last few game scores as a simple line chart
 */
const MiniSparkline: React.FC<{
  data: number[];
  currentScore?: number;
  trend?: PerformanceTrend | null;
  width?: number;
  height?: number;
}> = memo(({ data, currentScore, trend, width = 60, height = 28 }) => {
  if (data.length < 2) return null;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minVal = Math.min(...data) * 0.9;
  const maxVal = Math.max(...data) * 1.1;
  const range = maxVal - minVal || 1;

  // Create points for the polyline
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  // Last point for the highlight dot
  const lastX = padding + chartWidth;
  const lastY = padding + chartHeight - ((data[data.length - 1] - minVal) / range) * chartHeight;

  // Determine line color based on trend
  const strokeColor = trend?.direction === 'up' ? '#a3e635' : // neo-lime
                      trend?.direction === 'down' ? '#f87171' : // neo-red
                      '#22d3ee'; // neo-cyan

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Background line (subtle) */}
      <polyline
        points={points}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main line */}
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current game dot */}
      <circle
        cx={lastX}
        cy={lastY}
        r="3"
        fill={strokeColor}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
});

MiniSparkline.displayName = 'MiniSparkline';

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
  coinReward,
  coinRewardMode = 'earned',
  brainPointsReward,
  currentScore,
  className,
}) => {
  const { t } = useLanguage();
  const [chartData, setChartData] = useState<GameHistoryEntry[]>([]);
  const [trend, setTrend] = useState<PerformanceTrend | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Load chart data on client side
  useEffect(() => {
    setIsClient(true);
    const data = getChartData(8); // Get last 8 games for sparkline
    setChartData(data);
    setTrend(calculateTrend());
  }, []);

  // Extract scores for sparkline
  const sparklineScores = useMemo(() => {
    return chartData.map(d => d.score);
  }, [chartData]);

  // Check if we have coin/brain rewards to show
  const hasCoinReward = coinReward && coinReward.awarded > 0;
  const isTeasing = coinRewardMode === 'teasing';
  const hasBrainReward = brainPointsReward && brainPointsReward.scoreDelta !== 0;
  const hasSparkline = isClient && sparklineScores.length >= 2;

  return (
    <div className={cn(
      'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-3 border-neo-black rounded-neo p-3 sm:p-4 shadow-hard space-y-3',
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
          <div className="bg-neo-yellow/20 rounded-neo border-2 border-neo-yellow/40 p-2 sm:p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Coins className="w-5 h-5 text-neo-yellow" />
              <span className="text-xl sm:text-2xl font-black text-neo-yellow">+{coinReward.awarded}</span>
            </div>
            <div className="text-[10px] sm:text-xs text-neo-yellow/70 font-bold uppercase">
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
                currentScore={currentScore}
                trend={trend}
                width={70}
                height={32}
              />
              {trend && (
                <div className="flex items-center gap-1">
                  <div className={cn(
                    'w-5 h-5',
                    trend.direction === 'up' && 'text-neo-lime',
                    trend.direction === 'down' && 'text-neo-red',
                    trend.direction === 'stable' && 'text-neo-cyan'
                  )}>
                    {trend.direction === 'up' && <TrendingUp className="w-5 h-5" />}
                    {trend.direction === 'down' && <TrendingDown className="w-5 h-5" />}
                    {trend.direction === 'stable' && <Minus className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    'text-xs font-bold',
                    trend.direction === 'up' && 'text-neo-lime',
                    trend.direction === 'down' && 'text-neo-red',
                    trend.direction === 'stable' && 'text-white/60'
                  )}>
                    {trend.direction === 'up' && (t('chart.improving') || 'Improving')}
                    {trend.direction === 'down' && (t('chart.declining') || 'Declining')}
                    {trend.direction === 'stable' && (t('chart.stable') || 'Stable')}
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
    </div>
  );
});

CompactResultsStats.displayName = 'CompactResultsStats';

export default CompactResultsStats;
