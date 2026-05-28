'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
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
  gameMode: _gameMode,
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
  // LOSER — Slim Revenge Card
  // ============================================================
  if (currentPlayerRank > 1 && sortedScores.length > 1 && sortedScores[0] && currentPlayerData) {
    const winner = sortedScores[0];
    const prompt = getRevengePrompt(gapToWinner, winner.username, solvableWords.length, t);

    return (
      <m.section
        initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: revengeDelay }}
        className="bg-neo-gray border-2 border-black border-l-4 border-l-neo-pink p-4 rounded-neo shadow-hard-sm shadow-[0_0_15px_rgba(255,20,147,0.15)] relative animate-[borderShimmer_3s_ease-in-out_infinite]"
      >
        <div className="absolute inset-0 bg-neo-pink/5 rounded-neo pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          {/* VS badge: two overlapping avatars with pink diamond VS */}
          <div className="relative flex items-center justify-center w-20 h-10 shrink-0">
            <div className="absolute left-0 w-8 h-8 rounded-full border-2 border-black overflow-hidden z-10 shadow-hard-sm">
              <Avatar
                userId={currentPlayerData.username}
                customAvatar={currentPlayerData.avatar?.customAvatar}
                size="sm"
                className="w-full h-full"
              />
            </div>
            <m.div
              initial={reducedMotion ? undefined : { scale: 0, rotate: -135 }}
              animate={{ scale: 1, rotate: 45 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: revengeDelay + 0.2 }}
              className="relative z-30 bg-neo-pink border-2 border-black w-6 h-6 flex items-center justify-center shadow-hard-sm"
            >
              <span className="font-neo-display text-[9px] font-black text-white -rotate-45 leading-none">VS</span>
            </m.div>
            <div className="absolute right-0 w-8 h-8 rounded-full border-2 border-black overflow-hidden z-10 shadow-hard-sm">
              <Avatar
                userId={winner.username}
                customAvatar={winner.avatar?.customAvatar}
                size="sm"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">{prompt.title}</p>
            <p className="text-[10px] font-bold text-white uppercase mt-0.5 tracking-wide">
              {prompt.subtitle}
            </p>
            {/* Solvable words hint */}
            {solvableWords.length > 0 && solvableWords.length <= 4 && (
              <p className="text-[9px] font-bold text-white mt-0.5">
                {t('results.findingWouldHaveTied', {
                  words: solvableWords.map(w => w.word.toUpperCase()).join(` ${t('common.and')} `),
                })}
              </p>
            )}
          </div>

          {/* Action */}
          <m.button
            initial={reducedMotion ? undefined : { scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 14, delay: revengeDelay + 0.35 }}
            whileHover={{ scale: 1.08, rotate: 2 }}
            whileTap={{ scale: 0.92 }}
            className="shrink-0 bg-neo-pink px-3 py-2 border-2 border-black rounded-neo shadow-hard-sm text-[10px] font-black uppercase text-white"
          >
            {t('results.rematch')}
          </m.button>
        </div>
      </m.section>
    );
  }

  // ============================================================
  // WINNER — Defend Title Card (lime left border)
  // ============================================================
  if (currentPlayerRank === 1 && sortedScores.length > 1) {
    const runnerUp = sortedScores[1];
    const dominanceMargin = runnerUp ? currentPlayerData.score - runnerUp.score : 0;
    const prompt = runnerUp
      ? getDefendPrompt(dominanceMargin, runnerUp.username, t)
      : { title: t('results.defendTitle'), subtitle: '' };

    return (
      <m.section
        initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: revengeDelay }}
        className="bg-neo-gray border-2 border-black border-l-4 border-l-neo-lime p-4 rounded-neo shadow-hard-sm shadow-[0_0_15px_rgba(191,255,0,0.15)] relative"
      >
        <div className="flex items-center gap-4">
          {/* VS badge: two overlapping avatars with lime diamond */}
          <div className="relative flex items-center justify-center w-20 h-10 shrink-0">
            <div className="absolute left-0 w-8 h-8 rounded-full border-2 border-black overflow-hidden z-10 shadow-hard-sm">
              <Avatar
                userId={currentPlayerData.username}
                customAvatar={currentPlayerData.avatar?.customAvatar}
                size="sm"
                className="w-full h-full"
              />
            </div>
            <m.div
              initial={reducedMotion ? undefined : { scale: 0, rotate: -135 }}
              animate={{ scale: 1, rotate: 45 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: revengeDelay + 0.2 }}
              className="relative z-30 bg-neo-lime border-2 border-black w-6 h-6 flex items-center justify-center shadow-hard-sm"
            >
              <span className="font-neo-display text-[9px] font-black text-neo-black -rotate-45 leading-none">VS</span>
            </m.div>
            {runnerUp && (
              <div className="absolute right-0 w-8 h-8 rounded-full border-2 border-black overflow-hidden z-10 shadow-hard-sm">
                <Avatar
                  userId={runnerUp.username}
                  customAvatar={runnerUp.avatar?.customAvatar}
                  size="sm"
                  className="w-full h-full"
                />
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">{prompt.title}</p>
            <p className="text-[10px] font-bold text-white uppercase mt-0.5 tracking-wide">
              {prompt.subtitle}
            </p>
            {dominanceMargin > 0 && runnerUp && (
              <p className="text-[9px] font-bold text-neo-lime/60 mt-0.5 uppercase tracking-wide">
                +{dominanceMargin} {t('results.aheadOf', { player: runnerUp.username })}
              </p>
            )}
          </div>

          {/* Action */}
          <m.button
            initial={reducedMotion ? undefined : { scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 14, delay: revengeDelay + 0.35 }}
            whileHover={{ scale: 1.08, rotate: -2 }}
            whileTap={{ scale: 0.92 }}
            className="shrink-0 bg-neo-lime px-3 py-2 border-2 border-black rounded-neo shadow-hard-sm text-[10px] font-black uppercase text-neo-black"
          >
            {t('results.defendTitle')}
          </m.button>
        </div>
      </m.section>
    );
  }

  return null;
};

export default ResultsRevengeSection;
