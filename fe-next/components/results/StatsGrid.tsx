'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Hash, Target, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface StatItem {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  /** Optional: hide on mobile, show on sm+ */
  hiddenOnMobile?: boolean;
}

interface StatsGridProps {
  stats: StatItem[];
  /** Number of columns on mobile (default: 2) */
  mobileColumns?: 2 | 3;
  /** Number of columns on sm+ (default: 3) */
  smColumns?: 2 | 3 | 4;
  className?: string;
}

/**
 * StatsGrid - Reusable grid for displaying key game statistics
 *
 * Used in:
 * - SinglePlayerResults (Results tab)
 * - ResultsPage (mobile Results tab)
 * - ConsolidatedPlayerCard (Key Stats Grid)
 *
 * @example
 * ```tsx
 * <StatsGrid
 *   stats={[
 *     { icon: <Hash />, iconBg: 'bg-neo-lime', value: 15, label: 'Words' },
 *     { icon: <Target />, iconBg: 'bg-neo-pink', value: '87%', label: 'Accuracy' },
 *     { icon: <Award />, iconBg: 'bg-neo-pink', value: 'CHAMPION', label: '12 pts', hiddenOnMobile: true },
 *   ]}
 * />
 * ```
 */
const StatsGrid: React.FC<StatsGridProps> = memo(({
  stats,
  mobileColumns = 2,
  smColumns = 3,
  className,
}) => {
  const gridColsClass = smColumns === 4
    ? `grid-cols-${mobileColumns} sm:grid-cols-4`
    : smColumns === 2
      ? `grid-cols-${mobileColumns} sm:grid-cols-2`
      : `grid-cols-${mobileColumns} sm:grid-cols-3`;

  return (
    <div className={cn(
      'grid gap-1.5 sm:gap-2',
      mobileColumns === 2 && smColumns === 3 && 'grid-cols-2 sm:grid-cols-3',
      mobileColumns === 3 && smColumns === 3 && 'grid-cols-3',
      mobileColumns === 2 && smColumns === 2 && 'grid-cols-2',
      className
    )}>
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            'bg-white/10 rounded-neo border border-white/20 p-1.5 sm:p-2 text-center',
            stat.hiddenOnMobile && 'hidden sm:block'
          )}
        >
          <div className="flex justify-center mb-0.5 sm:mb-1">
            <div className={cn(
              'w-5 h-5 sm:w-6 sm:h-6 rounded border border-neo-black flex items-center justify-center',
              stat.iconBg
            )}>
              {stat.icon}
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white truncate">
            {stat.value}
          </div>
          <div className="text-[8px] sm:text-[9px] font-bold uppercase text-white/60 truncate">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';

// ============================================================
// Pre-built stat configurations for common use cases
// ============================================================

export interface GameStatsConfig {
  validWordCount: number;
  accuracy: number;
  bestWord?: { word: string; score: number } | null;
}

/**
 * Create standard game stats array from game data
 */
export function createGameStats(config: GameStatsConfig, t: (key: string) => string): StatItem[] {
  const stats: StatItem[] = [
    {
      icon: <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neo-black" />,
      iconBg: 'bg-neo-lime',
      value: config.validWordCount,
      label: t('results.words') || 'Words',
    },
    {
      icon: <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neo-black" />,
      iconBg: 'bg-neo-pink',
      value: `${config.accuracy}%`,
      label: t('results.accuracy') || 'Accuracy',
    },
  ];

  // Best word (hidden on mobile to save space)
  if (config.bestWord) {
    stats.push({
      icon: <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neo-cream" />,
      iconBg: 'bg-neo-pink',
      value: config.bestWord.word.toUpperCase(),
      label: config.bestWord.score
        ? `${config.bestWord.score} ${t('results.points') || 'pts'}`
        : (t('results.bestWord') || 'Best'),
      hiddenOnMobile: true,
    });
  }

  return stats;
}

export default StatsGrid;
