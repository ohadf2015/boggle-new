'use client';

import React, { useEffect, useState, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Crown, Medal, TrendingUp, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import Avatar from '../Avatar';
import { fireRankConfetti } from '@/utils/confettiUtils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// ============================================================
// TYPES
// ============================================================

interface PlacementHeroProps {
  rank: number;
  score: number;
  totalPlayers: number;
  username?: string;
  avatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string | null;
    avatarImage?: string;
    customAvatar?: CustomAvatarConfig | null;
  };
  gapToWinner?: number;
  wordHuntData?: {
    targetWord: string;
    foundTarget: boolean;
    survivalTime: number;
  };
}

// ============================================================
// RANK THEME CONFIG — Fight Card Edition
// ============================================================

interface RankTheme {
  accentColor: string;
  rankBorderColor: string;
  message: string;
  icon: typeof Crown;
}

const RANK_THEMES: Record<number, RankTheme> = {
  1: { accentColor: 'var(--neo-lime)', rankBorderColor: 'border-neo-lime', message: 'results.youWon', icon: Crown },
  2: { accentColor: 'var(--neo-cyan)', rankBorderColor: 'border-neo-cyan', message: 'results.secondPlace', icon: Medal },
  3: { accentColor: 'var(--neo-orange)', rankBorderColor: 'border-neo-orange', message: 'results.thirdPlace', icon: Medal },
  0: { accentColor: 'var(--neo-pink)', rankBorderColor: 'border-neo-pink', message: 'results.betterLuckNextTime', icon: TrendingUp },
};

// ============================================================
// ANIMATED SCORE COUNTER
// ============================================================

const AnimatedScore: React.FC<{ target: number; className?: string; delay?: number }> = ({
  target, className, delay = 0.6,
}) => {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, target, {
      type: 'spring', stiffness: 60, damping: 18, mass: 0.8, delay,
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [target, motionVal, rounded, delay]);

  return <span className={className}>{display.toLocaleString()}</span>;
};

// ============================================================
// ORDINAL SUFFIX
// ============================================================

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================================================
// MAIN COMPONENT — Fight Card Hero
// ============================================================

const PlacementHero = memo<PlacementHeroProps>(({
  rank, score, avatar, gapToWinner = 0, wordHuntData,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const theme = RANK_THEMES[rank <= 3 ? rank : 0];

  useEffect(() => {
    if (rank <= 3 && !reducedMotion) {
      const timer = setTimeout(() => fireRankConfetti(rank, 'light'), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [rank, reducedMotion]);

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className="w-full"
    >
      <div
        className="relative overflow-hidden bg-slate-800/40 border-3 border-neo-cream shadow-hard-lg cursor-pointer"
        onClick={() => rank <= 3 && !reducedMotion && fireRankConfetti(rank)}
      >
        {/* Halftone texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[length:10px_10px]" />

        {/* Shimmer sweep — slow cinematic swipe */}
        {!reducedMotion && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 2.5, ease: 'linear', repeat: Infinity }}
          />
        )}

        {/* Huge ghost rank number — responsive sizing: 120px on xs, 160px on sm+ */}
        <motion.div
          className="absolute -top-2 sm:-top-4 -start-1 sm:-start-2 pointer-events-none"
          initial={reducedMotion ? { opacity: 0.1 } : { opacity: 0, scale: 3, rotate: -15 }}
          animate={{ opacity: 0.1, scale: 1, rotate: -12 }}
          transition={{ type: 'spring', stiffness: 350, damping: 15, delay: 0.3 }}
        >
          <span className="font-neo-display text-[120px] sm:text-[160px] leading-none text-white inline-block select-none">
            {rank}
          </span>
        </motion.div>

        {/* Main content — responsive padding */}
        <div className="relative z-10 px-4 py-5 sm:p-6 flex flex-col items-center gap-2.5 sm:gap-3">

          {/* Word Hunt: Target word display */}
          {wordHuntData && (
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-neo-lime" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-neo-cream/50 tracking-[0.2em]">
                  {t('results.targetWord')}
                </span>
              </div>
              <span className="font-neo-display text-3xl xs:text-4xl sm:text-5xl text-white tracking-widest uppercase drop-shadow-[4px_4px_0px_#000] break-all text-center">
                {wordHuntData.targetWord}
              </span>
              {wordHuntData.foundTarget && (
                <motion.div
                  initial={reducedMotion ? undefined : { scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: -1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 12 }}
                  className="bg-neo-lime text-neo-black px-3 py-1 border-3 border-neo-black shadow-hard"
                >
                  <span className="font-neo-display text-xs sm:text-sm uppercase">
                    {t('results.foundByYou')}
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Avatar + placement info — stacked on xs, horizontal on sm+ */}
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"
          >
            {avatar && (
              <motion.div
                className={`border-3 ${theme.rankBorderColor} rounded-full shadow-hard bg-slate-900 p-0.5`}
                animate={!reducedMotion && rank === 1 ? {
                  boxShadow: [
                    `0 0 0px ${theme.accentColor}`,
                    `0 0 16px ${theme.accentColor}`,
                    `0 0 0px ${theme.accentColor}`,
                  ],
                } : undefined}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Avatar
                  profilePictureUrl={avatar.profilePictureUrl ?? undefined}
                  avatarImage={avatar.avatarImage}
                  customAvatar={avatar.customAvatar}
                  size="lg"
                  className="w-16 h-16 sm:w-20 sm:h-20"
                />
              </motion.div>
            )}
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-neo-display text-2xl sm:text-3xl text-neo-cream leading-none uppercase text-center sm:text-start">
                {getOrdinalSuffix(rank)} {t('results.place')}
              </span>
              {wordHuntData && (
                <span className="text-[10px] font-black uppercase tracking-wider mt-0.5" style={{ color: theme.accentColor }}>
                  {t('results.survived')} {Math.floor(wordHuntData.survivalTime / 60)}:{String(wordHuntData.survivalTime % 60).padStart(2, '0')}
                </span>
              )}
            </div>
          </motion.div>

          {/* Title text — responsive sizing */}
          {!wordHuntData && (
            <motion.h1
              initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 15 }}
              className="font-neo-display text-2xl xs:text-3xl sm:text-4xl text-neo-cream uppercase tracking-wide drop-shadow-lg text-center"
            >
              {rank === 1 ? t('results.greatVictory') : t('results.greatBattle')}
            </motion.h1>
          )}

          {/* Score box — responsive padding, hover lift */}
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 15 }}
            className="bg-neo-black border-3 border-neo-cream px-5 py-2.5 sm:px-8 sm:py-3 shadow-hard-lg flex flex-col items-center relative overflow-hidden"
          >
            {/* Score shimmer sweep */}
            {!reducedMotion && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 1.5, delay: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4 }}
              />
            )}
            <span className="text-[10px] sm:text-[12px] font-black uppercase text-neo-cream/50 tracking-widest relative z-10">
              {t('results.finalScore')}
            </span>
            <span style={{ color: theme.accentColor }} className="relative z-10">
              <AnimatedScore
                target={score}
                className="font-neo-display text-4xl xs:text-5xl sm:text-6xl tabular-nums leading-none"
                delay={0.5}
              />
            </span>
          </motion.div>

          {/* Gap to winner — bounce in */}
          {rank > 1 && gapToWinner > 0 && (
            <motion.p
              initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 18 }}
              className="text-xs sm:text-sm font-black uppercase text-neo-pink tracking-tight"
            >
              {t('results.pointsBehind', { points: gapToWinner })}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
});

PlacementHero.displayName = 'PlacementHero';

export default PlacementHero;
