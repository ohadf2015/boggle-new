/**
 * ResultDisplay Component
 * Main result display - hero section with core metrics (score, target word, streak)
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { Language } from '@/types';

export interface ResultDisplayProps {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  streakDays: number;
  language: Language;
  puzzleNumber: number;
  countdown: string;
  t: (key: string) => string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  solved,
  attemptsUsed,
  targetWord,
  streakDays,
  language,
  puzzleNumber,
  countdown,
  t,
}) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-center"
    >
      <div className="text-sm text-gray-600 dark:text-gray-300 uppercase font-bold">
        🎯 {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))}
      </div>

      {solved ? (
        <>
          <div className="text-4xl sm:text-5xl font-black mt-2 text-green-500">
            {attemptsUsed}/10
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('wordHunt.results.targetWord')}: </span>
            <span className="text-xl sm:text-2xl font-black text-neo-yellow">
              {language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord.toUpperCase()}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="text-lg text-gray-600 dark:text-gray-300">{t('wordHunt.results.betterLuckNextTime')}</div>
          <div className="inline-block px-5 py-3 bg-slate-600 rounded-neo border-3 border-neo-black shadow-hard">
            <div className="text-xs text-white/80 uppercase font-bold mb-1">{t('wordHunt.results.nextChallengeIn')}</div>
            <div className="text-2xl font-black text-white">{countdown}</div>
          </div>
        </div>
      )}

      {/* Streak display */}
      {streakDays > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.25 }}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 rounded-neo border-2 border-neo-black shadow-hard-sm"
        >
          <span className="text-xl">🔥</span>
          <span className="font-black text-white text-sm">
            {streakDays} {streakDays === 1 ? t('daily.dayStreak') : t('daily.daysStreak')}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ResultDisplay;
