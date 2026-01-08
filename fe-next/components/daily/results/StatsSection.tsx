/**
 * StatsSection Component
 * Collapsible stats section with distribution histogram
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WordHuntStats } from './types';
import type { WordHuntResult } from '@/utils/dailyChallenge';

export interface StatsSectionProps {
  stats: WordHuntStats;
  result: WordHuntResult;
  t: (key: string) => string;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  stats,
  result,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-neo border-2 border-neo-black overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-white dark:bg-neo-navy-light hover:bg-gray-50 dark:hover:bg-neo-navy transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t('wordHunt.stats.title')}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            {stats.yourStats?.solved && stats.yourStats.percentile !== undefined && (
              <span className="px-2 py-0.5 bg-neo-pink/20 text-neo-pink dark:text-purple-300 rounded-full font-bold">
                {t('wordHunt.stats.top')} {stats.yourStats.percentile}%
              </span>
            )}
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-bold">
              {stats.solveRate}% {t('wordHunt.stats.solved')}
            </span>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-5 h-5 text-gray-500" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-2 bg-white dark:bg-neo-navy-light border-t border-gray-200 dark:border-gray-700 space-y-4 text-neo-black dark:text-neo-white">
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.totalPlayers}</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.stats.totalPlayers')}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                  <div className="text-lg font-black text-green-600 dark:text-green-400">{stats.solveRate}%</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.stats.solveRate')}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400">{stats.avgAttemptsSolved?.toFixed(1) ?? 'N/A'}</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.stats.avgAttempts')}</div>
                </div>
              </div>

              {/* Distribution histogram */}
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                  📈 {t('wordHunt.stats.distribution')}
                </div>
                {[...Array(10)].map((_, i) => {
                  const attemptNum = i + 1;
                  const count = stats.attemptDistribution[attemptNum] || 0;
                  const maxCount = Math.max(...Object.values(stats.attemptDistribution));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const isYourAttempt = result.solved && result.attemptsUsed === attemptNum;

                  return (
                    <div key={attemptNum} className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] font-bold w-4", isYourAttempt ? "text-neo-yellow" : "text-gray-600 dark:text-gray-400")}>
                        {attemptNum}
                      </span>
                      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-sm overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full flex items-center justify-end px-1 text-[10px] font-bold text-white transition-all",
                            isYourAttempt ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        >
                          {count > 0 && <span>{count}</span>}
                        </div>
                      </div>
                      {isYourAttempt && <span className="text-[10px] font-bold text-neo-yellow">{t('common.you').toUpperCase()}</span>}
                    </div>
                  );
                })}
              </div>

              {/* Survival stats */}
              {(stats.avgLifeRemaining != null || stats.avgEfficiencyScore != null) && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">{t('wordHunt.results.survivalMetrics')}</div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {stats.avgLifeRemaining != null && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-lg font-black text-red-500">{stats.avgLifeRemaining.toFixed(0)}</div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.results.avgLifeLeft')}</div>
                      </div>
                    )}
                    {stats.avgEfficiencyScore != null && (
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-lg font-black text-purple-500">{stats.avgEfficiencyScore.toFixed(0)}</div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">{t('wordHunt.results.avgEfficiency')}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatsSection;
