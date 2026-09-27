'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Flame, Zap, Crown, Gem, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { fireConfetti } from '@/utils/confettiUtils';
import useReducedMotion from '@/hooks/useReducedMotion';

interface WinStreakDisplayProps {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone?: boolean;
  previousStreak?: number;
  compact?: boolean;
}

const STREAK_TIERS = [
  { min: 1, emoji: '✨', icon: Star, bg: 'bg-neo-lime', text: 'text-neo-black', bar: 'bg-neo-lime', name: 'Starting' },
  { min: 3, emoji: '⚡', icon: Zap, bg: 'bg-neo-cyan', text: 'text-neo-black', bar: 'bg-neo-cyan', name: 'Hot' },
  { min: 7, emoji: '🔥', icon: Flame, bg: 'bg-neo-red', text: 'text-neo-black', bar: 'bg-neo-red', name: 'On Fire' },
  { min: 14, emoji: '💎', icon: Gem, bg: 'bg-neo-pink', text: 'text-neo-white', bar: 'bg-neo-pink', name: 'Epic' },
  { min: 30, emoji: '👑', icon: Crown, bg: 'bg-tier-gold', text: 'text-neo-black', bar: 'bg-tier-gold', name: 'Legendary' },
];

const getStreakTier = (streak: number) => {
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    const tier = STREAK_TIERS[i];
    if (tier && streak >= tier.min) {
      return tier;
    }
  }
  return null;
};

const getNextTier = (streak: number) => {
  for (const tier of STREAK_TIERS) {
    if (streak < tier.min) {
      return tier;
    }
  }
  return null;
};

const WinStreakDisplay = memo<WinStreakDisplayProps>(({
  currentStreak,
  bestStreak,
  isNewMilestone = false,
  previousStreak = 0,
  compact = false,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const inf = reducedMotion ? 0 : Infinity;
  const [showMilestone, setShowMilestone] = useState(false);
  const hasShownMilestoneRef = useRef(false);

  const tier = getStreakTier(currentStreak);
  const nextTier = getNextTier(currentStreak);
  const isNewBest = currentStreak > bestStreak && currentStreak > 1;

  // Check for milestone (tier change)
  const previousTier = getStreakTier(previousStreak);
  const tierChanged = tier && previousTier && tier.min > previousTier.min;

  useEffect(() => {
    if ((isNewMilestone || tierChanged || isNewBest) && !hasShownMilestoneRef.current) {
      hasShownMilestoneRef.current = true;
      setShowMilestone(true);

      // Trigger celebration confetti (skip in reduced-motion)
      if (!reducedMotion) fireConfetti({
        particleCount: 20,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });

      const timer = setTimeout(() => setShowMilestone(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewMilestone, tierChanged, isNewBest, reducedMotion]);

  if (currentStreak === 0) return null;

  const Icon = tier?.icon || Star;

  // Compact inline badge version - neo-brutalist style
  if (compact) {
    return (
      <m.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-neo-pill',
          'border-2 border-neo-black shadow-hard-sm',
          'text-sm font-bold',
          'bg-neo-red text-neo-black'
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="font-black">{currentStreak}</span>
        <span className="opacity-80">{t('growth.dayStreak')}</span>
        {tier && <span>{tier.emoji}</span>}
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      className={cn(
        'relative p-4 rounded-neo-lg border-3 border-neo-black overflow-hidden',
        'shadow-hard',
        'bg-neo-navy-light'
      )}
    >
      {/* Background pulse for milestones */}
      <AnimatePresence>
        {showMilestone && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className={cn('absolute inset-0 pointer-events-none', tier?.bg)}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Streak info */}
        <div className="flex items-center gap-3">
          {/* Animated icon with neo-brutalist badge */}
          <m.div
            animate={
              showMilestone
                ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }
                : { scale: [1, 1.05, 1] }
            }
            transition={{
              type: 'tween',
              duration: showMilestone ? 0.5 : 2,
              repeat: showMilestone ? 2 : inf,
              repeatDelay: showMilestone ? 0 : 1,
            }}
            className={cn(
              'p-2 rounded-neo border-2 border-neo-black shadow-hard-sm',
              tier?.bg || 'bg-neo-lime'
            )}
          >
            <Icon className={cn('w-6 h-6', tier?.text || 'text-neo-black')} />
          </m.div>

          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-2xl font-black',
                'text-neo-white'
              )}>
                {currentStreak}
              </span>
              <span className={cn(
                'text-sm font-bold',
                'text-neo-white'
              )}>
                {t('growth.dayStreak')}
              </span>
            </div>

            {tier && (
              <div className={cn(
                'text-xs font-bold flex items-center gap-1',
                'text-neo-white'
              )}>
                <span>{tier.emoji}</span>
                <span className="uppercase tracking-wide">{tier.name}</span>
                {isNewBest && (
                  <span className="ms-1 px-1.5 py-0.5 bg-neo-lime text-neo-black border border-neo-black rounded-neo text-[10px] uppercase font-black">
                    {t('growth.newBest')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="text-right">
            <div className={cn(
              'text-xs font-bold',
              'text-neo-white'
            )}>
              {t('growth.nextTier')}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-lg">{nextTier.emoji}</span>
              <span className={cn(
                'text-sm font-bold',
                'text-neo-white'
              )}>
                {nextTier.min - currentStreak} {t('growth.daysAway')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Neo-brutalist progress bar */}
      {nextTier && tier && (
        <div className="relative z-10 mt-3">
          <div className={cn(
            'h-3 rounded-neo-pill border-2 border-neo-black overflow-hidden',
            'bg-neo-navy-light'
          )}>
            <m.div
              initial={{ width: 0 }}
              animate={{
                // Add 1 to numerator so day 1 shows progress (not 0%)
                // Example: streak=1, tier.min=1, nextTier.min=3 → (1-1+1)/(3-1) = 50%
                width: `${((currentStreak - tier.min + 1) / (nextTier.min - tier.min)) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn('h-full', tier.bar)}
            />
          </div>
        </div>
      )}

      {/* Milestone celebration overlay - neo-brutalist */}
      <AnimatePresence>
        {showMilestone && (tierChanged || isNewBest) && (
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-neo-lg z-20',
              'bg-neo-navy/95'
            )}
          >
            <div className="text-center">
              <m.div
                animate={{ scale: [0.8, 1.2, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
                className={cn(
                  'inline-block text-4xl mb-2 p-3 rounded-neo-lg border-3 border-neo-black shadow-hard',
                  isNewBest ? 'bg-neo-lime' : tier?.bg
                )}
              >
                {isNewBest ? '🏆' : tier?.emoji}
              </m.div>
              <div className="text-neo-white font-black text-lg uppercase tracking-wide">
                {isNewBest
                  ? t('growth.newPersonalBest')
                  : `${tier?.name} ${t('growth.streakUnlocked')}`}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
});

WinStreakDisplay.displayName = 'WinStreakDisplay';

export default WinStreakDisplay;
