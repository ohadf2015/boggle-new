'use client';

import React, { useEffect, useState, memo } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Crown, Medal, TrendingUp, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import Avatar from '../Avatar';
import { fireRankConfetti } from '@/utils/confettiUtils';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import { MascotWithEntrance } from '@/components/ui/Mascot';
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
// RANK THEME CONFIG — Podium Celebration Edition
// ============================================================

interface RankTheme {
  bgClass: string;
  textClass: string;
  accentColor: string;
  glowColor: string;
  scoreBoxBg: string;
  scoreTextColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  icon: typeof Crown;
  messageKey: string;
}

const RANK_THEMES: Record<number, RankTheme> = {
  1: {
    bgClass: 'bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-400',
    textClass: 'text-neo-black',
    accentColor: '#FFD700',
    glowColor: 'rgba(255,215,0,0.3)',
    scoreBoxBg: 'bg-neo-cream',
    scoreTextColor: 'text-neo-black',
    borderColor: 'border-neo-black',
    badgeBg: 'bg-neo-cream',
    badgeText: 'text-amber-600',
    icon: Crown,
    messageKey: 'results.youWon',
  },
  2: {
    bgClass: 'bg-gradient-to-br from-gray-300 to-gray-200',
    textClass: 'text-neo-black',
    accentColor: '#94a3b8',
    glowColor: 'rgba(148,163,184,0.3)',
    scoreBoxBg: 'bg-white/90',
    scoreTextColor: 'text-neo-black',
    borderColor: 'border-neo-black',
    badgeBg: 'bg-white',
    badgeText: 'text-slate-500',
    icon: Medal,
    messageKey: 'results.secondPlace',
  },
  3: {
    bgClass: 'bg-gradient-to-br from-orange-400 via-amber-300 to-orange-400',
    textClass: 'text-neo-black',
    accentColor: '#FF6B35',
    glowColor: 'rgba(255,107,53,0.3)',
    scoreBoxBg: 'bg-neo-cream',
    scoreTextColor: 'text-neo-black',
    borderColor: 'border-neo-black',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-600',
    icon: Medal,
    messageKey: 'results.thirdPlace',
  },
  0: {
    bgClass: 'bg-gradient-to-br from-neo-navy via-neo-navy/95 to-neo-pink/10',
    textClass: 'text-neo-cream',
    accentColor: '#FF1493',
    glowColor: 'rgba(255,20,147,0.15)',
    scoreBoxBg: 'bg-neo-black',
    scoreTextColor: 'text-neo-cream',
    borderColor: 'border-neo-pink/40',
    badgeBg: 'bg-neo-pink',
    badgeText: 'text-white',
    icon: TrendingUp,
    messageKey: 'results.betterLuckNextTime',
  },
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
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    setLanded(false);
    const controls = animate(motionVal, target, {
      type: 'spring', stiffness: 60, damping: 18, mass: 0.8, delay,
      onComplete: () => setLanded(true),
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [target, motionVal, rounded, delay]);

  return (
    <AdaptiveMotion.span
      className={className}
      animate={landed ? {
        scale: [1.15, 0.96, 1.03, 1],
      } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {display.toLocaleString()}
    </AdaptiveMotion.span>
  );
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
// MAIN COMPONENT — Podium Celebration Hero
// ============================================================

const PlacementHero = memo<PlacementHeroProps>(({
  rank, score, avatar, gapToWinner = 0, wordHuntData, username,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const theme = RANK_THEMES[rank <= 3 ? rank : 0];
  const isPodium = rank <= 3;
  const Icon = theme.icon;

  useEffect(() => {
    if (rank <= 3 && !reducedMotion) {
      const timer = setTimeout(() => fireRankConfetti(rank, 'light'), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [rank, reducedMotion]);

  return (
    <AdaptiveMotion.div
      initial={reducedMotion ? undefined : { opacity: 0, scale: 0.88, y: 30, rotate: -1.5 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: isPodium ? -1 : 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 16 }}
      className="w-full"
    >
      <div
        className={`relative overflow-hidden ${theme.bgClass} border-4 border-neo-black rounded-neo-lg shadow-hard-xl cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]`}
        onClick={() => isPodium && !reducedMotion && fireRankConfetti(rank)}
      >
        {/* Animated border glow for podium finishers */}
        {isPodium && !reducedMotion && (
          <AdaptiveMotion.div
            className="absolute inset-0 rounded-neo-lg pointer-events-none z-[2]"
            animate={{
              boxShadow: [
                'inset 0 0 0px transparent, 0 0 0px transparent',
                `inset 0 0 30px ${theme.glowColor}, 0 0 20px ${theme.glowColor}`,
                'inset 0 0 0px transparent, 0 0 0px transparent',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Radial spotlight from top */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% -20%, ${theme.glowColor} 0%, transparent 70%)` }}
        />

        {/* Halftone texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(circle,rgb(0,0,0)_1px,transparent_1px)] bg-[length:10px_10px]" />

        {/* Diagonal energy stripes */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgb(0,0,0) 10px, rgb(0,0,0) 12px)' }}
        />

        {/* Shimmer sweep */}
        {!reducedMotion && (
          <AdaptiveMotion.div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 48%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.25) 52%, transparent 70%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 2, delay: 0.5, ease: 'easeInOut' }}
          />
        )}

        {/* Main content */}
        <div className="relative z-10 px-4 py-5 sm:px-6 sm:py-6">
          {/* Word Hunt: Target word display (above everything) */}
          {wordHuntData && (
            <AdaptiveMotion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-2 mb-4"
            >
              <div className="flex items-center gap-2">
                <Target className={`w-4 h-4 sm:w-5 sm:h-5 ${isPodium ? 'text-neo-black/60' : 'text-neo-lime'}`} />
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] ${isPodium ? 'text-neo-black/50' : 'text-neo-cream/50'}`}>
                  {t('results.targetWord')}
                </span>
              </div>
              <span className={`font-neo-display text-3xl xs:text-4xl sm:text-5xl tracking-widest uppercase break-all text-center ${isPodium ? 'text-neo-black drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)]' : 'text-white drop-shadow-[4px_4px_0px_#000]'}`}>
                {wordHuntData.targetWord}
              </span>
              {wordHuntData.foundTarget && (
                <AdaptiveMotion.div
                  initial={reducedMotion ? undefined : { scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: -1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 12 }}
                  className="bg-neo-lime text-neo-black px-3 py-1 border-3 border-neo-black shadow-hard"
                >
                  <span className="font-neo-display text-xs sm:text-sm uppercase">
                    {t('results.foundByYou')}
                  </span>
                </AdaptiveMotion.div>
              )}
            </AdaptiveMotion.div>
          )}

          {/* Top row: Rank badge + message */}
          <AdaptiveMotion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-2 mb-3"
          >
            {/* Rank badge */}
            <AdaptiveMotion.div
              initial={reducedMotion ? undefined : { scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: -3 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 12 }}
              className={`relative ${theme.badgeBg} border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14`}
            >
              <Icon className={`${theme.badgeText} w-5 h-5 sm:w-6 sm:h-6`} />
              <span className={`absolute -bottom-1.5 -end-1.5 bg-neo-black text-neo-cream border-2 border-neo-cream rounded-full font-black text-[10px] sm:text-xs w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shadow-hard-sm`}>
                {getOrdinalSuffix(rank)}
              </span>
            </AdaptiveMotion.div>

            {/* Message badge */}
            <AdaptiveMotion.div
              initial={reducedMotion ? undefined : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <span className={`inline-block ${rank === 1 ? 'bg-neo-pink text-neo-cream' : isPodium ? 'bg-neo-black text-neo-cream' : 'bg-neo-pink/20 text-neo-pink'} text-[10px] sm:text-xs font-black uppercase px-2.5 py-1 border-2 border-neo-black rounded-neo shadow-hard-sm tracking-wider`}>
                {t(theme.messageKey)}
              </span>
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>

          {/* Center: Large Avatar + Username */}
          <AdaptiveMotion.div
            initial={reducedMotion ? undefined : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
            className="flex flex-col items-center gap-2 mb-3"
          >
            {/* Avatar — the visual anchor */}
            <AdaptiveMotion.div
              animate={!reducedMotion && rank === 1 ? {
                boxShadow: [
                  '0 0 0px rgba(255,215,0,0), 0 4px 0px black',
                  '0 0 20px rgba(255,215,0,0.5), 0 4px 0px black',
                  '0 0 0px rgba(255,215,0,0), 0 4px 0px black',
                ],
              } : undefined}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className={`border-4 border-neo-black rounded-full shadow-hard-lg ${isPodium ? 'bg-neo-cream' : 'bg-slate-900'} p-1`}
            >
              <Avatar
                customAvatar={avatar?.customAvatar}
                userId={username}
                size="2xl"
                className="w-24 h-24 sm:w-28 sm:h-28"
              />
            </AdaptiveMotion.div>

            {/* Username */}
            {username && (
              <h2
                className={`font-black ${theme.textClass} uppercase leading-none text-center text-xl sm:text-2xl`}
                style={isPodium ? { textShadow: '2px 2px 0px rgba(0,0,0,0.1)' } : { textShadow: '2px 2px 0px var(--neo-cyan)' }}
              >
                {username}
              </h2>
            )}

            {/* Word Hunt survival time */}
            {wordHuntData && (
              <span className={`text-[10px] font-black uppercase tracking-wider ${isPodium ? 'text-neo-black/60' : 'text-neo-lime'}`}>
                {t('results.survived')} {Math.floor(wordHuntData.survivalTime / 60)}:{String(wordHuntData.survivalTime % 60).padStart(2, '0')}
              </span>
            )}
          </AdaptiveMotion.div>

          {/* Title text — bold and thick */}
          {!wordHuntData && (
            <AdaptiveMotion.h1
              initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
              className={`font-neo-display text-3xl xs:text-4xl sm:text-5xl ${theme.textClass} uppercase tracking-tight text-center leading-none mb-3`}
              style={isPodium ? { textShadow: '3px 3px 0px rgba(0,0,0,0.08)' } : { textShadow: '0 0 20px rgba(191,255,0,0.3)' }}
            >
              {rank === 1 ? t('results.greatVictory') : t('results.greatBattle')}
            </AdaptiveMotion.h1>
          )}

          {/* Score — the hero number on a contrasting card */}
          <AdaptiveMotion.div
            initial={reducedMotion ? undefined : { opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.04, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.95 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 10 }}
            className="flex justify-center"
          >
            <div className={`${theme.scoreBoxBg} border-3 border-neo-black rounded-neo shadow-hard-lg px-8 py-3 sm:px-12 sm:py-4 flex flex-col items-center relative overflow-hidden`}>
              {/* Score shimmer */}
              {!reducedMotion && (
                <AdaptiveMotion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(110deg, transparent 30%, rgba(0,0,0,0.06) 50%, transparent 70%)',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                  transition={{ duration: 2, delay: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5 }}
                />
              )}
              <span className={`font-bold ${theme.scoreTextColor} opacity-50 uppercase tracking-widest text-[9px] sm:text-[10px]`}>
                {t('results.finalScore')}
              </span>
              <AnimatedScore
                target={score}
                className={`font-black ${theme.scoreTextColor} text-5xl sm:text-6xl md:text-7xl tabular-nums leading-none`}
                delay={0.5}
              />
            </div>
          </AdaptiveMotion.div>

          {/* Gap to winner — motivational */}
          {rank > 1 && gapToWinner > 0 && (
            <AdaptiveMotion.p
              initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 18 }}
              className={`text-center text-xs sm:text-sm font-black uppercase tracking-tight mt-2 ${isPodium ? 'text-neo-black/60' : 'text-neo-pink'}`}
            >
              {t('results.pointsBehind', { points: gapToWinner })}
            </AdaptiveMotion.p>
          )}
        </div>

        {/* Mascot — positioned in bottom-right corner */}
        <div className="absolute z-20 pointer-events-none -bottom-2 -end-2 sm:bottom-0 sm:end-0">
          {isPodium && score > 0 ? (
            <CelebrationMascotWithEntrance
              variant="trophy"
              size="sm"
              delay={0.6}
              className="drop-shadow-lg"
            />
          ) : (
            <MascotWithEntrance
              variant={score === 0 ? 'oops' : 'encouraging'}
              size="sm"
              delay={0.6}
              className="drop-shadow-lg"
            />
          )}
        </div>
      </div>
    </AdaptiveMotion.div>
  );
});

PlacementHero.displayName = 'PlacementHero';

export default PlacementHero;
