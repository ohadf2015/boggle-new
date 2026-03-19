'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
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
}) => {
  // Loser — revenge face-off
  if (currentPlayerRank > 1 && sortedScores.length > 1 && sortedScores[0] && currentPlayerData) {
    return (
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: revengeDelay }}
        className="bg-slate-800 border-3 border-slate-700 shadow-hard-lg p-3 sm:p-5 relative overflow-hidden"
      >
        {/* Decorative pink triangle (top-right, matching SuperDesign) */}
        <div className="absolute top-0 end-0 w-24 h-24 sm:w-32 sm:h-32 bg-neo-pink/10 transform rotate-45 translate-x-12 sm:translate-x-16 -translate-y-12 sm:-translate-y-16 pointer-events-none" />
        {/* Halftone overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:8px_8px]" />

        <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-5 px-2 sm:px-4 mb-3 sm:mb-4">
          {/* YOUR side */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0">
            <div className="border-2 sm:border-3 border-neo-cyan rounded-full shadow-hard-sm bg-slate-900 overflow-hidden">
              <Avatar

                avatarImage={currentPlayerData.avatar?.avatarImage}
                customAvatar={currentPlayerData.avatar?.customAvatar}
                size="md"
                className="w-11 h-11 sm:w-14 sm:h-14"
              />
            </div>
            <span className="text-[10px] sm:text-xs font-black uppercase text-neo-cyan truncate max-w-[60px] sm:max-w-[80px]">
              {t('results.you')}
            </span>
          </div>

          {/* VS badge — hexagonal, wobble + scale pulse */}
          <motion.div
            animate={!reducedMotion ? { rotate: [0, 4, -4, 0], scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="shrink-0 bg-neo-cream border-3 border-neo-black w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            <span className="font-neo-display text-neo-black text-base sm:text-xl">VS</span>
          </motion.div>

          {/* WINNER side */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0">
            <div className="border-2 sm:border-3 border-neo-lime rounded-full shadow-hard-sm bg-slate-900 overflow-hidden">
              <Avatar

                avatarImage={sortedScores[0].avatar?.avatarImage}
                customAvatar={sortedScores[0].avatar?.customAvatar}
                size="md"
                className="w-11 h-11 sm:w-14 sm:h-14"
              />
            </div>
            <span className="text-[10px] sm:text-xs font-black uppercase text-neo-lime truncate max-w-[60px] sm:max-w-[80px]">
              {sortedScores[0].username}
            </span>
          </div>
        </div>

        {/* Score gap / mode-specific callout */}
        <motion.p
          initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: reducedMotion ? 0 : revengeDelay + 0.3, type: 'spring', stiffness: 300, damping: 18 }}
          className="text-center mb-3 sm:mb-4 text-xs sm:text-sm font-black uppercase text-neo-pink tracking-tight sm:tracking-widest"
        >
          {gameMode === 'word-hunt'
            ? t('results.surviveLongerThan', { player: sortedScores[0].username })
            : gapToWinner > 0
              ? t('results.pointsBehind', { points: gapToWinner })
              : null
          }
        </motion.p>

        {/* Mascot motivator */}
        {!reducedMotion && (
          <motion.div
            className="absolute -bottom-1 -end-1 opacity-30 pointer-events-none"
            animate={{ y: [0, -4, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot/flexing-nobg.gif" alt="" width={48} height={48} className="object-contain" loading="eager" />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Winner — defend title card
  if (currentPlayerRank === 1 && sortedScores.length > 1) {
    return (
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: revengeDelay }}
        className="flex items-center justify-center gap-3 p-3 bg-neo-lime/10 border-3 border-neo-lime/40 rounded-neo shadow-hard-sm"
      >
        <Trophy className="w-6 h-6 text-neo-lime shrink-0" />
        <span className="font-black uppercase text-neo-lime text-sm">
          {t('results.defendTitle')}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/trophy-nobg.gif" alt="" width={36} height={36} className="object-contain shrink-0" loading="eager" />
      </motion.div>
    );
  }

  return null;
};

export default ResultsRevengeSection;
