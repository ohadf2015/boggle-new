'use client';

import React, { memo, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import useReducedMotion from '@/hooks/useReducedMotion';
import Avatar from '../Avatar';
import { formatRankOrdinal } from '@/utils/formatRankOrdinal';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import type { Avatar as AvatarData } from '@/shared/types/game';
import { fireFirstWinConfetti } from '@/utils/confettiUtils';

// ============================================================
// TYPES
// ============================================================

interface ResultsHeroSectionProps {
  rank: number;
  score: number;
  username: string;
  avatar?: AvatarData | null;
  winnerScore?: number;
  totalPlayers: number;
  isWordHunt?: boolean;
  wordHuntStatus?: 'survived' | 'eliminated';
  wordHuntTarget?: string;
  wordsFound?: number;
  t: (key: string, params?: Record<string, string | number>) => string | undefined;
}

// ============================================================
// RANK ACCENT CONFIG
// ============================================================

type RankAccent = {
  text: string;
  bg: string;
  border: string;
  glow: string;
  ring: string;
};

const RANK_ACCENTS: Record<number, RankAccent> = {
  1: {
    text: 'text-neo-lime',
    bg: 'bg-neo-lime',
    border: 'border-neo-lime',
    glow: 'drop-shadow-[0_0_35px_rgba(0,255,0,0.5)]',
    ring: 'bg-neo-lime/30',
  },
  2: {
    text: 'text-neo-cyan',
    bg: 'bg-neo-cyan',
    border: 'border-neo-cyan',
    glow: 'drop-shadow-[0_0_35px_rgba(0,255,255,0.5)]',
    ring: 'bg-neo-cyan/30',
  },
  3: {
    text: 'text-neo-purple',
    bg: 'bg-neo-purple',
    border: 'border-neo-purple',
    glow: 'drop-shadow-[0_0_35px_rgba(139,92,246,0.5)]',
    ring: 'bg-neo-purple/30',
  },
};

const DEFAULT_ACCENT: RankAccent = {
  text: 'text-neo-white',
  bg: 'bg-neo-cream',
  border: 'border-neo-cream',
  glow: 'drop-shadow-[0_0_35px_rgba(255,254,240,0.35)]',
  ring: 'bg-neo-cream/20',
};

function getAccent(rank: number): RankAccent {
  return RANK_ACCENTS[rank] ?? DEFAULT_ACCENT;
}

// ============================================================
// ANIMATED SCORE
// ============================================================

const AnimatedScore: React.FC<{
  target: number;
  className?: string;
  skipAnimation?: boolean;
}> = ({ target, className, skipAnimation }) => {
  return (
    <AnimatedCounter
      value={target}
      size="xl"
      duration={skipAnimation ? 0 : 1500}
      className={className}
    />
  );
};

// ============================================================
// RANK LABEL HELPER
// ============================================================

function getRankLabel(
  rank: number,
  t: (key: string, params?: Record<string, string | number>) => string | undefined,
): string {
  // Ordinal translations already include "PLACE" / "מקום" / "PLATS" etc.
  return formatRankOrdinal(rank, (key, params) => t(key, params) ?? key);
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const ResultsHeroSection = memo<ResultsHeroSectionProps>(
  ({
    rank,
    score,
    username,
    avatar,
    winnerScore,
    totalPlayers: _totalPlayers,
    isWordHunt,
    wordHuntStatus,
    wordHuntTarget,
    wordsFound,
    t,
  }) => {
    const reducedMotion = useReducedMotion();
    const cancelConfettiRef = useRef<(() => void) | null>(null);
    const accent = getAccent(rank);
    const isEliminated = isWordHunt && wordHuntStatus === 'eliminated';

    // Cascading confetti burst for winner (rank 1) — short & restrained.
    // Prior 2.5s cascade overlapped the podium reveal animations and felt
    // overwhelming on repeated MP wins.
    useEffect(() => {
      if (rank !== 1 || reducedMotion) return;
      const timer = setTimeout(() => {
        cancelConfettiRef.current = fireFirstWinConfetti(1200);
      }, 800);
      return () => {
        clearTimeout(timer);
        cancelConfettiRef.current?.();
      };
    }, [rank, reducedMotion]);
    const isSurvivedWordHunt = isWordHunt && wordHuntStatus === 'survived';

    // For eliminated, override accent to red
    const displayAccent = isEliminated
      ? {
          text: 'text-red-500',
          bg: 'bg-red-500',
          border: 'border-red-500',
          glow: 'drop-shadow-[0_0_35px_rgba(255,0,0,0.5)]',
          ring: 'bg-red-500/30',
        }
      : isSurvivedWordHunt
        ? { ...getAccent(1) } // lime glow for survived
        : accent;

    const gap =
      rank > 1 && winnerScore !== undefined ? winnerScore - score : 0;

    return (
        <m.section
          initial={reducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center relative pt-8 pb-4 medium-short:pt-3 medium-short:pb-2 short:pt-1 short:pb-1"
          data-testid="results-hero-section"
        >
          {/* Rank Display — dramatic slam entrance */}
          <div className="relative z-10 flex flex-col items-center mb-6 medium-short:mb-2 short:mb-1">
            {isEliminated ? (
              <m.span
                initial={reducedMotion ? undefined : { opacity: 0, scale: 2, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.1 }}
                className={cn(
                  'font-neo-display font-black text-3xl medium-short:text-2xl xs:text-4xl sm:text-5xl md:text-7xl leading-none',
                  'text-red-500 drop-shadow-[0_0_35px_rgba(255,0,0,0.5)] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                )}
              >
                {t('results.eliminated')}
              </m.span>
            ) : (
              <m.span
                initial={reducedMotion ? undefined : { opacity: 0, scale: 3, y: -40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
                className={cn(
                  'text-5xl medium-short:text-4xl short:text-3xl xs:text-6xl sm:text-7xl md:text-9xl font-neo-display font-black leading-none',
                  displayAccent.text,
                  displayAccent.glow,
                )}
              >
                {rank}
              </m.span>
            )}

            {!isEliminated && (
              <m.div
                initial={reducedMotion ? undefined : { opacity: 0, scale: 0, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.45 }}
                className={cn(
                  displayAccent.bg,
                  'text-black px-6 py-2 medium-short:px-4 medium-short:py-1 rounded-full border-3 border-neo-black shadow-hard-sm mt-2 sm:-mt-4 md:-mt-8 medium-short:mt-1 medium-short:sm:-mt-2 medium-short:md:-mt-4 relative z-20',
                )}
              >
                <p className="text-xs medium-short:text-[10px] font-black uppercase tracking-[0.2em]">
                  {getRankLabel(rank, t)}
                </p>
              </m.div>
            )}
          </div>

          {/* Pulsing Avatar — drops in from above */}
          <m.div
            className="relative mb-8 medium-short:mb-4 short:mb-2"
            initial={reducedMotion ? undefined : { opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.55 }}
          >
            {!reducedMotion && (
              <div
                className={cn(
                  'absolute inset-0 rounded-full',
                  displayAccent.ring,
                  'animate-pulse-ring',
                )}
              />
            )}
            <div
              className={cn(
                'relative w-28 h-28 medium-short:w-20 medium-short:h-20 short:w-16 short:h-16 sm:w-40 sm:h-40 medium-short:sm:w-24 medium-short:sm:h-24 rounded-full border-4 p-1 bg-neo-navy',
                displayAccent.border,
                isEliminated ? 'grayscale ring-8 ring-red-500/5' : '',
                `shadow-[0_0_40px_rgba(0,255,255,0.3)]`,
              )}
            >
              <Avatar
                userId={username}
                customAvatar={avatar?.customAvatar}
                size="2xl"
                className="w-full h-full rounded-full"
              />
            </div>
            <m.div
              initial={reducedMotion ? undefined : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.75 }}
              className={cn(
                'absolute -bottom-2 left-1/2 -translate-x-1/2 max-w-[80vw]',
                'bg-neo-navy border-2 px-5 py-1.5 rounded-full shadow-hard-sm',
                displayAccent.border,
              )}
            >
              <p
                className={cn(
                  'text-xs font-black uppercase tracking-widest',
                  displayAccent.text,
                )}
              >
                {username}
              </p>
            </m.div>
          </m.div>

          {/* Score & gap — score counter starts after avatar lands */}
          <m.div
            className="space-y-4 medium-short:space-y-2"
            initial={reducedMotion ? undefined : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.85 }}
          >
            <div>
              <AnimatedScore
                target={score}
                skipAnimation={reducedMotion}
                className="font-neo-display text-4xl medium-short:text-3xl short:text-2xl xs:text-5xl sm:text-7xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg"
              />
              <m.p
                initial={reducedMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-[10px] font-bold text-white uppercase tracking-widest"
              >
                {t('results.totalPoints')}
              </m.p>
            </div>

            {/* Word Hunt target badges */}
            {isWordHunt && (
              <div className="flex items-center gap-2 sm:gap-4 mt-4">
                <div className="bg-neo-black/40 border-2 border-white/10 px-3 sm:px-4 py-1.5 rounded-neo">
                  <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-0.5">
                    {t('results.target')}
                  </p>
                  <p className="text-xl font-neo-display font-black text-white uppercase">
                    {wordHuntTarget || '—'}
                  </p>
                </div>
                <div className="bg-neo-black/40 border-2 border-white/10 px-3 sm:px-4 py-1.5 rounded-neo">
                  <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-0.5">
                    {t('results.wordsFound')}
                  </p>
                  <p className={cn('text-xl font-neo-display font-black uppercase', displayAccent.text)}>
                    {wordsFound ?? 0}
                  </p>
                </div>
              </div>
            )}

            {/* Gap text */}
            {rank > 1 && gap > 0 && !isEliminated && (
              <p
                className={cn(
                  'text-sm font-bold uppercase tracking-widest',
                  displayAccent.text,
                  'opacity-70',
                )}
              >
                {t('results.soClose', { points: gap })}
              </p>
            )}
          </m.div>
        </m.section>
    );
  },
);

ResultsHeroSection.displayName = 'ResultsHeroSection';

export default ResultsHeroSection;
