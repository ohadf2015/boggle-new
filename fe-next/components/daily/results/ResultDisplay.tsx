/**
 * ResultDisplay Component
 * Streamlined hero section for efficiency score display
 * Clean, focused design with minimal visual noise
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock } from 'lucide-react';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import { fireConfetti } from '@/utils/confettiUtils';
import type { Language } from '@/types';

export interface ResultDisplayProps {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  streakDays: number;
  language: Language;
  puzzleNumber: number;
  countdown: string;
  lifeRemaining?: number;
  wordsDiscovered?: number;
  rank?: number;
  totalPlayers?: number;
  t: (key: string) => string;
}

/** Score tier colors with glow effect and border for ring animation */
function getScoreStyles(score: number) {
  if (score >= 800) return { color: 'text-neo-lime', glow: '0 0 40px rgba(191, 255, 0, 0.4)', border: 'border-neo-lime/20' };
  if (score >= 600) return { color: 'text-neo-yellow', glow: '0 0 40px rgba(255, 225, 53, 0.4)', border: 'border-neo-yellow/20' };
  if (score >= 400) return { color: 'text-neo-orange', glow: '0 0 40px rgba(255, 107, 53, 0.4)', border: 'border-neo-orange/20' };
  return { color: 'text-neo-pink', glow: '0 0 40px rgba(255, 20, 147, 0.4)', border: 'border-neo-pink/20' };
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  solved,
  attemptsUsed,
  targetWord,
  streakDays,
  language,
  puzzleNumber,
  countdown,
  lifeRemaining = 0,
  wordsDiscovered = 0,
  t,
}) => {
  const scoreBreakdown = useMemo(() =>
    getScoreBreakdown(lifeRemaining, attemptsUsed, wordsDiscovered, solved),
    [lifeRemaining, attemptsUsed, wordsDiscovered, solved]
  );

  const styles = getScoreStyles(scoreBreakdown.total);
  const displayedTargetWord = language === 'he'
    ? applyHebrewFinalLetters(targetWord ?? '')
    : (targetWord ?? '').toUpperCase();

  const handleTapCelebrate = () => {
    if (solved && scoreBreakdown.total > 0) {
      fireConfetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#BFFF00', '#00FFFF', '#FF1493', '#FFE135'],
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-neo-navy/90 rounded-neo-lg border-3 border-neo-black shadow-hard-lg overflow-hidden">
        {/* Compact Header with Puzzle # and Streak */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-700/50">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
            {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))}
          </span>
          {streakDays > 0 && (
            <div className="flex items-center gap-1 text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{streakDays}</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="px-5 py-6 text-center">
          {solved ? (
            /* WIN STATE - Clean score display with animated ring */
            <motion.div
              onClick={handleTapCelebrate}
              className="cursor-pointer select-none relative"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Decorative animated ring */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none -top-2">
                <div
                  className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 ${styles.border} animate-ping`}
                  style={{ animationDuration: '2s' }}
                />
              </div>

              {/* Score */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                className="relative"
              >
                <div
                  className={`text-[5rem] sm:text-[6rem] font-black ${styles.color} leading-none tracking-tight`}
                  style={{ textShadow: styles.glow }}
                >
                  {scoreBreakdown.total}
                </div>
                <div className="text-slate-500 text-sm font-bold -mt-1">
                  / 1000
                </div>
              </motion.div>

              {/* Target Word - Revealed */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-5 pt-4 border-t border-slate-700/40"
              >
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">
                  {t('wordHunt.results.targetWord')}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-neo-lime tracking-wider">
                  {displayedTargetWord}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* FAIL STATE - Encourage next attempt */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-5"
            >
              <div className="text-slate-300 font-medium">
                {t('wordHunt.results.betterLuckNextTime')}
              </div>

              {/* Attempts display */}
              <div>
                <div className="text-5xl font-black text-slate-400 tracking-tight">
                  {attemptsUsed}<span className="text-slate-600">/10</span>
                </div>
                <div className="text-xs text-slate-500 uppercase font-medium mt-1">
                  {t('wordHunt.results.attemptsUsed') || 'attempts used'}
                </div>
              </div>

              {/* Next challenge countdown */}
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 rounded-neo border-2 border-slate-600/50">
                <Clock className="w-4 h-4 text-neo-cyan" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    {t('wordHunt.results.nextChallengeIn')}
                  </div>
                  <div className="text-xl font-black text-neo-cyan -mt-0.5">
                    {countdown}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ResultDisplay;
