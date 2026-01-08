/**
 * PerformanceSection Component
 * Combined collapsible section for rewards and score breakdown
 * Merges CollapsibleDetails + ScoreBreakdownSection into one cleaner component
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Coins, Timer, BarChart3 } from 'lucide-react';
import { getSurvivalBonusMessage } from './constants';

export interface PerformanceSectionProps {
  // Rewards props (from CollapsibleDetails)
  coinReward: { awarded: number; breakdown: { base: number; efficiency: number; streak: number } } | null;
  survivalBonusTime: number;
  rarestWord: { word: string; rarity: number; emoji: string; label: string } | null;
  // Score breakdown props (from ScoreBreakdownSection)
  solved: boolean;
  efficiencyScore: number;
  lifeRemaining: number;
  unusedTokens: number;
  wordsDiscovered: number;
  guessesUsed: number;
  t: (key: string) => string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  coinReward,
  survivalBonusTime,
  rarestWord,
  solved,
  efficiencyScore,
  lifeRemaining,
  unusedTokens,
  wordsDiscovered,
  guessesUsed,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Check if there's anything to show
  const hasRewards = (coinReward && coinReward.awarded > 0) || survivalBonusTime > 0 || (rarestWord && rarestWord.rarity >= 4);
  const hasScore = solved && efficiencyScore > 0;

  if (!hasRewards && !hasScore) return null;

  // Calculate score contributions for breakdown
  const lifeContribution = Math.round(Math.max(0, lifeRemaining) * 10);
  const tokenContribution = Math.round(Math.max(0, unusedTokens) * 5);
  const wordsContribution = Math.round(Math.max(0, wordsDiscovered) * 3);
  const guessPenalty = Math.round(Math.max(0, guessesUsed) * 2);

  return (
    <div className="rounded-neo border-2 border-neo-black overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-purple-100 to-amber-100 dark:from-purple-900/30 dark:to-amber-900/30 hover:from-purple-200 hover:to-amber-200 dark:hover:from-purple-900/50 dark:hover:to-amber-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase">
            {t('wordHunt.results.performanceRewards') || 'Performance & Rewards'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Preview badges when collapsed */}
          {!expanded && (
            <div className="flex items-center gap-1.5">
              {hasScore && (
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{Math.round(efficiencyScore)} pts</span>
              )}
              {coinReward && coinReward.awarded > 0 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">+{coinReward.awarded}🪙</span>
              )}
              {survivalBonusTime > 0 && (
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">+{survivalBonusTime}s</span>
              )}
            </div>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-gray-500" />
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
            <div className="p-3 space-y-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
              {/* Efficiency Score Summary */}
              {hasScore && (
                <div className="text-center pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                    {Math.round(efficiencyScore)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                    {t('wordHunt.results.efficiencyScore') || 'Efficiency Score'}
                  </div>
                  {/* Simple formula breakdown */}
                  <div className="mt-1 text-[10px] text-gray-400 font-mono">
                    ❤️{lifeContribution} + 🪙{tokenContribution} + 📖{wordsContribution} - 🎯{guessPenalty}
                  </div>
                </div>
              )}

              {/* Rewards Section */}
              {hasRewards && (
                <div className="space-y-2">
                  {/* Coin rewards */}
                  {coinReward && coinReward.awarded > 0 && (
                    <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-xs text-gray-700 dark:text-gray-200">{t('wordHunt.results.coinsEarned') || 'Coins Earned'}</span>
                      </div>
                      <span className="font-black text-amber-600 dark:text-amber-400">+{coinReward.awarded}</span>
                    </div>
                  )}

                  {/* Survival bonus */}
                  {survivalBonusTime > 0 && (
                    <div className="flex items-center justify-between p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-cyan-600" />
                        <span className="font-bold text-xs text-gray-700 dark:text-gray-200">{t('wordHunt.results.survivalBonus')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]">{getSurvivalBonusMessage(survivalBonusTime).emoji}</span>
                        <span className="font-black text-cyan-600 dark:text-cyan-400">+{survivalBonusTime}s</span>
                      </div>
                    </div>
                  )}

                  {/* Rarest word */}
                  {rarestWord && rarestWord.rarity >= 4 && (
                    <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{rarestWord.emoji}</span>
                        <span className="font-bold text-xs text-gray-700 dark:text-gray-200">{rarestWord.label} {t('wordHunt.results.find')}</span>
                      </div>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 tracking-wide">{rarestWord.word.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerformanceSection;
