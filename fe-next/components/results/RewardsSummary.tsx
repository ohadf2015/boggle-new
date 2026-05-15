'use client';

import React, { memo, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Coins, Trophy, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';
import useReducedMotion from '@/hooks/useReducedMotion';
import { ScoreCountUp } from '@/components/results/shared';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { CoinReward } from './CoinRewardDisplay';

export interface RewardsSummaryProps {
  /** Coins earned from the game */
  coinReward: CoinReward | null;
  /** Whether user is authenticated (affects coin display) */
  isAuthenticated: boolean;
  /** Win streak data */
  winStreak?: {
    currentStreak: number;
    bestStreak: number;
    isNewMilestone?: boolean;
    previousStreak?: number;
  } | null;
  /** Achievements unlocked this game */
  achievementsUnlocked?: number;
  /** Whether player won the game */
  isWinner?: boolean;
  /** Callback when achievements section is clicked (e.g., to navigate to details tab) */
  onAchievementsClick?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * RewardsSummary - Consolidated post-game rewards display
 *
 * Shows all rewards earned in a single, animated, prominent card:
 * - Coins earned with breakdown
 * - Win streak progress
 * - Achievement count
 *
 * Designed to be the first thing players see after a game,
 * creating a satisfying "rewards moment" that drives engagement.
 */
const RewardsSummary: React.FC<RewardsSummaryProps> = memo(({
  coinReward,
  isAuthenticated,
  winStreak,
  achievementsUnlocked = 0,
  isWinner = false,
  onAchievementsClick,
  className,
}) => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const reducedMotion = useReducedMotion();
  const [showRewards, setShowRewards] = useState(false);
  const [celebrationFired, setCelebrationFired] = useState(false);

  // Staggered reveal animation
  useEffect(() => {
    const timer = setTimeout(() => setShowRewards(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Fire celebration confetti for wins with significant rewards
  useEffect(() => {
    if (celebrationFired || reducedMotion) return;

    const hasSignificantRewards =
      (coinReward && coinReward.awarded >= 50) ||
      (winStreak && winStreak.isNewMilestone) ||
      achievementsUnlocked >= 2;

    if (isWinner && hasSignificantRewards) {
      setCelebrationFired(true);
      setTimeout(() => {
        fireConfetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#FFE135', '#FF6B35', '#00FFFF', '#a855f7'],
        });
      }, 500);
    }
  }, [isWinner, coinReward, winStreak, achievementsUnlocked, celebrationFired, reducedMotion]);

  const suppressGuestCoinTease = isOnCrazyGamesPlatform && !isAuthenticated;
  const hasCoins = !suppressGuestCoinTease && coinReward && coinReward.awarded > 0;
  const hasStreak = winStreak && winStreak.currentStreak > 0;
  const hasAchievements = achievementsUnlocked > 0;
  const hasAnyReward = hasCoins || hasStreak || hasAchievements;

  if (!hasAnyReward) {
    return null;
  }

  // Compose breakdown into a single tooltip string so the full earning detail
  // remains discoverable without owning vertical space on the results page.
  const breakdownTooltip = (() => {
    if (!hasCoins || !isAuthenticated || !coinReward?.breakdown) return undefined;
    const b = coinReward.breakdown;
    const parts: string[] = [];
    if (b.base > 0) parts.push(`${t('reveal.base')} +${b.base}`);
    if ((b.scoreBonus ?? 0) > 0) parts.push(`${t('coins.score')} +${b.scoreBonus}`);
    if ((b.placement ?? 0) > 0) parts.push(`${t('coins.placement')} +${b.placement}`);
    if ((b.efficiency ?? 0) > 0) parts.push(`${t('coins.efficiency')} +${b.efficiency}`);
    if ((b.streak ?? 0) > 0) parts.push(`${t('coins.streak')} +${b.streak}`);
    if ((b.streakBonus ?? 0) > 0) parts.push(`🔥 +${b.streakBonus}`);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  })();

  return (
    <AnimatePresence>
      {showRewards && (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className={cn(
            'relative rounded-neo border-2 border-neo-black bg-neo-navy-light/60',
            className
          )}
        >
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            {/* Coins chip — compact replacement for prior full-width card */}
            {hasCoins && (
              <span
                title={breakdownTooltip}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black px-2 py-1 text-sm font-black tabular-nums',
                  isAuthenticated ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy text-neo-pink/80'
                )}
              >
                <Coins className="w-3.5 h-3.5" aria-hidden />
                +<ScoreCountUp to={coinReward.awarded} duration={900} delay={reducedMotion ? 0 : 200} />
                {!isAuthenticated && (
                  <span className="ms-1 text-[10px] uppercase tracking-wide opacity-70">
                    {t('coins.signInToEarn')}
                  </span>
                )}
              </span>
            )}

            {/* Win Streak chip */}
            {hasStreak && (
              <span className="inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-orange/90 px-2 py-1 text-sm font-black text-neo-black tabular-nums">
                <span aria-hidden>🔥</span>
                {winStreak.currentStreak}
                {winStreak.isNewMilestone && <Sparkles className="w-3.5 h-3.5" aria-hidden />}
              </span>
            )}

            {/* Achievements chip */}
            {hasAchievements && (
              <button
                type="button"
                onClick={onAchievementsClick}
                disabled={!onAchievementsClick}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-pink px-2 py-1 text-sm font-black text-neo-black tabular-nums',
                  onAchievementsClick && 'cursor-pointer hover:brightness-110 active:scale-[0.97] transition-transform',
                )}
              >
                <Trophy className="w-3.5 h-3.5" aria-hidden />
                {achievementsUnlocked}
              </button>
            )}

            {isWinner && (
              <span className="ms-auto inline-flex items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-lime px-2 py-1 text-xs font-black text-neo-black uppercase">
                <Star className="w-3 h-3 fill-neo-black" aria-hidden />
                {t('results.rewardsEarned')}
              </span>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

RewardsSummary.displayName = 'RewardsSummary';

export default RewardsSummary;
