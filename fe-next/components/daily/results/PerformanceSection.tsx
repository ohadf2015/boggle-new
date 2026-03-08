/**
 * PerformanceSection Component
 * Three mini gauge rings for Speed, Accuracy, and Exploration breakdown.
 * Replaces the previous horizontal progress bar design.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, BookOpen, Coins, Lock } from 'lucide-react';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import { ScoreGaugeRing } from './ScoreGaugeRing';
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

interface MiniRingConfig {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  color: 'neo-cyan' | 'neo-lime' | 'neo-pink';
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

  const rings: MiniRingConfig[] = [
    {
      icon: <Zap className="w-3.5 h-3.5 text-neo-cyan" />,
      label: t('wordHunt.score.speed'),
      value: breakdown.speed,
      max: 400,
      color: 'neo-cyan',
      detail: `${breakdown.raw.lifeRemaining} ${t('wordHunt.score.lifeLeft')}`,
    },
    {
      icon: <Target className="w-3.5 h-3.5 text-neo-lime" />,
      label: t('wordHunt.score.accuracy'),
      value: breakdown.accuracy,
      max: 400,
      color: 'neo-lime',
      detail: breakdown.raw.guessesUsed === 1
        ? (t('wordHunt.score.firstTry'))
        : `${breakdown.raw.guessesUsed} ${t('wordHunt.score.guesses')}`,
    },
    {
      icon: <BookOpen className="w-3.5 h-3.5 text-neo-pink" />,
      label: t('wordHunt.score.exploration'),
      value: breakdown.exploration,
      max: 200,
      color: 'neo-pink',
      detail: `${breakdown.raw.wordsFound} ${t('wordHunt.score.wordsFound')}`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
      className="bg-neo-gray rounded-neo-lg border-3 border-neo-black shadow-hard p-4"
    >
      {/* Three Mini Gauge Rings — dramatic staggered entrance */}
      <div className="flex justify-center gap-4 sm:gap-6">
        {rings.map((ring, index) => (
          <motion.div
            key={ring.label}
            initial={{ opacity: 0, scale: 0.3, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: 0.3 + index * 0.2,
              type: 'spring',
              stiffness: 350,
              damping: 15,
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <ScoreGaugeRing
              score={ring.value}
              maxScore={ring.max}
              size={80}
              strokeWidth={6}
              color={ring.color}
              delay={0.4 + index * 0.2}
              label={undefined}
              icon={ring.icon}
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.2 }}
              className="text-[11px] font-bold text-slate-300"
            >
              {ring.label}
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.2 }}
              className="text-[10px] text-slate-500"
            >
              {ring.detail}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Coin Reward — Compact inline display */}
      {coinReward && coinReward.awarded > 0 && (
        <div className="mt-3 pt-3 border-t border-neo-black/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isTeasing && <Lock className="w-3 h-3 text-slate-400" />}
              <Coins className={`w-4 h-4 ${isTeasing ? 'text-amber-500/50' : 'text-amber-400'}`} />
              <span className={`text-xs font-medium ${isTeasing ? 'text-slate-400' : 'text-slate-300'}`}>
                {isTeasing
                  ? (t('coins.guestTeasing') || '').replace('{amount}', String(coinReward.awarded))
                  : (t('wordHunt.results.coinsEarned'))}
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
