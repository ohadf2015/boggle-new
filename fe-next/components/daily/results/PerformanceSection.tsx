/**
 * PerformanceSection Component
 * Always-visible score breakdown with 3 progress bars
 * Clean, compact design without collapsible behavior
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, BookOpen, Coins, Lock } from 'lucide-react';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import type { CoinRewardMode } from '@/components/results/CoinRewardDisplay';

export interface PerformanceSectionProps {
  coinReward: { awarded: number; breakdown: { base: number; efficiency: number; streak: number } } | null;
  coinRewardMode?: CoinRewardMode;
  survivalBonusTime: number;
  rarestWord: { word: string; rarity: number; emoji: string; label: string } | null;
  solved: boolean;
  efficiencyScore: number;
  lifeRemaining: number;
  wordsDiscovered: number;
  guessesUsed: number;
  t: (key: string) => string;
}

interface BarConfig {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  color: string;
  bgColor: string;
  detail: string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  coinReward,
  coinRewardMode = 'earned',
  solved,
  lifeRemaining,
  wordsDiscovered,
  guessesUsed,
  t,
}) => {
  const isTeasing = coinRewardMode === 'teasing';
  const breakdown = getScoreBreakdown(lifeRemaining, guessesUsed, wordsDiscovered, solved);

  if (!solved || breakdown.total === 0) return null;

  const bars: BarConfig[] = [
    {
      icon: <Zap className="w-3.5 h-3.5" />,
      label: t('wordHunt.score.speed') || 'Speed',
      value: breakdown.speed,
      max: 400,
      color: 'bg-neo-cyan',
      bgColor: 'bg-neo-cyan/20',
      detail: `${breakdown.raw.lifeRemaining} ${t('wordHunt.score.lifeLeft') || 'life'}`,
    },
    {
      icon: <Target className="w-3.5 h-3.5" />,
      label: t('wordHunt.score.accuracy') || 'Accuracy',
      value: breakdown.accuracy,
      max: 400,
      color: 'bg-neo-lime',
      bgColor: 'bg-neo-lime/20',
      detail: breakdown.raw.guessesUsed === 1
        ? (t('wordHunt.score.firstTry') || 'First try!')
        : `${breakdown.raw.guessesUsed} ${t('wordHunt.score.guesses') || 'guesses'}`,
    },
    {
      icon: <BookOpen className="w-3.5 h-3.5" />,
      label: t('wordHunt.score.exploration') || 'Exploration',
      value: breakdown.exploration,
      max: 200,
      color: 'bg-neo-pink',
      bgColor: 'bg-neo-pink/20',
      detail: `${breakdown.raw.wordsFound} ${t('wordHunt.score.wordsFound') || 'words'}`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-slate-900/70 rounded-neo border-2 border-slate-700/50 p-4"
    >
      {/* Score Breakdown Bars */}
      <div className="space-y-3">
        {bars.map((bar, index) => (
          <div key={bar.label} className="flex items-center gap-3">
            {/* Icon */}
            <div className={`w-7 h-7 flex items-center justify-center rounded-lg ${bar.bgColor} text-white`}>
              {bar.icon}
            </div>

            {/* Bar + Labels */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">{bar.label}</span>
                <span className="text-xs font-black text-white">{bar.value}<span className="text-slate-500">/{bar.max}</span></span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(bar.value / bar.max) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
                  className={`h-full rounded-full ${bar.color}`}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{bar.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Coin Reward - Compact inline display */}
      {coinReward && coinReward.awarded > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isTeasing && <Lock className="w-3 h-3 text-slate-400" />}
              <Coins className={`w-4 h-4 ${isTeasing ? 'text-amber-500/50' : 'text-amber-400'}`} />
              <span className={`text-xs font-medium ${isTeasing ? 'text-slate-400' : 'text-slate-300'}`}>
                {isTeasing
                  ? (t('coins.guestTeasing') || 'Sign in to earn {amount} coins!').replace('{amount}', String(coinReward.awarded))
                  : (t('wordHunt.results.coinsEarned') || 'Coins Earned')}
              </span>
            </div>
            <span className={`font-black ${isTeasing ? 'text-amber-500/50' : 'text-amber-400'}`}>
              +{coinReward.awarded}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PerformanceSection;
