'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Skull } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { ScoreCountUp } from '@/components/results/shared';
import WordHuntTipBadge from './WordHuntTipBadge';
import Avatar from '../Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface WordHuntPlayerResult {
  username: string;
  score: number;
  survived: boolean;
  lifeRemaining: number;
  validWordCount?: number;
  invalidWordCount?: number;
  avgWordLength?: number;
  longestWordLength?: number;
  avatar?: { customAvatar?: CustomAvatarConfig | null };
}

interface WordHuntResultsSummaryProps {
  targetWord: string;
  foundTarget: boolean;
  isFirstFinder: boolean;
  survivalTime: number;
  discoveryWords: number;
  playerResults?: WordHuntPlayerResult[];
  currentUsername?: string;
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
  },
};

const fadeOnly = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

function formatSurvivalTime(seconds: number): string {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

export default function WordHuntResultsSummary({
  targetWord,
  foundTarget,
  isFirstFinder,
  survivalTime,
  discoveryWords,
  playerResults,
  currentUsername,
}: WordHuntResultsSummaryProps) {
  const { t, language, dir } = useLanguage();
  const reducedMotion = useReducedMotion();
  const variant = reducedMotion ? fadeOnly : fadeSlide;

  const displayTargetWord = language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord;

  const formattedSurvivalTime = formatSurvivalTime(survivalTime);

  const survivors = playerResults
    ?.filter((p) => p.survived)
    .sort((a, b) => b.score - a.score);
  const eliminated = playerResults
    ?.filter((p) => !p.survived)
    .sort((a, b) => b.score - a.score);

  // Current player data for highlights
  const currentPlayer = playerResults?.find(p => p.username === currentUsername);
  const currentValidWords = currentPlayer?.validWordCount ?? 0;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Elimination History — eliminated players with order and word counts */}
      {eliminated && eliminated.length > 0 && (
        <motion.section variants={variant} className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Skull className="w-3 h-3 text-neo-red/60" />
            <h3 className="text-[10px] font-bold text-neo-red/60 uppercase tracking-widest">
              {t('wordHunt.results.eliminationHistory') || 'Elimination History'}
            </h3>
          </div>

          <div className="divide-y divide-white/5">
            {eliminated.map((player, idx) => {
              const isCurrentUser = player.username === currentUsername;
              const eliminationOrder = eliminated.length - idx; // Last eliminated = highest order
              const wordCount = player.validWordCount ?? 0;

              return (
                <motion.div
                  key={player.username}
                  initial={reducedMotion ? undefined : { opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
                  animate={{ opacity: isCurrentUser ? 1 : 0.7, x: 0 }}
                  transition={{ type: 'spring', stiffness: 150, damping: 18, delay: reducedMotion ? 0 : 0.05 * idx }}
                  className="flex items-center justify-between py-3 px-2"
                  data-testid={`eliminated-row-${player.username}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white/20 w-6">
                      {t('wordHunt.results.eliminatedOrder', { order: eliminationOrder }) || `#${eliminationOrder}`}
                    </span>
                    <div className="relative">
                      <div className={`w-9 h-9 rounded-full border-2 ${
                        isCurrentUser ? 'border-neo-red shadow-hard-sm' : 'border-white/10'
                      } overflow-hidden shrink-0 ${isCurrentUser ? 'opacity-80' : 'opacity-50'} grayscale`}>
                        <div className="w-full h-full bg-neo-gray flex items-center justify-center">
                          <Skull className="w-4 h-4 text-neo-red/60" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold truncate ${
                          isCurrentUser ? 'text-white' : 'text-white/60'
                        }`}>
                          {player.username}
                          {isCurrentUser && (
                            <span className="text-neo-pink ms-1">
                              ({t('results.you') || 'YOU'})
                            </span>
                          )}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black ${
                        isCurrentUser ? 'text-neo-pink' : 'text-white/30'
                      }`}>
                        {t('wordHunt.multiplayer.survivalTime') || 'Survival'}: {formatSurvivalTime(Math.round(survivalTime * (1 - idx * 0.2)))}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      isCurrentUser ? 'text-white/40' : 'text-white/20'
                    }`}>
                      {wordCount} {t('results.words') || 'Words'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Current user tip */}
          {currentPlayer && !currentPlayer.survived && (
            <WordHuntTipBadge stats={{
              score: currentPlayer.score,
              survived: false,
              lifeRemaining: 0,
              discoveryWords,
              foundTarget,
              isFirstFinder: false,
              totalPlayers: playerResults?.length ?? 0,
              rank: (survivors?.length ?? 0) + (eliminated?.indexOf(currentPlayer) ?? 0) + 1,
              validWordCount: currentPlayer.validWordCount ?? 0,
              invalidWordCount: currentPlayer.invalidWordCount ?? 0,
              avgWordLength: currentPlayer.avgWordLength ?? 0,
              longestWordLength: currentPlayer.longestWordLength ?? 0,
            }} />
          )}
        </motion.section>
      )}

      {/* Highlights Bar — Survival, Words, Best Word */}
      <motion.section
        variants={variant}
        className="flex justify-between items-center py-4 px-4 sm:px-6 bg-neo-gray/20 rounded-neo-lg border border-white/5"
      >
        <div className="text-center flex-1">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">
            {t('wordHunt.multiplayer.survivalTime') || 'Survival'}
          </p>
          <span className="text-sm font-black text-neo-cyan tabular-nums">{formattedSurvivalTime}</span>
        </div>
        <div className="w-px h-6 bg-white/10 shrink-0" />
        <div className="text-center flex-1">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">
            {t('results.words') || 'Words'}
          </p>
          <span className="text-sm font-black text-neo-lime tabular-nums">
            <ScoreCountUp to={currentValidWords || discoveryWords} duration={800} delay={reducedMotion ? 0 : 200} />
          </span>
        </div>
        <div className="w-px h-6 bg-white/10 shrink-0" />
        <div className="text-center flex-1">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">
            {t('wordHunt.multiplayer.targetWord') || 'Target'}
          </p>
          <span className="text-sm font-black text-neo-pink uppercase font-neo-display">
            {displayTargetWord}
          </span>
        </div>
      </motion.section>

      {/* Match Summary — all players with status and word counts */}
      {playerResults && playerResults.length > 0 && (
      <motion.section variants={variant} className="space-y-3">
        <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] px-2">
          {t('wordHunt.results.matchSummary') || 'Match Summary'}
        </h3>
        <div className="space-y-2">
          {/* Survivors first */}
          {survivors?.map((player) => {
            const isCurrentUser = player.username === currentUsername;
            const wordCount = player.validWordCount ?? 0;
            const isWinner = survivors.indexOf(player) === 0;

            return (
              <motion.div
                key={player.username}
                initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={`flex items-center gap-3 sm:gap-4 p-3 rounded-neo border-2 border-neo-black shadow-hard-sm ${
                  isCurrentUser
                    ? 'bg-neo-lime/10 border-neo-lime/30'
                    : 'bg-neo-lime/5'
                }`}
                data-testid={`match-summary-${player.username}`}
              >
                <div className="relative shrink-0">
                  <Avatar
                    customAvatar={player.avatar?.customAvatar}
                    userId={player.username}
                    size="sm"
                  />
                  {isWinner && (
                    <div className="absolute -top-1 -inset-e-1 text-[8px] font-black bg-neo-lime text-neo-black rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-hard-sm">
                      👑
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black uppercase tracking-tight truncate ${
                    isCurrentUser ? 'text-neo-lime' : 'text-white'
                  }`}>
                    {player.username}
                    {isCurrentUser && (
                      <span className="text-neo-lime/70 ms-1 text-xs">
                        ({t('results.you') || 'YOU'})
                      </span>
                    )}
                  </p>
                  <p className="text-[9px] font-bold text-neo-lime/80 uppercase">
                    {t('wordHunt.results.survived') || 'SURVIVED'} • {wordCount} {t('results.words') || 'WORDS'}
                  </p>
                </div>
                <span className="text-[10px] font-black text-white/40 uppercase shrink-0">
                  {isWinner ? (t('results.winner') || 'Winner') : `${Math.round(player.lifeRemaining)}%`}
                </span>
              </motion.div>
            );
          })}

          {/* Eliminated players */}
          {eliminated?.map((player, idx) => {
            const isCurrentUser = player.username === currentUsername;
            const wordCount = player.validWordCount ?? 0;
            const eliminationOrder = eliminated.length - idx;

            return (
              <motion.div
                key={player.username}
                initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: reducedMotion ? 0 : 0.03 * idx }}
                className={`flex items-center gap-3 sm:gap-4 p-3 rounded-neo border-2 border-neo-black ${
                  isCurrentUser ? 'bg-neo-red/10 border-neo-red/20' : 'bg-neo-red/5'
                }`}
                data-testid={`match-summary-${player.username}`}
              >
                <div className="relative shrink-0">
                  <div className="opacity-50 grayscale">
                    <Avatar
                      customAvatar={player.avatar?.customAvatar}
                      userId={player.username}
                      size="sm"
                    />
                  </div>
                  <div className="absolute -bottom-0.5 -inset-e-0.5 flex items-center justify-center">
                    <Skull className="w-3 h-3 text-neo-red" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black uppercase tracking-tight truncate ${
                    isCurrentUser ? 'text-white' : 'text-white/60'
                  }`}>
                    {player.username}
                    {isCurrentUser && (
                      <span className="text-neo-pink ms-1 text-xs">
                        ({t('results.you') || 'YOU'})
                      </span>
                    )}
                  </p>
                  <p className="text-[9px] font-bold text-white/30 uppercase">
                    {t('results.eliminated') || 'ELIMINATED'} • {wordCount} {t('results.words') || 'WORDS'}
                  </p>
                </div>
                <span className="text-[10px] font-black text-white/20 uppercase shrink-0">
                  {t('wordHunt.results.outOrder', { order: eliminationOrder }) || `Out #${eliminationOrder}`}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
      )}

      {/* Survived current user tip */}
      {currentPlayer && currentPlayer.survived && (
        <motion.div variants={variant}>
          <WordHuntTipBadge stats={{
            score: currentPlayer.score,
            survived: true,
            lifeRemaining: currentPlayer.lifeRemaining,
            discoveryWords,
            foundTarget,
            isFirstFinder: isFirstFinder && currentPlayer.username === currentUsername,
            totalPlayers: playerResults?.length ?? 0,
            rank: (survivors?.indexOf(currentPlayer) ?? 0) + 1,
            validWordCount: currentPlayer.validWordCount ?? 0,
            invalidWordCount: currentPlayer.invalidWordCount ?? 0,
            avgWordLength: currentPlayer.avgWordLength ?? 0,
            longestWordLength: currentPlayer.longestWordLength ?? 0,
          }} />
        </motion.div>
      )}
    </motion.div>
  );
}
