'use client';

import React, { useEffect, useState, memo } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Crown, Medal, TrendingUp, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import Avatar from '../Avatar';
import { fireRankConfetti } from '@/utils/confettiUtils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { formatRankOrdinal } from '@/utils/formatRankOrdinal';

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
// RANK THEME — minimal, one accent per rank
// ============================================================

interface RankTheme {
  bgClass: string;
  textClass: string;
  accentColor: string;
  scoreTextColor: string;
  badgeBg: string;
  badgeText: string;
  icon: typeof Crown;
  messageKey: string;
}

const RANK_THEMES: Record<number, RankTheme> = {
  1: {
    bgClass: 'bg-neo-yellow',
    textClass: 'text-neo-black',
    accentColor: '#FFD700',
    scoreTextColor: 'text-neo-black',
    badgeBg: 'bg-neo-cream',
    badgeText: 'text-amber-600',
    icon: Crown,
    messageKey: 'results.youWon',
  },
  2: {
    bgClass: 'bg-slate-200',
    textClass: 'text-neo-black',
    accentColor: '#94a3b8',
    scoreTextColor: 'text-neo-black',
    badgeBg: 'bg-white',
    badgeText: 'text-slate-500',
    icon: Medal,
    messageKey: 'results.secondPlace',
  },
  3: {
    bgClass: 'bg-amber-600',
    textClass: 'text-neo-white',
    accentColor: '#CD7F32',
    scoreTextColor: 'text-neo-black',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    icon: Medal,
    messageKey: 'results.thirdPlace',
  },
  0: {
    bgClass: 'bg-neo-navy',
    textClass: 'text-neo-white',
    accentColor: '#FF1493',
    scoreTextColor: 'text-neo-white',
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

  useEffect(() => {
    const controls = animate(motionVal, target, {
      type: 'spring', stiffness: 60, damping: 18, mass: 0.8, delay,
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [target, motionVal, rounded, delay]);

  return (
    <span className={className}>
      {display.toLocaleString()}
    </span>
  );
};

// ============================================================
// MAIN COMPONENT — Clean, Bold, Focused
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
      initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="w-full"
    >
      <div
        className={`${theme.bgClass} border-4 border-neo-black rounded-neo shadow-hard-lg overflow-hidden`}
        onClick={() => isPodium && !reducedMotion && fireRankConfetti(rank)}
      >
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          {/* Word Hunt: Target word (special mode) */}
          {wordHuntData && (
            <div className="flex flex-col items-center gap-1.5 mb-3">
              <div className="flex items-center gap-1.5">
                <Target className={`w-3.5 h-3.5 ${theme.textClass} opacity-50`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.textClass} opacity-40`}>
                  {t('results.targetWord')}
                </span>
              </div>
              <span className={`font-neo-display font-black text-2xl sm:text-3xl tracking-widest uppercase ${theme.textClass}`}>
                {wordHuntData.targetWord}
              </span>
              {wordHuntData.foundTarget && (
                <span className="bg-neo-lime text-neo-black px-2.5 py-0.5 border-2 border-neo-black text-[10px] font-black uppercase shadow-hard-sm">
                  {t('results.foundByYou')}
                </span>
              )}
            </div>
          )}

          {/* Core layout: Avatar + Rank/Name + Score */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Avatar with rank badge */}
            <div className="relative shrink-0">
              <div className={`border-3 border-neo-black rounded-full shadow-hard ${isPodium ? 'bg-neo-cream' : 'bg-neo-navy-light'} p-0.5`}>
                <Avatar
                  customAvatar={avatar?.customAvatar}
                  userId={username}
                  size="xl"
                  className="w-16 h-16 sm:w-20 sm:h-20"
                  mood={isPodium ? 'win' : undefined}
                />
              </div>
              {/* Rank pip */}
              <div className={`absolute -bottom-1.5 -inset-e-1.5 ${theme.badgeBg} border-2 border-neo-black rounded-neo shadow-hard-sm w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center`}>
                <Icon className={`${theme.badgeText} w-4 h-4 sm:w-5 sm:h-5`} />
              </div>
            </div>

            {/* Name + message */}
            <div className="flex-1 min-w-0">
              <span className={`inline-block ${rank === 1 ? 'bg-neo-pink text-neo-white' : isPodium ? 'bg-neo-black/80 text-neo-white' : 'bg-neo-pink/20 text-neo-pink'} text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 border-2 border-neo-black rounded-neo shadow-hard-sm tracking-wider mb-1`}>
                {formatRankOrdinal(rank, t)} — {t(theme.messageKey)}
              </span>
              {username && (
                <h2 className={`font-black ${theme.textClass} uppercase leading-none truncate text-lg sm:text-xl`}>
                  {username}
                </h2>
              )}
              {wordHuntData && (
                <span className={`text-[10px] font-bold uppercase ${theme.textClass} opacity-50`}>
                  {t('results.survived')} {Math.floor(wordHuntData.survivalTime / 60)}:{String(wordHuntData.survivalTime % 60).padStart(2, '0')}
                </span>
              )}
            </div>

            {/* Score — the hero number */}
            <div className="shrink-0 text-end">
              <span className={`block font-bold ${theme.scoreTextColor} opacity-40 uppercase tracking-widest text-[8px] sm:text-[9px]`}>
                {t('results.points')}
              </span>
              <AnimatedScore
                target={score}
                className={`font-black ${theme.scoreTextColor} text-3xl sm:text-4xl tabular-nums leading-none`}
                delay={0.3}
              />
              {rank > 1 && gapToWinner > 0 && (
                <span className={`block text-[10px] font-black uppercase mt-0.5 ${isPodium ? `${theme.textClass} opacity-50` : 'text-neo-pink'}`}>
                  -{gapToWinner} {t('results.pts')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdaptiveMotion.div>
  );
});

PlacementHero.displayName = 'PlacementHero';

export default PlacementHero;
