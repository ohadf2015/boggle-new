'use client';

import React, { useEffect, useState, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';
import useReducedMotion from '@/hooks/useReducedMotion';
import Avatar from '../Avatar';
import { formatRankOrdinal } from '@/utils/formatRankOrdinal';

// ============================================================
// TYPES
// ============================================================

interface ResultsHeroSectionProps {
  rank: number;
  score: number;
  username: string;
  avatar?: { emoji?: string; color?: string } | null;
  winnerScore?: number;
  totalPlayers: number;
  isWordHunt?: boolean;
  wordHuntStatus?: 'survived' | 'eliminated';
  wordHuntTarget?: string;
  wordsFound?: number;
  t: (key: string) => string | undefined;
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
    text: 'text-neo-orange',
    bg: 'bg-neo-orange',
    border: 'border-neo-orange',
    glow: 'drop-shadow-[0_0_35px_rgba(255,107,53,0.5)]',
    ring: 'bg-neo-orange/30',
  },
};

const DEFAULT_ACCENT: RankAccent = {
  text: 'text-neo-purple',
  bg: 'bg-neo-purple',
  border: 'border-neo-purple',
  glow: 'drop-shadow-[0_0_35px_rgba(128,0,255,0.5)]',
  ring: 'bg-neo-purple/30',
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
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(skipAnimation ? target : 0);

  useEffect(() => {
    if (skipAnimation) {
      setDisplay(target);
      return;
    }
    const controls = animate(motionVal, target, {
      type: 'spring',
      stiffness: 60,
      damping: 18,
      mass: 0.8,
      delay: 0.6,
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [target, motionVal, rounded, skipAnimation]);

  return <span className={className}>{display.toLocaleString()}</span>;
};

// ============================================================
// PULSE RING KEYFRAMES (injected via style tag)
// ============================================================

const PULSE_RING_STYLE = `
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.15); opacity: 0.15; }
  100% { transform: scale(1); opacity: 0.4; }
}
.animate-pulse-ring {
  animation: pulse-ring 2s ease-in-out infinite;
}
`;

// ============================================================
// RANK LABEL HELPER
// ============================================================

function getRankLabel(
  rank: number,
  t: (key: string) => string | undefined,
): string {
  return (
    formatRankOrdinal(rank, (key) => t(key) ?? key) +
    ' ' +
    (t('results.place') ?? 'PLACE')
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const ResultsHeroSection = memo<ResultsHeroSectionProps>(
  ({
    rank,
    score,
    username,
    avatar: _avatar,
    winnerScore,
    totalPlayers: _totalPlayers,
    isWordHunt,
    wordHuntStatus,
    wordHuntTarget,
    wordsFound,
    t,
  }) => {
    const reducedMotion = useReducedMotion();
    const accent = getAccent(rank);
    const isEliminated = isWordHunt && wordHuntStatus === 'eliminated';
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

    const motionProps = reducedMotion
      ? {}
      : {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          transition: { type: 'spring' as const, stiffness: 120, damping: 20 },
        };

    return (
      <>
        <style>{PULSE_RING_STYLE}</style>
        <motion.section
          {...motionProps}
          className="flex flex-col items-center text-center relative pt-6 pb-4"
          data-testid="results-hero-section"
        >
          {/* Rank Display */}
          <div className="relative z-10 flex flex-col items-center mb-10">
            {isEliminated ? (
              <span
                className={cn(
                  'font-neo-display font-black text-7xl sm:text-9xl leading-none',
                  'text-red-500 drop-shadow-[0_0_35px_rgba(255,0,0,0.5)]',
                )}
              >
                {t('results.eliminated') ?? 'ELIMINATED'}
              </span>
            ) : (
              <span
                className={cn(
                  'text-9xl sm:text-[11rem] font-neo-display font-black leading-none',
                  displayAccent.text,
                  displayAccent.glow,
                )}
              >
                {rank}
              </span>
            )}

            {!isEliminated && (
              <div
                className={cn(
                  displayAccent.bg,
                  'text-black px-6 py-2 rounded-full border-3 border-neo-black shadow-hard-sm -mt-10 relative z-20',
                )}
              >
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  {getRankLabel(rank, t)}
                </p>
              </div>
            )}
          </div>

          {/* Pulsing Avatar */}
          <div className="relative mb-8">
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
                'relative w-40 h-40 rounded-full border-4 p-1 bg-neo-navy',
                displayAccent.border,
                isEliminated ? 'grayscale' : '',
                `shadow-[0_0_40px_rgba(0,255,255,0.3)]`,
              )}
            >
              <Avatar
                userId={username}
                size="2xl"
                className="w-full h-full rounded-full"
              />
            </div>
            <div
              className={cn(
                'absolute -bottom-2 left-1/2 -translate-x-1/2',
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
            </div>
          </div>

          {/* Score & gap */}
          <div className="space-y-4">
            <div>
              <AnimatedScore
                target={score}
                skipAnimation={reducedMotion}
                className="font-neo-display text-7xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg"
              />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {t('results.totalPoints') ?? 'Total Points'}
              </p>
            </div>

            {/* Word Hunt extras */}
            {isWordHunt && wordHuntTarget && (
              <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                {t('results.targetWord') ?? 'Target'}:{' '}
                <span className="text-white">{wordHuntTarget}</span>
              </p>
            )}
            {isWordHunt && wordsFound !== undefined && (
              <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                {t('results.wordsFound') ?? 'Words Found'}:{' '}
                <span className="text-white">{wordsFound}</span>
              </p>
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
                {t('results.soClose') ?? 'So close!'}{' '}
                {t('results.justBehind')
                  ? `${t('results.justBehind')} `.replace('{pts}', String(gap))
                  : `Just ${gap} pts behind #1.`}
              </p>
            )}
          </div>
        </motion.section>
      </>
    );
  },
);

ResultsHeroSection.displayName = 'ResultsHeroSection';

export default ResultsHeroSection;
