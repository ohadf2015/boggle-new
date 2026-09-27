'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { m } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Trophy, Flame, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NeoPanel } from '@/components/ui/panel';
import {
  getChartData,
  calculateTrend,
  getTrendMessage,
  type GameHistoryEntry,
  type PerformanceTrend,
} from '@/utils/gameHistoryManager';

/**
 * Hook to track container dimensions and only render when valid
 * Prevents Recharts "width(-1) and height(-1)" warning
 *
 * Enhanced with:
 * - Client-side hydration check to avoid SSR/hydration dimension mismatches
 * - Delayed initial measurement to allow layout to stabilize
 * - Multiple measurement attempts for mobile browsers with slow layout
 */
function useContainerDimensions() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Hydration safety: only run dimension checks on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Skip dimension checks during SSR/hydration
    if (!isClient) return;

    const checkDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Only mark as ready if dimensions are valid (>= 100 for minimum usable chart)
        if (clientWidth >= 100 && clientHeight >= 100) {
          setDimensions({ width: clientWidth, height: clientHeight });
        } else {
          // Reset if dimensions become too small
          setDimensions(null);
        }
      }
    };

    // Delay initial check to allow layout to settle after animations
    // This is especially important for mobile Chrome where layout can be slow
    const initialDelay = setTimeout(checkDimensions, 50);

    // Also check on next frame in case of layout shift
    const frameId = requestAnimationFrame(() => {
      // Additional frame delay for animation completion
      requestAnimationFrame(checkDimensions);
    });

    // Set up resize observer for dynamic changes
    const observer = new ResizeObserver(checkDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Add polling as fallback for edge cases (reduced frequency)
    const pollInterval = setInterval(checkDimensions, 250);

    return () => {
      clearTimeout(initialDelay);
      cancelAnimationFrame(frameId);
      observer.disconnect();
      clearInterval(pollInterval);
    };
  }, [isClient]);

  return { containerRef, dimensions, isReady: isClient && dimensions !== null };
}

export interface PerformanceChartProps {
  /** Current game score to highlight */
  currentScore?: number;
  /** Number of games to display */
  gamesLimit?: number;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Class name for container */
  className?: string;
}

// Fun labels for score milestones on the chart
const MILESTONE_LABELS: { score: number; label: string; emoji: string }[] = [
  { score: 200, label: 'Word Wizard', emoji: '🧙' },
  { score: 150, label: 'On Fire!', emoji: '🔥' },
  { score: 100, label: 'Nice!', emoji: '⭐' },
  { score: 50, label: 'Warming Up', emoji: '☕' },
];

// Custom dot component to show special markers
const CustomDot = (props: {
  cx?: number;
  cy?: number;
  payload?: GameHistoryEntry;
  isCurrentGame?: boolean;
  bestScore?: number;
}) => {
  const { cx, cy, payload, isCurrentGame, bestScore } = props;
  if (!cx || !cy || !payload) return null;

  const isBestScore = payload.score === bestScore && bestScore > 0;
  const isWin = payload.isWinner;

  // Current game highlight
  if (isCurrentGame) {
    return (
      <g>
        {/* Pulse animation circle */}
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill="var(--neo-lime)"
          opacity={0.3}
          className="animate-ping"
        />
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="var(--neo-lime)"
          stroke="rgb(var(--neo-black))"
          strokeWidth={3}
        />
        <text
          x={cx}
          y={cy - 16}
          textAnchor="middle"
          fill="var(--neo-lime)"
          className="text-xs font-black"
        >
          NOW
        </text>
      </g>
    );
  }

  // Best score marker
  if (isBestScore) {
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="var(--neo-cyan)"
          stroke="rgb(var(--neo-black))"
          strokeWidth={2}
        />
        <text x={cx} y={cy + 4} textAnchor="middle" className="text-[8px]">
          👑
        </text>
      </g>
    );
  }

  // Win marker
  if (isWin) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="var(--neo-lime)"
        stroke="rgb(var(--neo-black))"
        strokeWidth={2}
      />
    );
  }

  // Regular dot
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--neo-pink)"
      stroke="rgb(var(--neo-black))"
      strokeWidth={2}
    />
  );
};

// Helper to get game mode label and icon
function getGameModeInfo(
  mode: 'single' | 'multiplayer' | 'daily',
  t: (key: string, params?: Record<string, string | number>) => string
): { label: string; icon: string } {
  switch (mode) {
    case 'single':
      return { label: t('home.singlePlayer'), icon: '🎮' };
    case 'multiplayer':
      return { label: t('home.multiplayer'), icon: '👥' };
    case 'daily':
      return { label: t('daily.title'), icon: '📅' };
    default:
      return { label: mode, icon: '🎲' };
  }
}

// Custom tooltip
const CustomTooltip = ({
  active,
  payload,
  t,
}: {
  active?: boolean;
  payload?: Array<{ payload: GameHistoryEntry }>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const timeAgo = getTimeAgo(data.timestamp, t);
  const modeInfo = getGameModeInfo(data.mode, t);

  return (
    <NeoPanel tone="cream" className="text-neo-black min-w-[140px] p-3">
      <div className="font-black text-xl mb-1.5">{data.score} <span className="text-base">{t('scorePage.pts')}</span></div>
      <div className="text-xs font-bold space-y-1">
        <div className="flex items-center gap-1.5">
          <span>{modeInfo.icon}</span>
          <span>{modeInfo.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>📝</span>
          <span>{data.wordCount} {t('results.words')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🎯</span>
          <span>{data.accuracy}% {t('results.accuracy')}</span>
        </div>
        {data.isWinner && (
          <div className="flex items-center gap-1.5 text-neo-lime font-black">
            <span>🏆</span>
            <span>{t('results.winner')}</span>
          </div>
        )}
        <div className="text-neo-black/50 mt-1.5 pt-1.5 border-t border-neo-black/10 text-[10px]">{timeAgo}</div>
      </div>
    </NeoPanel>
  );
};

// Helper to get time ago string
function getTimeAgo(
  timestamp: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('chart.timeAgo.justNow');
  if (minutes < 60) return t('chart.timeAgo.minutesAgo', { count: minutes }) || `${minutes}m ago`;
  if (hours < 24) return t('chart.timeAgo.hoursAgo', { count: hours }) || `${hours}h ago`;
  if (days === 1) return t('chart.timeAgo.yesterday');
  return t('chart.timeAgo.daysAgo', { count: days }) || `${days}d ago`;
}

// Trend icon component
const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'stable' }) => {
  if (direction === 'up') {
    return <TrendingUp className="w-5 h-5 text-neo-lime" />;
  }
  if (direction === 'down') {
    return <TrendingDown className="w-5 h-5 text-neo-red" />;
  }
  return <Minus className="w-5 h-5 text-neo-cyan" />;
};

/**
 * PerformanceChart - Neo-Brutalist line chart showing player improvement
 * Shows score progression across recent games with fun milestone markers
 */
const PerformanceChart: React.FC<PerformanceChartProps> = ({
  currentScore,
  gamesLimit = 10,
  compact = false,
  className,
}) => {
  const { t } = useLanguage();
  const [chartData, setChartData] = useState<GameHistoryEntry[]>([]);
  const [trend, setTrend] = useState<PerformanceTrend | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Track container dimensions to prevent Recharts rendering with invalid size
  const { containerRef, dimensions, isReady } = useContainerDimensions();

  // Load data on client side only (localStorage)
  useEffect(() => {
    setIsClient(true);
    const data = getChartData(gamesLimit);
    setChartData(data);
    setTrend(calculateTrend());
  }, [gamesLimit]);

  // Calculate chart bounds and best score
  const { minScore, maxScore, bestScore } = useMemo(() => {
    if (chartData.length === 0) {
      return { minScore: 0, maxScore: 100, bestScore: 0 };
    }
    const scores = chartData.map(d => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    // Add padding for milestones
    return {
      minScore: Math.max(0, min - 20),
      maxScore: max + 20,
      bestScore: max,
    };
  }, [chartData]);

  // Find applicable milestone lines
  const milestoneLines = useMemo(() => {
    return MILESTONE_LABELS.filter(m => m.score >= minScore && m.score <= maxScore + 30);
  }, [minScore, maxScore]);

  // Don't render until client-side
  if (!isClient) {
    return null;
  }

  // Not enough data - show engaging empty state with chart preview
  if (chartData.length < 2) {
    const gamesPlayed = chartData.length;
    const gamesNeeded = 2 - gamesPlayed;

    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'bg-neo-navy',
          'border-4 border-neo-black rounded-neo-lg shadow-hard-lg overflow-hidden',
          '-rotate-[0.5deg]',
          className
        )}
      >
        {/* Halftone texture overlay - matching the main chart */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-size-[8px_8px]"
        />

        <div className="relative z-10 p-4">
          {/* Header - matching the chart header style */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-neo-cyan" />
              <h3 className="text-sm font-black uppercase tracking-wide text-white">
                {t('chart.yourProgress')}
              </h3>
            </div>
            {/* Progress badge */}
            <div className="flex items-center gap-1.5 bg-neo-lime/20 rounded-neo px-2 py-1 border border-neo-lime/40">
              <span className="text-xs font-black text-neo-lime">
                {gamesPlayed}/2
              </span>
            </div>
          </div>

          {/* Preview chart area with blurred placeholder */}
          <div className="relative h-32 mb-4 overflow-hidden rounded-neo">
            {/* Fake chart lines - blurred preview */}
            <div className="absolute inset-0 flex items-end justify-around px-4 pb-4 opacity-30 blur-[2px]">
              <div className="w-2 bg-linear-to-t from-neo-pink to-neo-cyan rounded-t h-[40%]" />
              <div className="w-2 bg-linear-to-t from-neo-pink to-neo-cyan rounded-t h-[55%]" />
              <div className="w-2 bg-linear-to-t from-neo-pink to-neo-cyan rounded-t h-[45%]" />
              <div className="w-2 bg-linear-to-t from-neo-pink to-neo-cyan rounded-t h-[70%]" />
              <div className="w-2 bg-linear-to-t from-neo-pink to-neo-cyan rounded-t h-[60%]" />
              <div className="w-2 bg-linear-to-t from-neo-pink to-neo-lime rounded-t h-[85%]" />
            </div>

            {/* Overlay with message */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neo-navy/60 text-white">
              <m.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-4xl mb-2"
              >
                📊
              </m.div>
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h4 className="font-black text-white uppercase text-sm mb-1">
                  {gamesNeeded === 1
                    ? (t('chart.oneMoreGame'))
                    : (t('chart.needMoreGames'))}
                </h4>
                <p className="text-white text-xs px-4">
                  {t('chart.needMoreGamesDesc')}
                </p>
              </m.div>
            </div>
          </div>

          {/* Motivational stats placeholders */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-neo border border-white/10 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-5 h-5 rounded bg-neo-lime/30 border border-neo-lime/50 flex items-center justify-center">
                  <Flame className="w-3 h-3 text-neo-lime/70" />
                </div>
              </div>
              <div className="text-lg font-black text-slate-400">--</div>
              <div className="text-[9px] font-bold uppercase text-slate-300">
                {t('chart.bestScore')}
              </div>
            </div>
            <div className="bg-white/5 rounded-neo border border-white/10 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-5 h-5 rounded bg-neo-cyan/30 border border-neo-cyan/50 flex items-center justify-center">
                  <Target className="w-3 h-3 text-neo-cyan/70" />
                </div>
              </div>
              <div className="text-lg font-black text-slate-400">--</div>
              <div className="text-[9px] font-bold uppercase text-slate-300">
                {t('chart.average')}
              </div>
            </div>
            <div className="bg-white/5 rounded-neo border border-white/10 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-5 h-5 rounded bg-neo-lime/30 border border-neo-lime/50 flex items-center justify-center">
                  <Trophy className="w-3 h-3 text-neo-lime/70" />
                </div>
              </div>
              <div className="text-lg font-black text-slate-400">{gamesPlayed}</div>
              <div className="text-[9px] font-bold uppercase text-slate-300">
                {t('chart.games')}
              </div>
            </div>
          </div>
        </div>
      </m.div>
    );
  }

  const trendMessage = trend ? getTrendMessage(trend) : '';

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'bg-neo-navy',
        'border-4 border-neo-black rounded-neo-lg shadow-hard-lg overflow-hidden',
        '-rotate-[0.5deg]',
        className
      )}
    >
      {/* Halftone texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-size-[8px_8px]"
      />

      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-neo-cyan" />
            <h3 className="text-sm font-black uppercase tracking-wide text-white">
              {t('chart.yourProgress')}
            </h3>
          </div>
          {trend && (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-neo px-2 py-1 border border-white/20">
              <TrendIcon direction={trend.direction} />
              <span
                className={cn(
                  'text-xs font-black',
                  trend.direction === 'up' && 'text-neo-lime',
                  trend.direction === 'down' && 'text-neo-red',
                  trend.direction === 'stable' && 'text-neo-cyan'
                )}
              >
                {trend.direction === 'up' && '+'}
                {trend.percentChange}%
              </span>
            </div>
          )}
        </div>

        {/* Trend Message */}
        {trendMessage && !compact && (
          <m.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-3 px-3 py-2 bg-neo-cyan/20 border border-neo-cyan/40 rounded-neo"
          >
            <span className="text-xs font-bold text-neo-cyan">{trendMessage}</span>
          </m.div>
        )}

        {/* Chart - only render ResponsiveContainer when dimensions are valid */}
        <div ref={containerRef} className={cn('w-full min-w-[100px]', compact ? 'h-32 min-h-32' : 'h-48 min-h-48')}>
          {isReady && dimensions ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
              {/* Grid lines */}
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--neo-pink)" />
                  <stop offset="50%" stopColor="var(--neo-cyan)" />
                  <stop offset="100%" stopColor="var(--neo-lime)" />
                </linearGradient>
              </defs>

              {/* Milestone reference lines */}
              {milestoneLines.map(milestone => (
                <ReferenceLine
                  key={milestone.score}
                  y={milestone.score}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 4"
                  label={{
                    value: `${milestone.emoji} ${milestone.label}`,
                    position: 'right',
                    fill: 'rgba(255,255,255,0.5)',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
              ))}

              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => {
                  const idx = chartData.findIndex(d => d.timestamp === ts);
                  return `#${idx + 1}`;
                }}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                tickLine={false}
              />
              <YAxis
                domain={[minScore, maxScore]}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                tickLine={false}
                width={35}
              />
              <Tooltip
                content={<CustomTooltip t={t} />}
                cursor={{ stroke: 'var(--neo-cyan)', strokeWidth: 2, strokeDasharray: '4 4' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="url(#lineGradient)"
                strokeWidth={4}
                dot={(props) => (
                  <CustomDot
                    {...props}
                    isCurrentGame={
                      currentScore !== undefined &&
                      props.payload?.score === currentScore &&
                      props.index === chartData.length - 1
                    }
                    bestScore={bestScore}
                  />
                )}
                activeDot={{
                  r: 8,
                  fill: 'var(--neo-lime)',
                  stroke: 'rgb(var(--neo-black))',
                  strokeWidth: 3,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm font-bold text-slate-300">
                {t('common.loading')}
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        {!compact && trend && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-5 h-5 rounded bg-neo-lime border border-neo-black flex items-center justify-center text-neo-black">
                  <Flame className="w-3 h-3" />
                </div>
              </div>
              <div className="text-lg font-black text-white">{trend.bestScore}</div>
              <div className="text-[9px] font-bold uppercase text-white">
                {t('chart.bestScore')}
              </div>
            </div>
            <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-5 h-5 rounded bg-neo-cyan border border-neo-black flex items-center justify-center text-neo-black">
                  <Target className="w-3 h-3" />
                </div>
              </div>
              <div className="text-lg font-black text-white">{trend.averageScore}</div>
              <div className="text-[9px] font-bold uppercase text-white">
                {t('chart.average')}
              </div>
            </div>
            <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-5 h-5 rounded bg-neo-lime border border-neo-black flex items-center justify-center text-neo-black">
                  <Trophy className="w-3 h-3" />
                </div>
              </div>
              <div className="text-lg font-black text-white">{trend.totalGames}</div>
              <div className="text-[9px] font-bold uppercase text-white">
                {t('chart.games')}
              </div>
            </div>
          </div>
        )}
      </div>
    </m.div>
  );
};

export default PerformanceChart;
