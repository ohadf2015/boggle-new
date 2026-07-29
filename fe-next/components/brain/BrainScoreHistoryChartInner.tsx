'use client';

import { useMemo, useState, useEffect } from 'react';
import { m } from 'framer-motion';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Brain, Calendar, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { useContainerDimensions } from '@/hooks/useContainerDimensions';
import type { BrainScoreHistory } from '@/shared/types/cognitive';

interface BrainScoreHistoryChartProps {
  history: BrainScoreHistory[];
  className?: string;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  score: number;
  gamesPlayed: number;
  drillsCompleted: number;
}

// Custom tooltip
const CustomTooltip = ({
  active,
  payload,
  t,
  isDarkMode,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isDarkMode: boolean;
}) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;

  return (
    <div className={cn(
      'border-3 border-neo-black rounded-neo p-3 shadow-hard min-w-[140px]',
      isDarkMode ? 'bg-neo-navy-light text-white' : 'bg-neo-cream text-neo-black'
    )}>
      <div className="font-black text-xl mb-1.5">
        {data.score} <span className="text-base">{t('brain.score')}</span>
      </div>
      <div className="text-xs font-bold space-y-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          <span>{data.displayDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-neo-cyan" />
          <span>{data.gamesPlayed} {t('brain.gamesPlayed')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-neo-purple" />
          <span>{data.drillsCompleted} {t('brain.drillsCompleted')}</span>
        </div>
      </div>
    </div>
  );
};

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
 * BrainScoreHistoryChart - Shows brain score progression over time
 * Displays daily brain score snapshots in a line/area chart
 */
export default function BrainScoreHistoryChart({ history, className }: BrainScoreHistoryChartProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isMounted, setIsMounted] = useState(false);

  // Prevent SSR/hydration issues - only render chart on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track container dimensions to prevent Recharts rendering with invalid size
  const { containerRef, dimensions, isReady } = useContainerDimensions();

  // Transform history data for chart
  const chartData: ChartDataPoint[] = useMemo(() => {
    return history.map(entry => ({
      date: entry.periodStart,
      displayDate: new Date(entry.periodStart).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      score: entry.overallScore,
      gamesPlayed: entry.gamesPlayed,
      drillsCompleted: entry.drillsCompleted,
    }));
  }, [history]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: 'stable' as const, change: 0 };

    const firstScore = chartData[0]?.score ?? 0;
    const lastScore = chartData[chartData.length - 1]?.score ?? 0;
    const change = lastScore - firstScore;

    if (change > 5) return { direction: 'up' as const, change };
    if (change < -5) return { direction: 'down' as const, change };
    return { direction: 'stable' as const, change };
  }, [chartData]);

  // Calculate chart bounds
  const { minScore, maxScore } = useMemo(() => {
    if (chartData.length === 0) {
      return { minScore: 0, maxScore: 100 };
    }
    const scores = chartData.map(d => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    return {
      minScore: Math.max(0, min - 10),
      maxScore: Math.min(100, max + 10),
    };
  }, [chartData]);

  // Not enough data - show empty state
  if (chartData.length < 2) {
    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'rounded-neo border-4 border-neo-black shadow-hard-lg overflow-hidden',
          isDarkMode
            ? 'bg-neo-navy'
            : 'bg-linear-to-br from-white via-gray-50 to-white',
          className
        )}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar className={cn('w-5 h-5', isDarkMode ? 'text-neo-cyan' : 'text-purple-600')} />
            <h3 className={cn(
              'text-sm font-black uppercase tracking-wide',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              {t('brain.progressHistory')}
            </h3>
          </div>

          {/* Empty state */}
          <div className="relative h-32 flex flex-col items-center justify-center">
            <m.div
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-4xl mb-2"
            >
              📈
            </m.div>
            <h4 className={cn(
              'font-black uppercase text-sm mb-1',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              {t('brain.startTracking')}
            </h4>
            <p className={cn(
              'text-xs px-4 text-center',
              isDarkMode ? 'text-white' : 'text-neo-black/60'
            )}>
              {t('brain.historyEmptyDesc')}
            </p>
          </div>
        </div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'rounded-neo border-4 border-neo-black shadow-hard-lg overflow-hidden',
        isDarkMode
          ? 'bg-neo-navy'
          : 'bg-linear-to-br from-white via-gray-50 to-white',
        className
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className={cn('w-5 h-5', isDarkMode ? 'text-neo-cyan' : 'text-purple-600')} />
            <h3 className={cn(
              'text-sm font-black uppercase tracking-wide',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              {t('brain.progressHistory')}
            </h3>
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1.5 rounded-neo px-2 py-1 border',
              isDarkMode ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10'
            )}>
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
                {trend.change} pts
              </span>
            </div>
          )}
        </div>

        {/* Chart - only render ResponsiveContainer when dimensions are valid AND mounted */}
        <div ref={containerRef} className="w-full h-48 min-h-48 min-w-[100px]" style={{ minHeight: '12rem', minWidth: 100 }}>
          {isMounted && isReady && dimensions && dimensions.width > 0 && dimensions.height > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100} debounce={50}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="brainScoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FFFF" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#FF1493" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="brainLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00FFFF" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#FF1493" />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="displayDate"
                tick={{
                  fill: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  fontSize: 10,
                  fontWeight: 'bold'
                }}
                axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}
                tickLine={false}
              />
              <YAxis
                domain={[minScore, maxScore]}
                tick={{
                  fill: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  fontSize: 10,
                  fontWeight: 'bold'
                }}
                axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}
                tickLine={false}
                width={35}
              />
              <Tooltip
                content={<CustomTooltip t={t} isDarkMode={isDarkMode} />}
                cursor={{
                  stroke: 'var(--neo-cyan)',
                  strokeWidth: 2,
                  strokeDasharray: '4 4'
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="url(#brainLineGradient)"
                strokeWidth={3}
                fill="url(#brainScoreGradient)"
                dot={{
                  r: 4,
                  fill: '#00FFFF',
                  stroke: isDarkMode ? '#fff' : '#000',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 8,
                  fill: '#FF1493',
                  stroke: isDarkMode ? '#fff' : '#000',
                  strokeWidth: 3,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className={cn(
                'text-sm font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
              )}>
                {t('common.loading')}
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className={cn(
            'rounded-neo border p-2 text-center',
            isDarkMode ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10'
          )}>
            <div className={cn('text-lg font-black', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {chartData.length}
            </div>
            <div className={cn(
              'text-[9px] font-bold uppercase',
              isDarkMode ? 'text-white' : 'text-neo-black/60'
            )}>
              {t('brain.daysTracked')}
            </div>
          </div>
          <div className={cn(
            'rounded-neo border p-2 text-center',
            isDarkMode ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10'
          )}>
            <div className={cn('text-lg font-black', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {chartData[chartData.length - 1]?.score ?? 0}
            </div>
            <div className={cn(
              'text-[9px] font-bold uppercase',
              isDarkMode ? 'text-white' : 'text-neo-black/60'
            )}>
              {t('brain.currentScore')}
            </div>
          </div>
          <div className={cn(
            'rounded-neo border p-2 text-center',
            isDarkMode ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10'
          )}>
            <div className={cn('text-lg font-black', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {Math.max(...chartData.map(d => d.score))}
            </div>
            <div className={cn(
              'text-[9px] font-bold uppercase',
              isDarkMode ? 'text-white' : 'text-neo-black/60'
            )}>
              {t('brain.peakScore')}
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
}
