'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Swords, Flame, Zap, Target } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { Player } from '@/components/results/types';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface ResultsRevengeSectionProps {
  sortedScores: Player[];
  currentPlayerData: Player;
  currentPlayerRank: number;
  gapToWinner: number;
  gameMode?: string;
  reducedMotion: boolean | null;
  revengeDelay: number;
  t: TFunction;
  /** Words found by others that this player missed — used to frame gap as solvable */
  missedWords?: Array<{ word: string; score: number; foundBy: string[] }>;
}

// ============================================================
// WITTY REVENGE PROMPTS — creative, sassy, motivating
// ============================================================

function getRevengePrompt(
  gapToWinner: number,
  winnerName: string,
  solvableWordCount: number,
  t: TFunction,
): { title: string; subtitle: string } {
  // Extremely close (1-5 pts)
  if (gapToWinner <= 5) {
    return {
      title: t('results.revenge.breathingDown'),
      subtitle: t('results.revenge.oneWordAway', { player: winnerName }),
    };
  }
  // Close (6-20 pts)
  if (gapToWinner <= 20) {
    return {
      title: t('results.revenge.unfinishedBusiness'),
      subtitle: solvableWordCount <= 2
        ? t('results.revenge.twoWordsFromGlory', { player: winnerName })
        : t('results.revenge.nextTimeItsPersonal', { player: winnerName }),
    };
  }
  // Moderate (21-50 pts)
  if (gapToWinner <= 50) {
    return {
      title: t('results.revenge.runItBack'),
      subtitle: t('results.revenge.theyGotLucky', { player: winnerName }),
    };
  }
  // Large gap (51+)
  return {
    title: t('results.revenge.comebackArc'),
    subtitle: t('results.revenge.everyVillainNeedsOrigin', { player: winnerName }),
  };
}

function getDefendPrompt(
  dominanceMargin: number,
  runnerUpName: string,
  t: TFunction,
): { title: string; subtitle: string } {
  if (dominanceMargin >= 50) {
    return {
      title: t('results.defend.untouchable'),
      subtitle: t('results.defend.theyNeedAPlan', { player: runnerUpName }),
    };
  }
  if (dominanceMargin >= 20) {
    return {
      title: t('results.defend.staySharp'),
      subtitle: t('results.defend.theyreStudying', { player: runnerUpName }),
    };
  }
  return {
    title: t('results.defend.thinIce'),
    subtitle: t('results.defend.comingForYou', { player: runnerUpName }),
  };
}

export const ResultsRevengeSection: React.FC<ResultsRevengeSectionProps> = ({
  sortedScores,
  currentPlayerData,
  currentPlayerRank,
  gapToWinner,
  gameMode,
  reducedMotion,
  revengeDelay,
  t,
  missedWords,
}) => {
  // Calculate solvable words (memoized)
  const solvableWords = useMemo(() => {
    if (!missedWords || gapToWinner <= 0) return [];
    const sorted = [...missedWords].sort((a, b) => b.score - a.score);
    const result: Array<{ word: string; score: number }> = [];
    let accumulated = 0;
    for (const w of sorted) {
      if (accumulated >= gapToWinner) break;
      result.push({ word: w.word, score: w.score });
      accumulated += w.score;
    }
    return result;
  }, [missedWords, gapToWinner]);

  // ============================================================
  // LOSER — 1v1 Revenge Card (dramatic, witty, personal)
  // ============================================================
  if (currentPlayerRank > 1 && sortedScores.length > 1 && sortedScores[0] && currentPlayerData) {
    const winner = sortedScores[0];
    const prompt = getRevengePrompt(gapToWinner, winner.username, solvableWords.length, t);
    const isWordHunt = gameMode === 'word-hunt';

    return (
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 16, delay: revengeDelay }}
        className="relative overflow-hidden"
      >
        {/* Outer container with animated border pulse */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-800/95 to-neo-pink/10 border-3 border-neo-pink/60 shadow-hard-xl p-4 sm:p-6 relative overflow-hidden">

          {/* Animated border glow */}
          {!reducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-[1]"
              animate={{
                boxShadow: [
                  'inset 0 0 0px transparent',
                  'inset 0 0 30px rgba(255,20,147,0.15)',
                  'inset 0 0 0px transparent',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Diagonal battle stripes */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 12px, #fff 12px, #fff 14px)' }}
          />

          {/* FIGHT CARD HEADER */}
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: revengeDelay + 0.1 }}
            className="relative z-10 text-center mb-4 sm:mb-5"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-neo-pink" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-neo-pink/70">
                {t('results.revenge.header')}
              </span>
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-neo-pink" />
            </div>
            <h3 className="font-neo-display text-xl sm:text-2xl text-neo-cream uppercase tracking-tight leading-none">
              {prompt.title}
            </h3>
          </motion.div>

          {/* 1v1 FACE-OFF */}
          <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-5">
            {/* YOUR side */}
            <motion.div
              initial={reducedMotion ? undefined : { x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: revengeDelay + 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-1.5 sm:gap-2"
            >
              <div className="relative">
                <div className="border-3 border-neo-cyan rounded-full shadow-hard bg-slate-900 overflow-hidden">
                  <Avatar
                    avatarImage={currentPlayerData.avatar?.avatarImage}
                    customAvatar={currentPlayerData.avatar?.customAvatar}
                    size="lg"
                    className="w-14 h-14 sm:w-16 sm:h-16"
                  />
                </div>
                {/* Score tag */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-neo-cyan text-neo-black px-2 py-0.5 border-2 border-neo-black text-[9px] sm:text-[10px] font-black whitespace-nowrap shadow-hard-sm">
                  {currentPlayerData.score}
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-black uppercase text-neo-cyan mt-1">
                {t('results.you')}
              </span>
            </motion.div>

            {/* VS badge — dramatic, pulsing */}
            <motion.div
              initial={reducedMotion ? undefined : { scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: revengeDelay + 0.35, type: 'spring', stiffness: 300, damping: 12 }}
              className="relative shrink-0"
            >
              <motion.div
                animate={!reducedMotion ? { scale: [1, 1.12, 1], rotate: [0, 3, -3, 0] } : undefined}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="bg-neo-pink border-3 border-neo-black w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-hard-lg"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <span className="font-neo-display text-neo-black text-lg sm:text-2xl font-black">VS</span>
              </motion.div>
              {/* Spark lines */}
              {!reducedMotion && (
                <>
                  <motion.div
                    className="absolute -top-1 -start-1 text-neo-orange"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                  >
                    <Zap className="w-3 h-3" />
                  </motion.div>
                  <motion.div
                    className="absolute -bottom-1 -end-1 text-neo-orange"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
                  >
                    <Zap className="w-3 h-3" />
                  </motion.div>
                </>
              )}
            </motion.div>

            {/* WINNER side */}
            <motion.div
              initial={reducedMotion ? undefined : { x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: revengeDelay + 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-1.5 sm:gap-2"
            >
              <div className="relative">
                <div className="border-3 border-neo-lime rounded-full shadow-hard bg-slate-900 overflow-hidden">
                  <Avatar
                    avatarImage={winner.avatar?.avatarImage}
                    customAvatar={winner.avatar?.customAvatar}
                    size="lg"
                    className="w-14 h-14 sm:w-16 sm:h-16"
                  />
                </div>
                {/* Score tag */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-neo-lime text-neo-black px-2 py-0.5 border-2 border-neo-black text-[9px] sm:text-[10px] font-black whitespace-nowrap shadow-hard-sm">
                  {winner.score}
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-black uppercase text-neo-lime mt-1 truncate max-w-[70px] sm:max-w-[90px]">
                {winner.username}
              </span>
            </motion.div>
          </div>

          {/* WITTY SUBTITLE + GAP */}
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: revengeDelay + 0.45, type: 'spring', stiffness: 200, damping: 18 }}
            className="relative z-10 text-center space-y-2"
          >
            <p className="text-sm sm:text-base font-bold text-neo-cream/80 italic">
              &ldquo;{prompt.subtitle}&rdquo;
            </p>

            {/* Gap callout */}
            {!isWordHunt && gapToWinner > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-neo-pink/15 border-2 border-neo-pink/30 px-3 py-1.5 rounded-neo">
                <Target className="w-3.5 h-3.5 text-neo-pink" />
                <span className="text-xs font-black uppercase text-neo-pink tracking-wider">
                  {t('results.pointsBehind', { points: gapToWinner })}
                </span>
              </div>
            )}

            {isWordHunt && (
              <div className="inline-flex items-center gap-1.5 bg-neo-pink/15 border-2 border-neo-pink/30 px-3 py-1.5 rounded-neo">
                <Target className="w-3.5 h-3.5 text-neo-pink" />
                <span className="text-xs font-black uppercase text-neo-pink tracking-wider">
                  {t('results.surviveLongerThan', { player: winner.username })}
                </span>
              </div>
            )}

            {/* Solvable words hint */}
            {solvableWords.length > 0 && solvableWords.length <= 4 && (
              <p className="text-[10px] sm:text-xs font-bold text-neo-cream/50 mt-1">
                {t('results.findingWouldHaveTied', {
                  words: solvableWords.map(w => w.word.toUpperCase()).join(` ${t('common.and')} `),
                })}
              </p>
            )}
          </motion.div>

          {/* Mascot motivator */}
          {!reducedMotion && (
            <motion.div
              className="absolute -bottom-1 -end-1 opacity-25 pointer-events-none"
              animate={{ y: [0, -4, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mascot/flexing-nobg.gif" alt="" width={56} height={56} className="object-contain" loading="eager" />
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  // ============================================================
  // WINNER — Defend Title Card (enhanced, witty)
  // ============================================================
  if (currentPlayerRank === 1 && sortedScores.length > 1) {
    const runnerUp = sortedScores[1];
    const dominanceMargin = runnerUp ? currentPlayerData.score - runnerUp.score : 0;
    const prompt = runnerUp
      ? getDefendPrompt(dominanceMargin, runnerUp.username, t)
      : { title: t('results.defendTitle'), subtitle: '' };

    return (
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16, delay: revengeDelay }}
        className="relative overflow-hidden"
      >
        <div className="bg-gradient-to-br from-neo-lime/15 via-slate-800/95 to-neo-lime/5 border-3 border-neo-lime/50 shadow-hard-xl p-4 sm:p-5 relative overflow-hidden">
          {/* Shimmer sweep */}
          {!reducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(191,255,0,0.1) 50%, transparent 65%)', backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
              transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
            />
          )}

          {/* Halftone texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:8px_8px]" />

          <div className="relative z-10 flex items-center gap-3 sm:gap-4">
            {/* Avatar with crown glow */}
            <motion.div
              animate={!reducedMotion ? {
                boxShadow: ['0 0 0px var(--neo-lime)', '0 0 20px var(--neo-lime)', '0 0 0px var(--neo-lime)'],
              } : undefined}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="border-3 border-neo-lime rounded-full shadow-hard bg-slate-900 overflow-hidden shrink-0"
            >
              <Avatar
                avatarImage={currentPlayerData.avatar?.avatarImage}
                customAvatar={currentPlayerData.avatar?.customAvatar}
                size="lg"
                className="w-14 h-14 sm:w-16 sm:h-16"
              />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-neo-lime shrink-0" />
                <span className="font-neo-display text-base sm:text-lg uppercase text-neo-lime leading-none">
                  {prompt.title}
                </span>
              </div>
              {prompt.subtitle && (
                <p className="text-xs sm:text-sm font-bold text-neo-cream/60 italic">
                  &ldquo;{prompt.subtitle}&rdquo;
                </p>
              )}
              {dominanceMargin > 0 && runnerUp && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Flame className="w-3.5 h-3.5 text-neo-orange" />
                  <span className="text-[10px] sm:text-xs font-black uppercase text-neo-orange">
                    +{dominanceMargin} {t('results.aheadOf', { player: runnerUp.username })}
                  </span>
                </div>
              )}
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot/trophy-nobg.gif" alt="" width={44} height={44} className="object-contain shrink-0" loading="eager" />
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default ResultsRevengeSection;
