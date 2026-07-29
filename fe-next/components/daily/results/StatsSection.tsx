/**
 * StatsSection Component
 * Game-stats dashboard with animated count-up numbers, staggered histogram bars,
 * and interactive stat cards. Feels like a post-match screen from a competitive game.
 */

'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { Users, Target, TrendingUp, Heart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import type { WordHuntStats } from './types';
import type { WordHuntResult } from '@/utils/dailyChallenge';

export interface StatsSectionProps {
  stats: WordHuntStats;
  result: WordHuntResult;
  t: (key: string) => string;
}

/** Animated number that counts up from 0 */
const AnimatedStat: React.FC<{
  value: number;
  suffix?: string;
  delay?: number;
  decimals?: number;
  className?: string;
}> = ({ value, suffix = '', delay = 0, decimals = 0, className }) => {
  const { prefersReducedMotion, isLowEnd } = useDevicePerformance();
  const displayTarget = decimals > 0 ? Math.round(value * Math.pow(10, decimals)) : value;
  const animated = useCountUp({
    target: displayTarget,
    duration: 1200,
    startDelay: delay,
    immediate: prefersReducedMotion || isLowEnd,
  });
  const display = decimals > 0
    ? (animated / Math.pow(10, decimals)).toFixed(decimals)
    : String(animated);

  return (
    <m.span
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 300, damping: 25 }}
    >
      {display}{suffix}
    </m.span>
  );
};

/** Histogram bar colors based on attempt number */
function getBarColor(attemptNum: number): string {
  if (attemptNum <= 2) return 'from-emerald-400 to-emerald-500';
  if (attemptNum <= 4) return 'from-neo-cyan to-cyan-500';
  if (attemptNum <= 6) return 'from-neo-yellow to-amber-400';
  if (attemptNum <= 8) return 'from-neo-orange to-orange-500';
  return 'from-neo-pink to-rose-500';
}

function getBarGlow(attemptNum: number): string {
  if (attemptNum <= 2) return 'shadow-[0_0_12px_rgba(16,185,129,0.3)]';
  if (attemptNum <= 4) return 'shadow-[0_0_12px_rgba(0,255,255,0.3)]';
  if (attemptNum <= 6) return 'shadow-[0_0_12px_rgba(255,225,53,0.3)]';
  if (attemptNum <= 8) return 'shadow-[0_0_12px_rgba(255,107,53,0.3)]';
  return 'shadow-[0_0_12px_rgba(255,20,147,0.3)]';
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  stats,
  result,
  t,
}) => {
  const maxCount = useMemo(() => {
    const values = Object.values(stats.attemptDistribution).map(Number);
    return Math.max(...values, 1);
  }, [stats.attemptDistribution]);

  const statCards = useMemo(() => [
    {
      icon: <Users className="w-4 h-4" />,
      label: t('wordHunt.stats.totalPlayers'),
      value: stats.totalPlayers,
      color: 'text-neo-cyan',
      bgColor: 'bg-neo-cyan/10 border-neo-cyan/30',
      iconBg: 'bg-neo-cyan/20',
      delay: 200,
    },
    {
      icon: <Target className="w-4 h-4" />,
      label: t('wordHunt.stats.solveRate'),
      value: stats.solveRate,
      suffix: '%',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20',
      delay: 350,
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: t('wordHunt.stats.avgAttempts'),
      value: stats.avgAttemptsSolved ?? 0,
      decimals: 1,
      color: 'text-neo-pink',
      bgColor: 'bg-neo-pink/10 border-neo-pink/30',
      iconBg: 'bg-neo-pink/20',
      delay: 500,
    },
  ], [stats, t]);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-neo-pink rounded-full" />
          <h3 className="text-sm font-black text-neo-white uppercase tracking-wider">
            {t('wordHunt.stats.title')}
          </h3>
        </div>

        {/* Percentile badge */}
        {stats.yourStats?.solved && stats.yourStats.percentile !== undefined && (
          <m.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 12 }}
            className="relative"
          >
            <div className="px-3 py-1 bg-linear-to-r from-neo-pink/20 to-neo-yellow/20 border border-neo-pink/40 rounded-full">
              <span className="text-xs font-black text-neo-pink">
                {t('wordHunt.stats.top')} {Math.max(1, 100 - stats.yourStats.percentile)}%
              </span>
            </div>
            {/* Shimmer sweep */}
            <m.div
              className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <m.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ delay: 1.2, duration: 0.8, ease: 'easeInOut', repeat: 2, repeatDelay: 2.5 }}
              />
            </m.div>
          </m.div>
        )}
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-2">
        {statCards.map((card, idx) => (
          <m.div
            key={card.label}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.1 + idx * 0.12,
              type: 'spring',
              stiffness: 350,
              damping: 20,
            }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative rounded-neo border-2 p-2.5 text-center overflow-hidden cursor-default",
              card.bgColor
            )}
          >
            {/* Icon */}
            <div className={cn(
              "mx-auto w-7 h-7 rounded-full flex items-center justify-center mb-1.5",
              card.iconBg, card.color
            )}>
              {card.icon}
            </div>
            {/* Value */}
            <AnimatedStat
              value={card.value}
              suffix={card.suffix}
              delay={card.delay}
              decimals={card.decimals}
              className={cn("block text-xl font-black tabular-nums leading-none", card.color)}
            />
            {/* Label */}
            <span className="block text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">
              {card.label}
            </span>
          </m.div>
        ))}
      </div>

      {/* Distribution histogram */}
      <div className="bg-neo-navy-light/60 rounded-neo border-2 border-neo-black p-3 space-y-2 relative overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
            {t('wordHunt.stats.distribution')}
          </span>
        </div>

        <div className="space-y-1">
          {[...Array(10)].map((_, i) => {
            const attemptNum = i + 1;
            const count = Number(stats.attemptDistribution[attemptNum] || 0);
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isYourAttempt = result.solved && result.attemptsUsed === attemptNum;

            return (
              <m.div
                key={attemptNum}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
                className={cn(
                  "flex items-center gap-2 rounded-md py-0.5 px-1 -mx-1 transition-colors",
                  isYourAttempt && "bg-white/5"
                )}
              >
                {/* Attempt number */}
                <span className={cn(
                  "text-[11px] font-black w-4 text-right tabular-nums",
                  isYourAttempt ? "text-neo-yellow" : "text-slate-500"
                )}>
                  {attemptNum}
                </span>

                {/* Bar track */}
                <div className="flex-1 h-5 bg-neo-navy-elevated/50 rounded-sm overflow-hidden relative">
                  {/* Animated fill */}
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(percentage, count > 0 ? 8 : 0)}%` }}
                    transition={{
                      delay: 0.6 + i * 0.08,
                      duration: 0.6,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                    className={cn(
                      "h-full rounded-sm bg-linear-to-r flex items-center justify-end px-1.5",
                      isYourAttempt ? "from-neo-yellow to-amber-400" : getBarColor(attemptNum),
                      isYourAttempt && getBarGlow(attemptNum)
                    )}
                  >
                    {count > 0 && (
                      <m.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 + i * 0.08 }}
                        className="text-[10px] font-black text-white tabular-nums drop-shadow-xs"
                      >
                        {count}
                      </m.span>
                    )}
                  </m.div>
                </div>

                {/* Your attempt marker */}
                {isYourAttempt && (
                  <m.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 1.2,
                      type: 'spring',
                      stiffness: 500,
                      damping: 12,
                    }}
                    className="text-[10px] font-black text-neo-yellow uppercase w-8"
                  >
                    {t('common.you').toUpperCase()}
                  </m.span>
                )}
                {!isYourAttempt && <span className="w-8" />}
              </m.div>
            );
          })}
        </div>
      </div>

      {/* Survival metrics (if available) */}
      {(stats.avgLifeRemaining != null || stats.avgEfficiencyScore != null) && (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, type: 'spring', stiffness: 300, damping: 25 }}
          className="grid grid-cols-2 gap-2"
        >
          {stats.avgLifeRemaining != null && (
            <div className="relative bg-red-500/10 border-2 border-red-500/30 rounded-neo p-3 text-center overflow-hidden">
              <div className="mx-auto w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center mb-1.5">
                <Heart className="w-4 h-4 text-red-400" />
              </div>
              <AnimatedStat
                value={stats.avgLifeRemaining}
                delay={1600}
                className="block text-xl font-black text-red-400 tabular-nums leading-none"
              />
              <span className="block text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">
                {t('wordHunt.results.avgLifeLeft')}
              </span>
            </div>
          )}
          {stats.avgEfficiencyScore != null && (
            <div className="relative bg-purple-500/10 border-2 border-purple-500/30 rounded-neo p-3 text-center overflow-hidden">
              <div className="mx-auto w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center mb-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <AnimatedStat
                value={stats.avgEfficiencyScore}
                delay={1800}
                className="block text-xl font-black text-purple-400 tabular-nums leading-none"
              />
              <span className="block text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">
                {t('wordHunt.results.avgEfficiency')}
              </span>
            </div>
          )}
        </m.div>
      )}
    </div>
  );
};

export default StatsSection;
