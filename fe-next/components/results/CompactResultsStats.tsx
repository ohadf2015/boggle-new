'use client';

import React, { memo, useEffect, useState, useMemo } from 'react';
import { Coins, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import PlayerArchetypeBadge from './PlayerArchetypeBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import { getChartData, calculateTrend, type GameHistoryEntry, type PerformanceTrend } from '@/utils/gameHistoryManager';
import type { CoinReward } from './CoinRewardDisplay';
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
 * CompactResultsStats - Shared stats row for results pages
 *
 * Used in both SinglePlayerResults and ResultsPage (multiplayer)
 * Shows: Words | Accuracy | Coins | Brain Points | Mini Sparkline | Archetype badge
 *
 * Designed to sit below ResultsWinnerBanner, which shows rank and score.
 */
const CompactResultsStats: React.FC<CompactResultsStatsProps> = memo(({
  wordCount,
  accuracy,
  archetype,
  coinReward,
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
  const hasBrainReward = brainPointsReward && brainPointsReward.scoreDelta !== 0;
  const hasSparkline = isClient && sparklineScores.length >= 2;

  return (
    <div className={cn(
      'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-3 border-neo-black rounded-neo p-3 shadow-hard',
      className
    )}>
      <div className="flex items-center justify-between gap-2">
        {/* Stats Grid - Core metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Words */}
          <div className="text-center min-w-[40px]">
            <div className="text-xl font-black text-white">
              {wordCount}
            </div>
            <div className="text-[10px] text-white/60 font-bold uppercase">
              {t('results.words') || 'Words'}
            </div>
          </div>

          {/* Accuracy */}
          <div className="text-center min-w-[40px]">
            <div className="text-xl font-black text-white">
              {accuracy}%
            </div>
            <div className="text-[10px] text-white/60 font-bold uppercase">
              {t('results.accuracy') || 'Accuracy'}
            </div>
          </div>

          {/* Separator before rewards */}
          {(hasCoinReward || hasBrainReward) && (
            <div className="w-px h-6 bg-white/15 mx-0.5" />
          )}

          {/* Coins - Inline */}
          {hasCoinReward && (
            <div className="text-center min-w-[40px]">
              <div className="flex items-center justify-center gap-1">
                <Coins className="w-4 h-4 text-neo-yellow" />
                <span className="text-xl font-black text-neo-yellow">+{coinReward.awarded}</span>
              </div>
              <div className="text-[10px] text-white/60 font-bold uppercase">
                {t('reveal.coins') || 'Coins'}
              </div>
            </div>
          )}

          {/* Brain Points - Inline */}
          {hasBrainReward && (
            <div className="text-center min-w-[40px]">
              <div className="flex items-center justify-center gap-1">
                <Brain className={cn(
                  'w-4 h-4',
                  brainPointsReward.scoreDelta > 0 ? 'text-neo-purple' : 'text-neo-red'
                )} />
                <span className={cn(
                  'text-xl font-black',
                  brainPointsReward.scoreDelta > 0 ? 'text-neo-purple' : 'text-neo-red'
                )}>
                  {brainPointsReward.scoreDelta > 0 ? '+' : ''}{brainPointsReward.scoreDelta}
                </span>
              </div>
              <div className="text-[10px] text-white/60 font-bold uppercase">
                {t('brain.points') || 'Brain'}
              </div>
            </div>
          )}
        </div>

        {/* Separator + Right side: Sparkline + Archetype */}
        <div className="flex items-center gap-2">
          {/* Vertical separator when there's content on both sides */}
          {(hasSparkline || archetype) && (
            <div className="w-px h-8 bg-white/20 mx-1" />
          )}

          {/* Mini Sparkline */}
          {hasSparkline && (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <MiniSparkline
                  data={sparklineScores}
                  currentScore={currentScore}
                  trend={trend}
                />
                {trend && (
                  <div className={cn(
                    'w-4 h-4',
                    trend.direction === 'up' && 'text-neo-lime',
                    trend.direction === 'down' && 'text-neo-red',
                    trend.direction === 'stable' && 'text-neo-cyan'
                  )}>
                    {trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
                    {trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
                    {trend.direction === 'stable' && <Minus className="w-4 h-4" />}
                  </div>
                )}
              </div>
              <div className="text-[8px] text-white/40 font-bold uppercase">
                {t('chart.trend') || 'Trend'}
              </div>
            </div>
          )}

          {/* Archetype Badge */}
          {archetype && (
            <PlayerArchetypeBadge archetype={archetype} size="sm" showTooltip={true} />
          )}
        </div>
      </div>
    </div>
  );
});

CompactResultsStats.displayName = 'CompactResultsStats';

export default CompactResultsStats;
