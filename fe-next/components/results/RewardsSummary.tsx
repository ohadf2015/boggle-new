'use client';

import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Trophy, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import WinStreakDisplay from './WinStreakDisplay';
import { fireConfetti } from '@/utils/confettiUtils';
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
  const [showRewards, setShowRewards] = useState(false);
  const [celebrationFired, setCelebrationFired] = useState(false);

  // Staggered reveal animation
  useEffect(() => {
    const timer = setTimeout(() => setShowRewards(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Fire celebration confetti for wins with significant rewards
  useEffect(() => {
    if (celebrationFired) return;

    const hasSignificantRewards =
      (coinReward && coinReward.awarded >= 50) ||
      (winStreak && winStreak.isNewMilestone) ||
      achievementsUnlocked >= 2;

    if (isWinner && hasSignificantRewards) {
      setCelebrationFired(true);
      setTimeout(() => {
        fireConfetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#FFE135', '#FF6B35', '#00FFFF', '#a855f7'],
        });
      }, 500);
    }
  }, [isWinner, coinReward, winStreak, achievementsUnlocked, celebrationFired]);

  const hasCoins = coinReward && coinReward.awarded > 0;
  const hasStreak = winStreak && winStreak.currentStreak > 0;
  const hasAchievements = achievementsUnlocked > 0;
  const hasAnyReward = hasCoins || hasStreak || hasAchievements;

  if (!hasAnyReward) {
    return null;
  }

  return (
    <AnimatePresence>
      {showRewards && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={cn(
            'relative overflow-hidden rounded-neo-lg border-4 border-neo-black shadow-hard-xl',
            'bg-gradient-to-br from-neo-navy via-slate-800 to-neo-navy',
            className
          )}
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                'radial-gradient(circle at 20% 50%, #FFE135 0%, transparent 50%)',
                'radial-gradient(circle at 80% 50%, #00FFFF 0%, transparent 50%)',
                'radial-gradient(circle at 50% 80%, #a855f7 0%, transparent 50%)',
                'radial-gradient(circle at 20% 50%, #FFE135 0%, transparent 50%)',
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Header */}
          <div className="relative z-10 px-4 py-3 border-b-2 border-white/10">
            <div className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Sparkles className="w-5 h-5 text-neo-lime" />
              </motion.div>
              <h3 className="font-black text-white uppercase tracking-wider text-sm">
                {t('results.rewardsEarned') || 'Rewards Earned'}
              </h3>
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Sparkles className="w-5 h-5 text-neo-lime" />
              </motion.div>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="relative z-10 p-4 space-y-3">
            {/* Coins Reward */}
            {hasCoins && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-neo border-2',
                  isAuthenticated
                    ? 'bg-neo-lime/20 border-neo-lime/50'
                    : 'bg-slate-700/50 border-slate-500/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-neo flex items-center justify-center border-2 border-neo-black',
                    isAuthenticated ? 'bg-neo-lime' : 'bg-slate-600'
                  )}>
                    <Coins className={cn(
                      'w-5 h-5',
                      isAuthenticated ? 'text-neo-black' : 'text-amber-400'
                    )} />
                  </div>
                  <div>
                    <div className={cn(
                      'font-black text-xl',
                      isAuthenticated ? 'text-neo-lime' : 'text-amber-400/70'
                    )}>
                      +{coinReward.awarded}
                    </div>
                    <div className="text-xs text-white/60 font-medium">
                      {isAuthenticated
                        ? (t('reveal.coins') || 'Coins')
                        : (t('coins.signInToEarn') || 'Sign in to earn')}
                    </div>
                  </div>
                </div>
                {/* Breakdown tooltip hint */}
                {isAuthenticated && coinReward.breakdown && (
                  <div className="text-xs text-white/40 space-y-0.5 text-right">
                    {coinReward.breakdown.base > 0 && (
                      <div>Base: +{coinReward.breakdown.base}</div>
                    )}
                    {(coinReward.breakdown.scoreBonus ?? 0) > 0 && (
                      <div>Score: +{coinReward.breakdown.scoreBonus}</div>
                    )}
                    {(coinReward.breakdown.placement ?? 0) > 0 && (
                      <div>Rank: +{coinReward.breakdown.placement}</div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Win Streak */}
            {hasStreak && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <WinStreakDisplay
                  currentStreak={winStreak.currentStreak}
                  bestStreak={winStreak.bestStreak}
                  isNewMilestone={winStreak.isNewMilestone}
                  previousStreak={winStreak.previousStreak}
                  compact={false}
                />
              </motion.div>
            )}

            {/* Achievements */}
            {hasAchievements && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                onClick={onAchievementsClick}
                role={onAchievementsClick ? 'button' : undefined}
                tabIndex={onAchievementsClick ? 0 : undefined}
                onKeyDown={onAchievementsClick ? (e) => e.key === 'Enter' && onAchievementsClick() : undefined}
                className={cn(
                  "flex items-center justify-between p-3 rounded-neo border-2 bg-neo-pink/20 border-neo-pink/50",
                  onAchievementsClick && "cursor-pointer hover:bg-neo-pink/30 active:scale-[0.98] transition-all"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-neo bg-neo-pink flex items-center justify-center border-2 border-neo-black">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-xl text-neo-pink">
                      {achievementsUnlocked}
                    </div>
                    <div className="text-xs text-white/60 font-medium">
                      {achievementsUnlocked === 1
                        ? (t('results.achievementUnlocked') || 'Achievement Unlocked')
                        : (t('results.achievementsUnlocked') || 'Achievements Unlocked')}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                  className="text-2xl"
                >
                  🏆
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Victory badge for winners */}
          {isWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute -top-2 -right-2 w-12 h-12 bg-neo-lime rounded-full border-3 border-neo-black shadow-hard flex items-center justify-center"
            >
              <Star className="w-6 h-6 text-neo-black fill-neo-black" />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

RewardsSummary.displayName = 'RewardsSummary';

export default RewardsSummary;
