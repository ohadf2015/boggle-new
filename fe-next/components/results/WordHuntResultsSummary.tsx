'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Heart, Clock, Skull, Shield, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { ScoreCountUp } from '@/components/results/shared';
import WordHuntTipBadge from './WordHuntTipBadge';

export interface WordHuntPlayerResult {
  username: string;
  score: number;
  survived: boolean;
  lifeRemaining: number;
  validWordCount?: number;
  invalidWordCount?: number;
  avgWordLength?: number;
  longestWordLength?: number;
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

  const formattedSurvivalTime = survivalTime >= 60
    ? `${Math.floor(survivalTime / 60)}:${String(survivalTime % 60).padStart(2, '0')}`
    : `${survivalTime}s`;

  const survivors = playerResults
    ?.filter((p) => p.survived)
    .sort((a, b) => b.score - a.score);
  const eliminated = playerResults
    ?.filter((p) => !p.survived)
    .sort((a, b) => b.score - a.score);

  const xSlide = dir === 'rtl' ? 20 : -20;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {/* Target word reveal — prominent hero display */}
      <motion.div
        variants={variant}
        className="flex flex-col items-center gap-2 p-4 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard border-t-4 border-t-purple-500"
      >
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-neo-yellow" />
          <span className="text-sm font-bold text-neo-cream/70 uppercase tracking-wide">{t('wordHunt.multiplayer.targetWord')}</span>
        </div>
        <motion.span
          initial={reducedMotion ? undefined : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: reducedMotion ? 0 : 0.2 }}
          className="text-3xl font-black text-neo-white tracking-widest font-neo-display uppercase"
        >
          {displayTargetWord}
        </motion.span>
        <motion.span
          initial={reducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: reducedMotion ? 0 : 0.4 }}
        >
          {foundTarget ? (
            isFirstFinder ? (
              <span className="px-3 py-1 text-xs font-bold bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black shadow-hard-sm">
                {t('wordHunt.multiplayer.firstFinder')}
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-bold bg-green-500 text-neo-black rounded-neo border-2 border-neo-black shadow-hard-sm">
                {t('wordHunt.multiplayer.found')}
              </span>
            )
          ) : (
            <span className="px-3 py-1 text-xs font-bold bg-red-500 text-neo-white rounded-neo border-2 border-neo-black shadow-hard-sm">
              {t('wordHunt.multiplayer.notFound')}
            </span>
          )}
        </motion.span>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={variant} className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
          <Clock className="w-5 h-5 text-neo-orange" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-neo-white">{formattedSurvivalTime}</span>
            <span className="text-xs text-neo-cream/70">{t('wordHunt.multiplayer.survivalTime')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
          <Heart className="w-5 h-5 text-neo-pink" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-neo-white tabular-nums">
              <ScoreCountUp to={discoveryWords} duration={1000} delay={reducedMotion ? 0 : 300} />
            </span>
            <span className="text-xs text-neo-cream/70">{t('wordHunt.multiplayer.discoveryWords')}</span>
          </div>
        </div>
      </motion.div>

      {/* Survivors section */}
      {survivors && survivors.length > 0 && (
        <motion.div variants={variant} className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-400 font-neo-display">
              {t('wordHunt.results.survivors')}
            </span>
          </div>
          <div className="space-y-1">
            {survivors.map((player, idx) => (
              <motion.div
                key={player.username}
                initial={reducedMotion ? undefined : { opacity: 0, x: xSlide }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 18, delay: reducedMotion ? 0 : 0.05 * idx }}
              >
                <PlayerRow
                  player={player}
                  isCurrentUser={player.username === currentUsername}
                  variant="survivor"
                  reducedMotion={!!reducedMotion}
                  tipStats={{
                    score: player.score,
                    survived: true,
                    lifeRemaining: player.lifeRemaining,
                    discoveryWords,
                    foundTarget,
                    isFirstFinder: isFirstFinder && player.username === currentUsername,
                    totalPlayers: (playerResults?.length ?? 0),
                    rank: idx + 1,
                    validWordCount: player.validWordCount ?? 0,
                    invalidWordCount: player.invalidWordCount ?? 0,
                    avgWordLength: player.avgWordLength ?? 0,
                    longestWordLength: player.longestWordLength ?? 0,
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Eliminated section */}
      {eliminated && eliminated.length > 0 && (
        <motion.div variants={variant} className="space-y-2">
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400 font-neo-display">
              {t('wordHunt.results.eliminated')}
            </span>
          </div>
          <div className="space-y-1">
            {eliminated.map((player, idx) => (
              <motion.div
                key={player.username}
                initial={reducedMotion ? undefined : { opacity: 0, x: 0 }}
                animate={reducedMotion ? { opacity: 0.7 } : {
                  opacity: 0.7,
                  x: dir === 'rtl' ? [0, 4, -4, 3, -3, 0] : [0, -4, 4, -3, 3, 0],
                }}
                transition={{
                  opacity: { duration: 0.2, delay: reducedMotion ? 0 : 0.05 * idx },
                  x: { duration: 0.4, delay: reducedMotion ? 0 : 0.05 * idx + 0.1, ease: 'easeOut' },
                }}
              >
                <PlayerRow
                  player={player}
                  isCurrentUser={player.username === currentUsername}
                  variant="eliminated"
                  reducedMotion={!!reducedMotion}
                  tipStats={{
                    score: player.score,
                    survived: false,
                    lifeRemaining: 0,
                    discoveryWords,
                    foundTarget,
                    isFirstFinder: false,
                    totalPlayers: (playerResults?.length ?? 0),
                    rank: (survivors?.length ?? 0) + (eliminated?.indexOf(player) ?? 0) + 1,
                    validWordCount: player.validWordCount ?? 0,
                    invalidWordCount: player.invalidWordCount ?? 0,
                    avgWordLength: player.avgWordLength ?? 0,
                    longestWordLength: player.longestWordLength ?? 0,
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function PlayerRow({
  player,
  isCurrentUser,
  variant,
  reducedMotion,
  tipStats,
}: {
  player: WordHuntPlayerResult;
  isCurrentUser: boolean;
  variant: 'survivor' | 'eliminated';
  reducedMotion: boolean;
  tipStats: import('./getWordHuntTip').WordHuntTipInput;
}) {
  const isSurvivor = variant === 'survivor';

  return (
    <div>
      <div
        data-testid={`player-row-${player.username}`}
        className={`flex items-center justify-between p-2 rounded-neo border-3 border-neo-black shadow-hard-sm ${
          isCurrentUser
            ? 'bg-neo-yellow/20 border-neo-yellow'
            : isSurvivor
            ? 'bg-green-900/30'
            : 'bg-red-900/20 opacity-70'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isSurvivor && <Skull className="w-4 h-4 text-red-400 flex-shrink-0" />}
          <span
            className={`text-sm font-bold truncate ${
              isCurrentUser ? 'text-neo-yellow' : 'text-neo-white'
            }`}
          >
            {player.username}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isSurvivor && (
            <div
              role="progressbar"
              aria-valuenow={player.lifeRemaining}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-12 sm:w-16 h-2 bg-neo-black/50 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-green-400 rounded-full"
                initial={reducedMotion ? { width: `${player.lifeRemaining}%` } : { width: '0%' }}
                animate={{ width: `${player.lifeRemaining}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut', delay: reducedMotion ? 0 : 0.3 }}
              />
            </div>
          )}
          <span className="text-sm font-bold text-neo-white tabular-nums">
            <ScoreCountUp to={player.score} duration={1000} delay={reducedMotion ? 0 : 200} />
          </span>
        </div>
      </div>
      {isCurrentUser && <WordHuntTipBadge stats={tipStats} />}
    </div>
  );
}
