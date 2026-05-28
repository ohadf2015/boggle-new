/**
 * ScoreBreakdownSection Component
 * Simplified score display with 3 clear categories: Speed, Accuracy, Exploration
 * Shows progress toward max 1000 points with actionable improvement tips
 */

'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Zap, Target, BookOpen, TrendingUp } from 'lucide-react';
import { getScoreBreakdown, type ScoreBreakdown } from '@/utils/aiHintGenerator';

export interface ScoreBreakdownSectionProps {
  solved: boolean;
  efficiencyScore: number;
  lifeRemaining: number;
  guessesUsed: number;
  wordsDiscovered: number;
  t: (key: string) => string;
}

interface ScoreCategory {
  id: 'speed' | 'accuracy' | 'exploration';
  icon: React.ReactNode;
  label: string;
  score: number;
  maxScore: number;
  color: string;
  bgColor: string;
  description: string;
}

/**
 * Get the weakest category that needs improvement
 */
function getImprovementTip(
  breakdown: ScoreBreakdown,
  t: (key: string) => string
): { category: string; tip: string; pointsToGain: number } | null {
  if (breakdown.total >= 1000) {
    return null; // Perfect score!
  }

  const gaps = [
    { category: 'speed', gap: 400 - breakdown.speed, tip: t('wordHunt.score.improve.speed') },
    { category: 'accuracy', gap: 400 - breakdown.accuracy, tip: t('wordHunt.score.improve.accuracy') },
    { category: 'exploration', gap: 200 - breakdown.exploration, tip: t('wordHunt.score.improve.exploration') },
  ];

  // Find the category with the largest gap (most room for improvement)
  const largest = gaps.reduce((max, curr) => (curr.gap > max.gap ? curr : max));

  if (largest.gap <= 0) return null;

  return {
    category: largest.category,
    tip: largest.tip,
    pointsToGain: largest.gap,
  };
}

export const ScoreBreakdownSection: React.FC<ScoreBreakdownSectionProps> = ({
  solved,
  lifeRemaining,
  guessesUsed,
  wordsDiscovered,
  t,
}) => {
  // Calculate breakdown using the new formula
  const breakdown = getScoreBreakdown(lifeRemaining, guessesUsed, wordsDiscovered, solved);
  const improvementTip = getImprovementTip(breakdown, t);

  // Define the 3 score categories
  const categories: ScoreCategory[] = [
    {
      id: 'speed',
      icon: <Zap className="w-4 h-4" />,
      label: t('wordHunt.score.speed'),
      score: breakdown.speed,
      maxScore: 400,
      color: 'text-neo-cyan',
      bgColor: 'bg-neo-cyan',
      description: `${breakdown.raw.lifeRemaining} ${t('wordHunt.score.lifeLeft')}`,
    },
    {
      id: 'accuracy',
      icon: <Target className="w-4 h-4" />,
      label: t('wordHunt.score.accuracy'),
      score: breakdown.accuracy,
      maxScore: 400,
      color: 'text-neo-lime',
      bgColor: 'bg-neo-lime',
      description: breakdown.raw.guessesUsed === 1
        ? t('wordHunt.score.firstTry')
        : `${breakdown.raw.guessesUsed} ${t('wordHunt.score.guesses')}`,
    },
    {
      id: 'exploration',
      icon: <BookOpen className="w-4 h-4" />,
      label: t('wordHunt.score.exploration'),
      score: breakdown.exploration,
      maxScore: 200,
      color: 'text-neo-pink',
      bgColor: 'bg-neo-pink',
      description: `${breakdown.raw.wordsFound} ${t('wordHunt.score.wordsFound')}`,
    },
  ];

  const isPerfect = breakdown.total >= 1000;

  return (
    <div className="rounded-neo border-3 border-neo-black bg-neo-navy overflow-hidden shadow-hard">
      {/* Header with total score */}
      <div className="p-4 bg-linear-to-r from-purple-900/50 to-indigo-900/50 border-b-3 border-neo-black">
        <div className="text-center">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            {t('wordHunt.score.title')}
          </div>
          <m.div
            initial={{ scale: 0.3, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 14 }}
            className="flex items-baseline justify-center gap-1"
          >
            <m.span
              className={`text-5xl font-black ${isPerfect ? 'text-neo-lime' : 'text-white'}`}
              style={{
                textShadow: isPerfect ? '0 0 20px rgba(191, 255, 0, 0.5)' : undefined,
              }}
            >
              {breakdown.total}
            </m.span>
            <span className="text-xl font-bold text-gray-500">/ 1000</span>
          </m.div>

          {/* Overall progress bar */}
          <div className="mt-3 h-2 bg-neo-navy-light rounded-full overflow-hidden border border-gray-700">
            <m.div
              initial={{ width: 0 }}
              animate={{ width: `${(breakdown.total / 1000) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${isPerfect ? 'bg-neo-lime' : 'bg-linear-to-r from-neo-cyan via-neo-lime to-neo-pink'}`}
            />
          </div>

          {isPerfect && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="mt-2 text-neo-lime font-bold text-sm"
            >
              {t('wordHunt.score.perfect')}
            </m.div>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="p-4 space-y-3">
        {categories.map((category, index) => (
          <m.div
            key={category.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, type: 'spring', stiffness: 380, damping: 26 }}
            className="flex items-center gap-3"
          >
            {/* Icon */}
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 border-neo-black ${category.bgColor} shadow-hard-sm`}>
              <span className="text-neo-black">{category.icon}</span>
            </div>

            {/* Label and progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">{category.label}</span>
                <span className={`text-sm font-black ${category.color}`}>
                  {category.score}/{category.maxScore}
                </span>
              </div>

              {/* Progress bar with overshoot spring */}
              <div className="h-2 bg-neo-navy-light rounded-full overflow-hidden relative">
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(category.score / category.maxScore) * 100}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2 + index * 0.12,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className={`h-full rounded-full ${category.bgColor} relative overflow-hidden`}
                >
                  {/* Shimmer sweep on the bar */}
                  <m.div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    }}
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ delay: 0.8 + index * 0.12, duration: 0.6 }}
                  />
                </m.div>
              </div>

              {/* Description */}
              <div className="text-xs text-gray-500 mt-0.5">{category.description}</div>
            </div>
          </m.div>
        ))}
      </div>

      {/* Improvement tip */}
      {improvementTip && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 26 }}
          className="px-4 pb-4"
        >
          <div className="flex items-center gap-2 p-3 bg-linear-to-r from-neo-cyan/10 to-neo-pink/10 rounded-lg border border-gray-700">
            <TrendingUp className="w-4 h-4 text-neo-cyan shrink-0" />
            <span className="text-sm text-gray-300">
              {improvementTip.tip}
              <span className="text-neo-lime font-bold ms-1">
                (+{improvementTip.pointsToGain})
              </span>
            </span>
          </div>
        </m.div>
      )}
    </div>
  );
};

export default ScoreBreakdownSection;
