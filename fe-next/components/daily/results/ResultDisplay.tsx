/**
 * ResultDisplay Component
 * Speedometer Gauge hero section — circular ring fills proportionally (score/1000)
 * with eye icon toggle for spoiler-free sharing.
 * Enhanced with dramatic entrances, ambient glow, and staggered choreography.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { m } from 'framer-motion';
import { Flame, Clock, Eye, EyeOff, Skull, Zap, Target, BookOpen, Sparkles, PartyPopper } from 'lucide-react';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import { isRonPrankUser, RON_PRANK_BONUS_POINTS } from '@/utils/dailyChallenge/ronPrank';
import { isMeaningDisplayableForLanguage } from '@/lib/dailyChallenge/wordMeaningPolicy';
import { fireConfetti } from '@/utils/confettiUtils';
import { ScoreGaugeRing } from './ScoreGaugeRing';
import { getScoreTier } from './scoreFeedbackTiers';
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
  /** Current player's id — drives the display-only Ron bonus easter egg. */
  currentUserId?: string | null;
  meaning?: string | null;
  t: (key: string) => string;
}

/** Max attainable daily score — the gauge + tier percentage are relative to this. */
const MAX_SCORE = 1000;

const COLOR_HEX: Record<string, string> = {
  'neo-lime': '#BFFF00',
  'neo-cyan': '#00FFFF',
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
  currentUserId,
  meaning,
  t,
}) => {
  const [wordHidden, setWordHidden] = useState(false);

  // Display-only easter egg: Ron sees a fake "jackpot" bonus chip. Real score,
  // streak, and leaderboard are untouched — see utils/dailyChallenge/ronPrank.
  const showRonBonus = solved && isRonPrankUser(currentUserId);

  const scoreBreakdown = useMemo(() =>
    getScoreBreakdown(lifeRemaining, attemptsUsed, wordsDiscovered, solved),
    [lifeRemaining, attemptsUsed, wordsDiscovered, solved]
  );

  // Praise + color theme are keyed to the SHARE of the score earned
  // (score / MAX_SCORE), not how few attempts were used — so a 490/1000 run
  // reads "rising", not the top tier. One tier drives both the badge and the
  // gauge ring for a coherent color theme.
  const scoreTier = getScoreTier(scoreBreakdown.total, MAX_SCORE);
  const gaugeColor = solved ? scoreTier.color : 'neo-pink';
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
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="w-full"
    >
      <div className="bg-neo-navy/90 rounded-neo-lg border-3 border-neo-black shadow-hard-lg overflow-hidden relative">
        {/* Ambient background glow matching score tier */}
        {solved && scoreBreakdown.total > 0 && (
          <m.div
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
        <div className="flex items-center justify-between px-4 py-2 bg-neo-navy/50 border-b border-slate-700/50 relative z-10">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
            {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))}
          </span>
          {streakDays > 0 && (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 15 }}
              className="flex items-center gap-1 text-orange-400"
            >
              <m.div
                animate={{ rotate: [0, -10, 10, -5, 0] }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <Flame className="w-3.5 h-3.5" />
              </m.div>
              <span className="text-xs font-bold">{streakDays}</span>
            </m.div>
          )}
        </div>

        {/* Main Content */}
        <div className="px-5 py-6 md:px-8 md:py-8 relative z-10">
          {solved ? (
            /* ===== WIN STATE — Speedometer Gauge ===== */
            <m.div
              onClick={handleTapCelebrate}
              className="cursor-pointer select-none flex flex-col items-center gap-5"
              whileTap={{ scale: 0.98 }}
            >
              {/* Hero Gauge Ring — dramatic slam-in entrance */}
              <m.div
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
              </m.div>

              {/* Score-tier badge — praise scales with the share of score earned */}
              <m.div
                initial={{ scale: 0, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 400, damping: 12 }}
                className="relative"
              >
                <div
                  data-testid={`score-tier-${scoreTier.id}`}
                  className={`inline-flex items-center gap-2 px-5 py-2 bg-linear-to-r ${scoreTier.gradient} rounded-neo border-3 border-neo-black shadow-hard`}
                  style={{ boxShadow: `0 0 20px ${scoreTier.glow}, 4px 4px 0px black` }}
                >
                  {scoreTier.id === 'legendary' && <Sparkles className="w-5 h-5 text-neo-black" />}
                  <span className="font-black text-neo-black text-lg uppercase tracking-wider">
                    {t(scoreTier.key)}
                  </span>
                  {scoreTier.id === 'legendary' && <Sparkles className="w-5 h-5 text-neo-black" />}
                </div>
                <div className="text-center mt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {attemptsUsed}/10
                  </span>
                </div>
              </m.div>

              {/* Target Word with Eye Toggle */}
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 26 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                  {t('wordHunt.results.targetWord')}
                </div>
                <div className="flex items-center gap-2 select-none">
                  <div className="flex gap-1 justify-center flex-wrap">
                    {wordHidden ? (
                      /* Hidden: dot placeholders */
                      displayedTargetWord.split('').map((_, i) => (
                        <m.span
                          key={`blank-${i}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.04 }}
                          className="inline-flex items-center justify-center w-8 h-10 bg-neo-navy-light rounded-neo border-2 border-slate-600 text-slate-500 font-black text-lg"
                        >
                          ?
                        </m.span>
                      ))
                    ) : (
                      /* Revealed: letter tiles with 3D flip effect */
                      displayedTargetWord.split('').map((letter, i) => (
                        <m.span
                          key={`letter-${i}-${letter}`}
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
                        </m.span>
                      ))
                    )}
                  </div>
                  {/* Eye toggle button */}
                  <button
                    type="button"
                    data-testid="word-visibility-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWordHidden(!wordHidden);
                    }}
                    className="p-1.5 rounded-lg hover:bg-neo-navy-light transition-colors text-slate-400 hover:text-slate-200 select-none"
                    aria-label={wordHidden ? 'Show word' : 'Hide word'}
                  >
                    {wordHidden ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </m.div>

              {/* Meaning (short definition) — prominent "did you know" card.
                  Guard against a mismatched-script gloss (e.g. an English
                  definition attached to a Hebrew target) leaking through from
                  stale DB rows — show it only when the script matches. */}
              {isMeaningDisplayableForLanguage(language, meaning) && (
                <m.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.55, type: 'spring', stiffness: 320, damping: 22 }}
                  className="w-full max-w-xs mx-auto"
                >
                  <div className="flex items-start gap-3 rounded-neo border-neo-thick border-black bg-neo-cyan/15 px-4 py-3 shadow-hard text-start">
                    <BookOpen className="w-5 h-5 text-neo-cyan shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-neo-cyan">
                        {t('wordHunt.results.meaning')}
                      </span>
                      <span className="text-base font-bold text-neo-cream leading-snug">
                        {meaning}
                      </span>
                    </div>
                  </div>
                </m.div>
              )}

              {/* Score breakdown chips — staggered pop-in */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { color: 'neo-cyan', icon: <Zap className="w-3.5 h-3.5 inline-block" />, value: scoreBreakdown.speed },
                  { color: 'neo-lime', icon: <Target className="w-3.5 h-3.5 inline-block" />, value: scoreBreakdown.accuracy },
                  { color: 'neo-pink', icon: <BookOpen className="w-3.5 h-3.5 inline-block" />, value: scoreBreakdown.exploration },
                ].map((chip, i) => (
                  <m.span
                    key={chip.color}
                    custom={i}
                    variants={chipVariants}
                    initial="hidden"
                    animate="visible"
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 text-xs font-bold ${CHIP_STYLES[chip.color]}`}
                  >
                    {chip.icon} +{chip.value}
                  </m.span>
                ))}
                {/* Display-only Ron easter egg — fake jackpot bonus chip. */}
                {showRonBonus && (
                  <m.span
                    data-testid="ron-bonus-chip"
                    custom={3}
                    variants={chipVariants}
                    initial="hidden"
                    animate="visible"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 text-xs font-black bg-neo-yellow/15 border-neo-yellow/40 text-neo-yellow shadow-hard-sm"
                  >
                    <PartyPopper className="w-3.5 h-3.5 inline-block" />
                    +{RON_PRANK_BONUS_POINTS.toLocaleString('en-US')}
                  </m.span>
                )}
              </div>

              {/* Tap to celebrate hint (mobile) */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="md:hidden text-[10px] text-slate-500"
              >
                {t('wordHunt.results.tapToCelebrate')}
              </m.div>

              {/* Countdown — slides up with glow */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, type: 'spring', stiffness: 300, damping: 26 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neo-navy-light/80 rounded-neo border-2 border-neo-black shadow-hard-sm"
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
              </m.div>
            </m.div>
          ) : (
            /* ===== FAIL STATE — Gauge at 0 with skull ===== */
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
              className="flex flex-col items-center gap-5"
            >
              {/* Gauge ring with 0 score — dramatic shake entrance */}
              <m.div
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
                  <m.div
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
                  </m.div>
                  <m.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="text-neo-pink font-black text-sm uppercase tracking-wider"
                  >
                    {t('wordHunt.results.gameOver')}
                  </m.span>
                </div>
              </m.div>

              {/* Attempts used — slam counter */}
              <m.div
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
              </m.div>

              {/* Better luck message */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-slate-400 font-medium text-sm text-center"
              >
                {t('wordHunt.results.betterLuckNextTime')}
              </m.div>

              {/* Countdown */}
              <m.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 26 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neo-navy-light/80 rounded-neo border-2 border-neo-black shadow-hard-sm"
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
              </m.div>
            </m.div>
          )}
        </div>
      </div>
    </m.div>
  );
};

export default ResultDisplay;
