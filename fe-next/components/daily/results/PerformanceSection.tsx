/**
 * PerformanceSection Component
 * Combined section for score breakdown and rewards display
 * Uses the new Season 2 scoring formula (Speed + Accuracy + Exploration)
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Coins, Timer, Lock, Zap, Target, BookOpen, TrendingUp } from 'lucide-react';
import { getSurvivalBonusMessage } from './constants';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import type { CoinRewardMode } from '@/components/results/CoinRewardDisplay';

export interface PerformanceSectionProps {
  // Rewards props
  coinReward: { awarded: number; breakdown: { base: number; efficiency: number; streak: number } } | null;
  /** Coin reward mode: 'earned' for authenticated users, 'teasing' for guests */
  coinRewardMode?: CoinRewardMode;
  survivalBonusTime: number;
  rarestWord: { word: string; rarity: number; emoji: string; label: string } | null;
  // Score breakdown props
  solved: boolean;
  efficiencyScore: number;
  lifeRemaining: number;
  wordsDiscovered: number;
  guessesUsed: number;
  t: (key: string) => string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  coinReward,
  coinRewardMode = 'earned',
  survivalBonusTime,
  rarestWord,
  solved,
  lifeRemaining,
  wordsDiscovered,
  guessesUsed,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isTeasing = coinRewardMode === 'teasing';

  // Calculate score using new formula
  const breakdown = getScoreBreakdown(lifeRemaining, guessesUsed, wordsDiscovered, solved);

  // Check if there's anything to show
  const hasRewards = (coinReward && coinReward.awarded > 0) || survivalBonusTime > 0 || (rarestWord && rarestWord.rarity >= 4);
  const hasScore = solved && breakdown.total > 0;

  if (!hasRewards && !hasScore) return null;

  // Get improvement tip
  const getImprovementTip = () => {
    if (breakdown.total >= 1000) return null;

    const gaps = [
      { gap: 400 - breakdown.speed, tip: t('wordHunt.score.improve.speed') || 'Finish faster', pts: 400 - breakdown.speed },
      { gap: 400 - breakdown.accuracy, tip: t('wordHunt.score.improve.accuracy') || 'Use fewer guesses', pts: 400 - breakdown.accuracy },
      { gap: 200 - breakdown.exploration, tip: t('wordHunt.score.improve.exploration') || 'Find more words', pts: 200 - breakdown.exploration },
    ];

    const largest = gaps.reduce((max, curr) => (curr.gap > max.gap ? curr : max));
    return largest.gap > 0 ? largest : null;
  };

  const tip = getImprovementTip();
  const isPerfect = breakdown.total >= 1000;

  return (
    <div className="rounded-neo border-3 border-neo-black overflow-hidden shadow-hard">
      {/* Collapsible Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-900/70 hover:to-indigo-900/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Score preview */}
          {hasScore && (
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${isPerfect ? 'text-neo-lime' : 'text-white'}`}>
                {breakdown.total}
              </span>
              <span className="text-sm font-bold text-gray-500">/ 1000</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Preview badges when collapsed */}
          {!expanded && (
            <div className="flex items-center gap-1.5">
              {coinReward && coinReward.awarded > 0 && !isTeasing && (
                <span className="text-xs font-bold text-amber-400">+{coinReward.awarded}🪙</span>
              )}
              {coinReward && coinReward.awarded > 0 && isTeasing && (
                <span className="text-xs font-bold text-slate-400 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />+{coinReward.awarded}🪙
                </span>
              )}
            </div>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-gray-400" />
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
            <div className="p-4 space-y-4 bg-slate-900">
              {/* Score breakdown - 3 categories */}
              {hasScore && (
                <div className="space-y-3">
                  {/* Speed */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-neo-black bg-neo-cyan shadow-hard-sm">
                      <Zap className="w-4 h-4 text-neo-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white">{t('wordHunt.score.speed') || 'Speed'}</span>
                        <span className="text-sm font-black text-neo-cyan">{breakdown.speed}/400</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(breakdown.speed / 400) * 100}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full bg-neo-cyan"
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {breakdown.raw.lifeRemaining} {t('wordHunt.score.lifeLeft') || 'life left'}
                      </div>
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-neo-black bg-neo-lime shadow-hard-sm">
                      <Target className="w-4 h-4 text-neo-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white">{t('wordHunt.score.accuracy') || 'Accuracy'}</span>
                        <span className="text-sm font-black text-neo-lime">{breakdown.accuracy}/400</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(breakdown.accuracy / 400) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                          className="h-full rounded-full bg-neo-lime"
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {breakdown.raw.guessesUsed === 1
                          ? (t('wordHunt.score.firstTry') || 'First try!')
                          : `${breakdown.raw.guessesUsed} ${t('wordHunt.score.guesses') || 'guesses'}`}
                      </div>
                    </div>
                  </div>

                  {/* Exploration */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-neo-black bg-neo-pink shadow-hard-sm">
                      <BookOpen className="w-4 h-4 text-neo-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white">{t('wordHunt.score.exploration') || 'Exploration'}</span>
                        <span className="text-sm font-black text-neo-pink">{breakdown.exploration}/200</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(breakdown.exploration / 200) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="h-full rounded-full bg-neo-pink"
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {breakdown.raw.wordsFound} {t('wordHunt.score.wordsFound') || 'words found'}
                      </div>
                    </div>
                  </div>

                  {/* Improvement tip */}
                  {tip && (
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-neo-cyan/10 to-neo-pink/10 rounded-lg border border-gray-700">
                      <TrendingUp className="w-4 h-4 text-neo-cyan flex-shrink-0" />
                      <span className="text-sm text-gray-300">
                        {tip.tip}
                        <span className="text-neo-lime font-bold ms-1">(+{tip.pts})</span>
                      </span>
                    </div>
                  )}

                  {isPerfect && (
                    <div className="text-center text-neo-lime font-bold text-sm py-2">
                      {t('wordHunt.score.perfect') || 'Perfect Score!'}
                    </div>
                  )}
                </div>
              )}

              {/* Rewards Section */}
              {hasRewards && (
                <div className="space-y-2 pt-3 border-t border-gray-700">
                  {/* Coin rewards - earned mode */}
                  {coinReward && coinReward.awarded > 0 && !isTeasing && (
                    <div className="flex items-center justify-between p-2 bg-amber-900/20 rounded-lg border border-amber-800">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-xs text-gray-200">{t('wordHunt.results.coinsEarned') || 'Coins Earned'}</span>
                      </div>
                      <span className="font-black text-amber-400">+{coinReward.awarded}</span>
                    </div>
                  )}

                  {/* Coin rewards - teasing mode for guests */}
                  {coinReward && coinReward.awarded > 0 && isTeasing && (
                    <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-500/70" />
                        <Coins className="w-4 h-4 text-amber-500/60" />
                        <span className="font-bold text-xs text-slate-300">
                          {(t('coins.guestTeasing') || 'Sign in to earn {amount} coins!').replace('{amount}', String(coinReward.awarded))}
                        </span>
                      </div>
                      <span className="font-black text-amber-500/70">+{coinReward.awarded}</span>
                    </div>
                  )}

                  {/* Survival bonus */}
                  {survivalBonusTime > 0 && (
                    <div className="flex items-center justify-between p-2 bg-cyan-900/20 rounded-lg border border-cyan-800">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-xs text-gray-200">{t('wordHunt.results.survivalBonus')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]">{getSurvivalBonusMessage(survivalBonusTime).emoji}</span>
                        <span className="font-black text-cyan-400">+{survivalBonusTime}s</span>
                      </div>
                    </div>
                  )}

                  {/* Rarest word */}
                  {rarestWord && rarestWord.rarity >= 4 && (
                    <div className="flex items-center justify-between p-2 bg-indigo-900/20 rounded-lg border border-indigo-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{rarestWord.emoji}</span>
                        <span className="font-bold text-xs text-gray-200">{rarestWord.label} {t('wordHunt.results.find')}</span>
                      </div>
                      <span className="font-black text-indigo-400 tracking-wide">{rarestWord.word.toUpperCase()}</span>
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
