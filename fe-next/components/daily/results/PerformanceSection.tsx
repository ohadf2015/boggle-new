/**
 * PerformanceSection Component
 * Three mini gauge rings for Speed, Accuracy, and Exploration breakdown.
 * Replaces the previous horizontal progress bar design.
 */

'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Zap, Target, BookOpen, Coins, Lock, RotateCcw } from 'lucide-react';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { ScoreGaugeRing } from './ScoreGaugeRing';
import type { CoinRewardMode } from '@/components/results/CoinRewardDisplay';

const EXTRA_TRY_PENALTY = 150;

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
  extraTries?: number;
  t: (key: string) => string;
  language: string;
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
  extraTries = 0,
  t,
  language,
}) => {
  const isTeasing = coinRewardMode === 'teasing';
  const breakdown = getScoreBreakdown(lifeRemaining, guessesUsed, wordsDiscovered, solved);
  const retryPenalty = extraTries * EXTRA_TRY_PENALTY;

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
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
      className="bg-neo-gray rounded-neo-lg border-3 border-neo-black shadow-hard p-4"
    >
      {/* Three Mini Gauge Rings — dramatic staggered entrance */}
      <div className="flex justify-center gap-4 sm:gap-6">
        {rings.map((ring, index) => (
          <m.div
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
            <m.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.2 }}
              className="text-[11px] font-bold text-slate-300"
            >
              {ring.label}
            </m.span>
            <m.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.2 }}
              className="text-[10px] text-slate-500"
            >
              {ring.detail}
            </m.span>
          </m.div>
        ))}
      </div>

      {/* Extra Try Penalty — visible deduction */}
      {retryPenalty > 0 && (
        <m.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 26 }}
          className="mt-3 pt-3 border-t border-neo-black/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-neo-red" />
              <span className="text-xs font-medium text-slate-300">
                {t('wordHunt.score.extraTryPenalty')}
              </span>
            </div>
            <span className="font-black text-neo-red">
              -{retryPenalty}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {extraTries} {extraTries === 1 ? t('wordHunt.score.extraTry') : t('wordHunt.score.extraTries')} × {EXTRA_TRY_PENALTY} {t('wordHunt.score.points')}
          </div>
        </m.div>
      )}

      {/* Coin Reward — Compact inline display */}
      {coinReward && coinReward.awarded > 0 && (
        <div className="mt-3 pt-3 border-t border-neo-black/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isTeasing && <Lock className="w-3 h-3 text-slate-400" />}
              <Coins className={`w-4 h-4 ${isTeasing ? 'text-amber-500/50' : 'text-amber-400'}`} />
              <span className={`text-xs font-medium ${isTeasing ? 'text-slate-400' : 'text-slate-300'}`}>
                {isTeasing
                  ? (t('coins.guestTeasing') || '').replace('{amount}', safeToLocaleString(coinReward.awarded, language))
                  : (t('wordHunt.results.coinsEarned'))}
              </span>
            </div>
            <span className={`font-black ${isTeasing ? 'text-amber-500/50' : 'text-amber-400'}`}>
              +{coinReward.awarded}
            </span>
          </div>
        </div>
      )}
    </m.div>
  );
};

export default PerformanceSection;
