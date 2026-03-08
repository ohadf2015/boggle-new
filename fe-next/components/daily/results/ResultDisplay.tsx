/**
 * ResultDisplay Component
 * Speedometer Gauge hero section — circular ring fills proportionally (score/1000)
 * with eye icon toggle for spoiler-free sharing.
 * Enhanced with dramatic entrances, ambient glow, and staggered choreography.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock, Eye, EyeOff, Skull, Zap, Target, BookOpen } from 'lucide-react';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import { fireConfetti } from '@/utils/confettiUtils';
import { ScoreGaugeRing } from './ScoreGaugeRing';
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

/** Score tier accent colors for the gauge ring */
function getGaugeColor(score: number): 'neo-lime' | 'neo-yellow' | 'neo-orange' | 'neo-pink' {
  if (score >= 800) return 'neo-lime';
  if (score >= 600) return 'neo-yellow';
  if (score >= 400) return 'neo-orange';
  return 'neo-pink';
}

const COLOR_HEX: Record<string, string> = {
  'neo-lime': '#BFFF00',
  'neo-yellow': '#FFE135',
  'neo-orange': '#FF6B35',
  'neo-pink': '#FF1493',
};

/** Static chip style map — Tailwind JIT needs complete class strings */
const CHIP_STYLES: Record<string, string> = {
  'neo-cyan': 'bg-neo-cyan/10 border-neo-cyan/30 text-neo-cyan shadow-hard-sm',
  'neo-lime': 'bg-neo-lime/10 border-neo-lime/30 text-neo-lime shadow-hard-sm',
  'neo-pink': 'bg-neo-pink/10 border-neo-pink/30 text-neo-pink shadow-hard-sm',
};

/** Chip entrance variant: staggered slide-up with scale pop */
const chipVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.7 + i * 0.1,
      type: 'spring' as const,
      stiffness: 400,
      damping: 20,
    },
  }),
};

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
  const [wordHidden, setWordHidden] = useState(false);

  const scoreBreakdown = useMemo(() =>
    getScoreBreakdown(lifeRemaining, attemptsUsed, wordsDiscovered, solved),
    [lifeRemaining, attemptsUsed, wordsDiscovered, solved]
  );

  const gaugeColor = solved ? getGaugeColor(scoreBreakdown.total) : 'neo-pink';
  const glowHex = COLOR_HEX[gaugeColor] || '#BFFF00';

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
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="w-full"
    >
      <div className="bg-neo-navy/90 rounded-neo-lg border-3 border-neo-black shadow-hard-lg overflow-hidden relative">
        {/* Ambient background glow matching score tier */}
        {solved && scoreBreakdown.total > 0 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1.5 }}
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${glowHex}26 0%, ${glowHex}12 40%, transparent 70%)`,
            }}
          />
        )}

        {/* Compact Header — Puzzle # and Streak */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-700/50 relative z-10">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
            {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))}
          </span>
          {streakDays > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 15 }}
              className="flex items-center gap-1 text-orange-400"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 0] }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <Flame className="w-3.5 h-3.5" />
              </motion.div>
              <span className="text-xs font-bold">{streakDays}</span>
            </motion.div>
          )}
        </div>

        {/* Main Content */}
        <div className="px-5 py-6 md:px-8 md:py-8 relative z-10">
          {solved ? (
            /* ===== WIN STATE — Speedometer Gauge ===== */
            <motion.div
              onClick={handleTapCelebrate}
              className="cursor-pointer select-none flex flex-col items-center gap-5"
              whileTap={{ scale: 0.98 }}
            >
              {/* Hero Gauge Ring — dramatic slam-in entrance */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 250,
                  damping: 14,
                  delay: 0.1,
                }}
              >
                <ScoreGaugeRing
                  score={scoreBreakdown.total}
                  maxScore={1000}
                  size={200}
                  strokeWidth={14}
                  color={gaugeColor}
                  delay={0.3}
                />
              </motion.div>

              {/* Target Word with Eye Toggle */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 26 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                  {t('wordHunt.results.targetWord')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 justify-center flex-wrap">
                    {wordHidden ? (
                      /* Hidden: dot placeholders */
                      displayedTargetWord.split('').map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.04 }}
                          className="inline-flex items-center justify-center w-8 h-10 bg-slate-800 rounded-neo border-2 border-slate-600 text-slate-500 font-black text-lg"
                        >
                          ?
                        </motion.span>
                      ))
                    ) : (
                      /* Revealed: letter tiles with 3D flip effect */
                      displayedTargetWord.split('').map((letter, i) => (
                        <motion.span
                          key={i}
                          data-testid={`letter-${letter}`}
                          initial={{ scale: 0, rotateY: -90, opacity: 0 }}
                          animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 15,
                            delay: 0.5 + i * 0.1,
                          }}
                          className="inline-flex items-center justify-center w-8 h-10 bg-neo-lime/20 rounded-neo border-2 border-neo-lime/40 text-neo-lime font-black text-lg"
                          style={{ perspective: '400px' }}
                        >
                          {letter}
                        </motion.span>
                      ))
                    )}
                  </div>
                  {/* Eye toggle button */}
                  <button
                    data-testid="word-visibility-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWordHidden(!wordHidden);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
                    aria-label={wordHidden ? 'Show word' : 'Hide word'}
                  >
                    {wordHidden ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Score breakdown chips — staggered pop-in */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { color: 'neo-cyan', icon: <Zap className="w-3.5 h-3.5 inline-block" />, value: scoreBreakdown.speed },
                  { color: 'neo-lime', icon: <Target className="w-3.5 h-3.5 inline-block" />, value: scoreBreakdown.accuracy },
                  { color: 'neo-pink', icon: <BookOpen className="w-3.5 h-3.5 inline-block" />, value: scoreBreakdown.exploration },
                ].map((chip, i) => (
                  <motion.span
                    key={chip.color}
                    custom={i}
                    variants={chipVariants}
                    initial="hidden"
                    animate="visible"
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 text-xs font-bold ${CHIP_STYLES[chip.color]}`}
                  >
                    {chip.icon} +{chip.value}
                  </motion.span>
                ))}
              </div>

              {/* Tap to celebrate hint (mobile) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="md:hidden text-[10px] text-slate-500"
              >
                {t('wordHunt.results.tapToCelebrate')}
              </motion.div>

              {/* Countdown — slides up with glow */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, type: 'spring', stiffness: 300, damping: 26 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-neo border-2 border-neo-black shadow-hard-sm"
              >
                <Clock className="w-4 h-4 text-neo-cyan" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    {t('wordHunt.results.nextChallengeIn')}
                  </div>
                  <div className="text-lg font-black text-neo-cyan -mt-0.5">
                    {countdown}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* ===== FAIL STATE — Gauge at 0 with skull ===== */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
              className="flex flex-col items-center gap-5"
            >
              {/* Gauge ring with 0 score — dramatic shake entrance */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 250,
                  damping: 14,
                  delay: 0.1,
                }}
                className="relative"
                style={{ width: 180, height: 180 }}
              >
                <ScoreGaugeRing
                  score={0}
                  maxScore={1000}
                  size={180}
                  strokeWidth={12}
                  color="neo-pink"
                  delay={0.3}
                  showScore={false}
                />
                {/* Skull overlay with dramatic entrance */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{
                      scale: [0, 1.3, 1],
                      rotate: [-30, 5, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      delay: 0.5,
                      times: [0, 0.6, 1],
                    }}
                  >
                    <Skull className="w-12 h-12 text-neo-pink mb-1" />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="text-neo-pink font-black text-sm uppercase tracking-wider"
                  >
                    {t('wordHunt.results.gameOver')}
                  </motion.span>
                </div>
              </motion.div>

              {/* Attempts used — slam counter */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 18 }}
                className="text-center"
              >
                <div className="text-4xl font-black text-slate-400 tracking-tight">
                  {attemptsUsed}<span className="text-slate-600">/10</span>
                </div>
                <div className="text-xs text-slate-500 uppercase font-medium mt-1">
                  {t('wordHunt.results.attemptsUsed')}
                </div>
              </motion.div>

              {/* Better luck message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-slate-400 font-medium text-sm text-center"
              >
                {t('wordHunt.results.betterLuckNextTime')}
              </motion.div>

              {/* Countdown */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 26 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-neo border-2 border-neo-black shadow-hard-sm"
              >
                <Clock className="w-4 h-4 text-neo-cyan" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    {t('wordHunt.results.nextChallengeIn')}
                  </div>
                  <div className="text-lg font-black text-neo-cyan -mt-0.5">
                    {countdown}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ResultDisplay;
