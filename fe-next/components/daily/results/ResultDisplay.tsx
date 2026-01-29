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

/** Score tier colors */
function getScoreStyles(score: number) {
  if (score >= 800) return { color: 'text-neo-lime' };
  if (score >= 600) return { color: 'text-neo-yellow' };
  if (score >= 400) return { color: 'text-neo-orange' };
  return { color: 'text-neo-pink' };
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
      className="w-full max-w-3xl mx-auto" // Constrain max width for desktop
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

        {/* Main Content - Responsive padding for desktop */}
        <div className="px-5 py-6 md:px-8 md:py-8 text-center md:text-left">
          {solved ? (
            /* WIN STATE - Two-column layout on desktop */
            <motion.div
              onClick={handleTapCelebrate}
              className="cursor-pointer select-none"
              whileTap={{ scale: 0.98 }}
            >
              {/* Desktop: Two-column grid | Mobile: Stacked */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
                {/* Left Column: Score */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.2, ease: 'easeOut' }}
                  className="relative flex flex-col items-center md:items-start"
                >
                  <div
                    className={`text-[5rem] sm:text-[6rem] lg:text-[7rem] font-black ${styles.color} leading-none tracking-tight`}
                  >
                    {scoreBreakdown.total}
                  </div>
                  <div className="text-slate-500 text-sm md:text-base font-bold -mt-1">
                    / 1000
                  </div>

                  {/* Score breakdown chips - visible on desktop */}
                  <div className="hidden md:flex flex-wrap gap-2 mt-4">
                    <span className="px-3 py-1.5 bg-slate-800 rounded-neo border-2 border-slate-600 text-xs font-bold text-slate-300">
                      ⚡ +{scoreBreakdown.speed}
                    </span>
                    <span className="px-3 py-1.5 bg-slate-800 rounded-neo border-2 border-slate-600 text-xs font-bold text-slate-300">
                      📝 +{scoreBreakdown.exploration}
                    </span>
                    <span className="px-3 py-1.5 bg-slate-800 rounded-neo border-2 border-slate-600 text-xs font-bold text-slate-300">
                      🎯 +{scoreBreakdown.accuracy}
                    </span>
                  </div>
                </motion.div>

                {/* Right Column: Target Word + Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center md:items-start justify-center gap-4 pt-4 md:pt-0 md:border-l md:border-t-0 border-t border-slate-700/40 md:pl-8"
                >
                  {/* Target word */}
                  <div className="text-center md:text-left">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">
                      {t('wordHunt.results.targetWord')}
                    </div>
                    <div className="text-2xl sm:text-3xl md:text-4xl font-black text-neo-lime tracking-wider">
                      {displayedTargetWord}
                    </div>
                  </div>

                  {/* Tap to celebrate hint - mobile only */}
                  <div className="md:hidden text-[10px] text-slate-500 mt-2">
                    {t('wordHunt.results.tapToCelebrate') || 'Tap to celebrate!'}
                  </div>

                  {/* Next challenge countdown - desktop placement */}
                  <div className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 rounded-neo border-2 border-slate-600/50 mt-2">
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
              </div>

              {/* Mobile: Countdown below */}
              <div className="md:hidden mt-5 pt-4 border-t border-slate-700/40">
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
              </div>
            </motion.div>
          ) : (
            /* FAIL STATE - Two-column on desktop */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* Desktop: Side by side | Mobile: Stacked */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-8 items-center">
                {/* Left: Message & Attempts */}
                <div className="space-y-5 flex flex-col items-center md:items-start">
                  <div className="text-slate-300 font-medium text-base md:text-lg">
                    {t('wordHunt.results.betterLuckNextTime')}
                  </div>

                  {/* Attempts display */}
                  <div className="text-center md:text-left">
                    <div className="text-5xl md:text-6xl font-black text-slate-400 tracking-tight">
                      {attemptsUsed}<span className="text-slate-600">/10</span>
                    </div>
                    <div className="text-xs text-slate-500 uppercase font-medium mt-1">
                      {t('wordHunt.results.attemptsUsed') || 'attempts used'}
                    </div>
                  </div>
                </div>

                {/* Right: Countdown (more prominent on desktop) */}
                <div className="flex items-center justify-center md:justify-end">
                  <div className="inline-flex flex-col items-center gap-2 px-6 py-4 bg-slate-800/80 rounded-neo border-3 border-slate-600/50">
                    <Clock className="w-6 h-6 text-neo-cyan" />
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">
                        {t('wordHunt.results.nextChallengeIn')}
                      </div>
                      <div className="text-2xl md:text-3xl font-black text-neo-cyan">
                        {countdown}
                      </div>
                    </div>
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
