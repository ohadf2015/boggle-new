'use client';

import { m, useReducedMotion } from 'framer-motion';
import { Skull } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import WordHuntTipBadge from './WordHuntTipBadge';
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

export interface WordHuntResultsSummaryProps {
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
  targetWord: _targetWord,
  foundTarget,
  isFirstFinder,
  survivalTime,
  discoveryWords,
  playerResults,
  currentUsername,
}: WordHuntResultsSummaryProps) {
  const { t, dir } = useLanguage();
  const reducedMotion = useReducedMotion();
  const variant = reducedMotion ? fadeOnly : fadeSlide;

  const formattedSurvivalTime = formatSurvivalTime(survivalTime);

  const survivors = playerResults
    ?.filter((p) => p.survived)
    .sort((a, b) => b.score - a.score);
  const eliminated = playerResults
    ?.filter((p) => !p.survived)
    .sort((a, b) => b.score - a.score);

  const currentPlayer = playerResults?.find(p => p.username === currentUsername);

  return (
    <m.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Survival highlight — unique to WHRS, not shown elsewhere.
          Target word, found-state, and words-found count are owned by
          ResultsHeroSection + HighlightsBar to avoid triple display. */}
      <m.section
        variants={variant}
        className="flex justify-center items-center py-4 px-4 sm:px-6 bg-neo-gray/20 rounded-neo-lg border border-white/5"
      >
        <div className="text-center">
          <p className="text-[8px] font-black text-white uppercase tracking-widest mb-1">
            {t('wordHunt.multiplayer.survivalTime') || 'Survival'}
          </p>
          <span className="text-sm font-black text-neo-cyan tabular-nums">{formattedSurvivalTime}</span>
        </div>
      </m.section>

      {/* Elimination History — unique data: order eliminated. Player rows
          (avatar/score/winner) are already covered by ResultsPodium +
          ConsolationRows above the fold; this strip adds only the order chip. */}
      {eliminated && eliminated.length > 0 && (
        <m.section variants={variant} className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Skull className="w-3 h-3 text-neo-red/60" />
            <h3 className="text-[10px] font-bold text-neo-red/60 uppercase tracking-widest">
              {t('wordHunt.results.eliminationHistory') || 'Elimination History'}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 px-2">
            {eliminated.map((player, idx) => {
              const isCurrentUser = player.username === currentUsername;
              const eliminationOrder = eliminated.length - idx;
              return (
                <m.span
                  key={player.username}
                  initial={reducedMotion ? undefined : { opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
                  animate={{ opacity: isCurrentUser ? 1 : 0.7, x: 0 }}
                  transition={{ type: 'spring', stiffness: 150, damping: 18, delay: reducedMotion ? 0 : 0.04 * idx }}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold uppercase ${
                    isCurrentUser
                      ? 'bg-neo-red/20 border-neo-red/50 text-white'
                      : 'bg-white/5 border-white/10 text-white'
                  }`}
                  data-testid={`eliminated-row-${player.username}`}
                >
                  <span className="text-white">#{eliminationOrder}</span>
                  {player.username}
                  {isCurrentUser && (
                    <span className="text-neo-pink">({t('results.you') || 'YOU'})</span>
                  )}
                </m.span>
              );
            })}
          </div>

          {/* Current user tip — only shown when eliminated */}
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
        </m.section>
      )}

      {/* Survived current user tip */}
      {currentPlayer && currentPlayer.survived && (
        <m.div variants={variant}>
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
        </m.div>
      )}
    </m.div>
  );
}
