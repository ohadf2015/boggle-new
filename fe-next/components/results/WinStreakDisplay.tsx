'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFire, FaBolt, FaCrown, FaGem, FaStar } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../utils/ThemeContext';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';

interface WinStreakDisplayProps {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone?: boolean;
  previousStreak?: number;
  compact?: boolean;
}

const STREAK_TIERS = [
  { min: 1, emoji: '✨', icon: FaStar, color: 'yellow', name: 'Starting' },
  { min: 3, emoji: '⚡', icon: FaBolt, color: 'blue', name: 'Hot' },
  { min: 7, emoji: '🔥', icon: FaFire, color: 'orange', name: 'On Fire' },
  { min: 14, emoji: '💎', icon: FaGem, color: 'purple', name: 'Epic' },
  { min: 30, emoji: '👑', icon: FaCrown, color: 'gold', name: 'Legendary' },
];

const getStreakTier = (streak: number) => {
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (streak >= STREAK_TIERS[i].min) {
      return STREAK_TIERS[i];
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

const WinStreakDisplay: React.FC<WinStreakDisplayProps> = ({
  currentStreak,
  bestStreak,
  isNewMilestone = false,
  previousStreak = 0,
  compact = false,
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
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

      // Trigger celebration confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });

      const timer = setTimeout(() => setShowMilestone(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewMilestone, tierChanged, isNewBest]);

  if (currentStreak === 0) return null;

  const Icon = tier?.icon || FaStar;

  // Compact inline badge version
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
          isDarkMode
            ? 'bg-orange-900/30 text-orange-400 border border-orange-500/30'
            : 'bg-orange-50 text-orange-600 border border-orange-200'
        )}
      >
        <Icon className="text-base" />
        <span className="font-bold">{currentStreak}</span>
        <span className="opacity-75">{t('growth.dayStreak') || 'day streak'}</span>
        {tier && <span>{tier.emoji}</span>}
      </motion.div>
    );
  }

  const colorClasses = {
    yellow: {
      bg: isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50',
      border: 'border-yellow-500/40',
      text: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
      glow: 'shadow-yellow-500/20',
    },
    blue: {
      bg: isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50',
      border: 'border-blue-500/40',
      text: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      glow: 'shadow-blue-500/20',
    },
    orange: {
      bg: isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50',
      border: 'border-orange-500/40',
      text: isDarkMode ? 'text-orange-400' : 'text-orange-600',
      glow: 'shadow-orange-500/30',
    },
    purple: {
      bg: isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50',
      border: 'border-purple-500/40',
      text: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      glow: 'shadow-purple-500/30',
    },
    gold: {
      bg: isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50',
      border: 'border-amber-500/40',
      text: isDarkMode ? 'text-amber-400' : 'text-amber-600',
      glow: 'shadow-amber-500/30',
    },
  };

  const colors = colorClasses[tier?.color as keyof typeof colorClasses] || colorClasses.yellow;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      className={cn(
        'relative p-4 rounded-xl border-2 overflow-hidden',
        colors.bg,
        colors.border,
        showMilestone && `shadow-lg ${colors.glow}`
      )}
    >
      {/* Background glow for milestones */}
      <AnimatePresence>
        {showMilestone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-4">
        {/* Streak info */}
        <div className="flex items-center gap-3">
          {/* Animated icon */}
          <motion.div
            animate={
              showMilestone
                ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }
                : { scale: [1, 1.05, 1] }
            }
            transition={{
              duration: showMilestone ? 0.5 : 2,
              repeat: showMilestone ? 2 : Infinity,
              repeatDelay: showMilestone ? 0 : 1,
            }}
          >
            <Icon className={cn('text-3xl', colors.text)} />
          </motion.div>

          <div>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-black', colors.text)}>
                {currentStreak}
              </span>
              <span className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
                {t('growth.dayStreak') || 'day streak'}
              </span>
            </div>

            {tier && (
              <div className={cn('text-xs font-medium', colors.text)}>
                {tier.emoji} {tier.name}
                {isNewBest && (
                  <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded text-[10px] uppercase font-bold">
                    {t('growth.newBest') || 'New Best!'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="text-right">
            <div className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
              {t('growth.nextTier') || 'Next tier'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{nextTier.emoji}</span>
              <span className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
                {nextTier.min - currentStreak} {t('growth.winsAway') || 'wins away'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar to next tier */}
      {nextTier && tier && (
        <div className="mt-3">
          <div className={cn('h-1.5 rounded-full overflow-hidden', isDarkMode ? 'bg-gray-700' : 'bg-gray-200')}>
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${((currentStreak - tier.min) / (nextTier.min - tier.min)) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn('h-full rounded-full', {
                'bg-yellow-500': tier.color === 'yellow',
                'bg-blue-500': tier.color === 'blue',
                'bg-orange-500': tier.color === 'orange',
                'bg-purple-500': tier.color === 'purple',
                'bg-amber-500': tier.color === 'gold',
              })}
            />
          </div>
        </div>
      )}

      {/* Milestone celebration overlay */}
      <AnimatePresence>
        {showMilestone && (tierChanged || isNewBest) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.4 }}
                className="text-4xl mb-2"
              >
                {isNewBest ? '🏆' : tier?.emoji}
              </motion.div>
              <div className="text-white font-bold text-lg">
                {isNewBest
                  ? t('growth.newPersonalBest') || 'New Personal Best!'
                  : `${tier?.name} ${t('growth.streakUnlocked') || 'Streak Unlocked!'}`}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WinStreakDisplay;
