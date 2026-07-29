'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Mascot } from '@/components/ui/Mascot';
import { MINDBLOWN_PROGRESS_THRESHOLD } from '@/utils/mascotConfig';

interface AchievementProgress {
  key: string;
  icon: string;
  name: string;
  current: number;
  target: number;
  percentage: number;
}

interface AchievementProgressTrackerProps {
  validWordCount: number;
  comboLevel: number;
  maxCombo: number;
  wordLengths: number[];
  timeSinceStart: number;
  gameDuration: number;
  earnedAchievements: string[];
  isGameOver?: boolean; // When true, auto-dismiss after 2 seconds
  className?: string;
}

// Duration in ms before each achievement auto-dismisses in single player
const AUTO_DISMISS_MS = 3000;

/**
 * AchievementProgressTracker - Shows near-completion achievements during gameplay
 *
 * Displays a small panel showing 2-3 achievements the player is close to unlocking.
 * Only shows achievements that are 50%+ complete to avoid clutter.
 * In single player mode: auto-dismisses after 3 seconds, or when clicked.
 */
export const AchievementProgressTracker: React.FC<AchievementProgressTrackerProps> = ({
  validWordCount,
  comboLevel,
  maxCombo,
  wordLengths,
  timeSinceStart,
  gameDuration,
  earnedAchievements,
  isGameOver = false,
  className,
}) => {
  const { t } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  // Track which individual achievements have been dismissed (by click or auto-dismiss)
  const [dismissedAchievements, setDismissedAchievements] = useState<Set<string>>(new Set());
  // Track when each achievement was first shown for auto-dismiss
  const shownAtRef = useRef<Record<string, number>>({});

  // Auto-dismiss after 2 seconds when game ends
  useEffect(() => {
    if (isGameOver && !isDismissed) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isGameOver, isDismissed]);

  // Handle clicking on an achievement to dismiss it
  const handleDismiss = useCallback((key: string) => {
    setDismissedAchievements(prev => new Set([...prev, key]));
  }, []);

  // Calculate achievement progress for all trackable achievements
  const achievementProgress = useMemo<AchievementProgress[]>(() => {
    const progress: AchievementProgress[] = [];

    // Word count achievements
    if (!earnedAchievements.includes('WORDSMITH') && validWordCount >= 25) {
      progress.push({
        key: 'WORDSMITH',
        icon: '🎓',
        name: t('achievements.WORDSMITH.name'),
        current: validWordCount,
        target: 50,
        percentage: (validWordCount / 50) * 100,
      });
    }

    if (!earnedAchievements.includes('LEXICON') && validWordCount >= 35) {
      progress.push({
        key: 'LEXICON',
        icon: '🏆',
        name: t('achievements.LEXICON.name'),
        current: validWordCount,
        target: 65,
        percentage: (validWordCount / 65) * 100,
      });
    }

    if (!earnedAchievements.includes('VOCABULARY_TITAN') && validWordCount >= 30) {
      progress.push({
        key: 'VOCABULARY_TITAN',
        icon: '🗿',
        name: t('achievements.VOCABULARY_TITAN.name'),
        current: validWordCount,
        target: 60,
        percentage: (validWordCount / 60) * 100,
      });
    }

    // Combo achievements
    const currentCombo = Math.max(comboLevel, maxCombo);
    if (!earnedAchievements.includes('COMBO_KING') && currentCombo >= 10) {
      progress.push({
        key: 'COMBO_KING',
        icon: '🔥',
        name: t('achievements.COMBO_KING.name'),
        current: currentCombo,
        target: 25,
        percentage: (currentCombo / 25) * 100,
      });
    }

    if (!earnedAchievements.includes('COMBO_GOD') && currentCombo >= 13) {
      progress.push({
        key: 'COMBO_GOD',
        icon: '👑',
        name: t('achievements.COMBO_GOD.name'),
        current: currentCombo,
        target: 25,
        percentage: (currentCombo / 25) * 100,
      });
    }

    // Speed Demon (time-scaled)
    const halfGameTime = gameDuration * 0.5;
    const speedDemonThreshold = Math.ceil(40 * (gameDuration / 180));
    if (!earnedAchievements.includes('SPEED_DEMON') &&
        timeSinceStart <= halfGameTime &&
        validWordCount >= speedDemonThreshold * 0.5) {
      progress.push({
        key: 'SPEED_DEMON',
        icon: '⚡',
        name: t('achievements.SPEED_DEMON.name'),
        current: validWordCount,
        target: speedDemonThreshold,
        percentage: (validWordCount / speedDemonThreshold) * 100,
      });
    }

    // Word Master (7+ letter word)
    const hasSevenPlusLetter = wordLengths.some(len => len >= 7);
    if (!earnedAchievements.includes('WORD_MASTER') && !hasSevenPlusLetter && validWordCount >= 20) {
      progress.push({
        key: 'WORD_MASTER',
        icon: '📚',
        name: t('achievements.WORD_MASTER.name'),
        current: Math.max(...wordLengths, 0),
        target: 7,
        percentage: (Math.max(...wordLengths, 0) / 7) * 100,
      });
    }

    // Treasure Hunter (8+ letter word)
    const hasEightPlusLetter = wordLengths.some(len => len >= 8);
    if (!earnedAchievements.includes('TREASURE_HUNTER') && !hasEightPlusLetter && hasSevenPlusLetter) {
      progress.push({
        key: 'TREASURE_HUNTER',
        icon: '💎',
        name: t('achievements.TREASURE_HUNTER.name'),
        current: Math.max(...wordLengths, 0),
        target: 8,
        percentage: (Math.max(...wordLengths, 0) / 8) * 100,
      });
    }

    // Sort by completion percentage (highest first) and filter to show only 50%+
    return progress
      .filter(p => p.percentage >= 50 && p.percentage < 100)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3); // Show max 3 achievements
  }, [validWordCount, comboLevel, maxCombo, wordLengths, timeSinceStart, gameDuration, earnedAchievements, t]);

  // Filter out dismissed achievements
  const visibleAchievements = useMemo(() => {
    return achievementProgress.filter(p => !dismissedAchievements.has(p.key));
  }, [achievementProgress, dismissedAchievements]);

  // Show mindblown mascot when any visible achievement is near completion
  const hasNearMilestone = visibleAchievements.some(
    (a) => a.percentage >= MINDBLOWN_PROGRESS_THRESHOLD
  );

  // Auto-dismiss achievements after 3 seconds
  useEffect(() => {
    if (isGameOver) return; // Don't set up individual timers if game is over (global dismiss handles it)

    const now = Date.now();
    const timers: NodeJS.Timeout[] = [];

    visibleAchievements.forEach(achievement => {
      // Track when this achievement was first shown
      if (!shownAtRef.current[achievement.key]) {
        shownAtRef.current[achievement.key] = now;
      }

      const shownAt = shownAtRef.current[achievement.key];
      const elapsed = now - shownAt;
      const remaining = AUTO_DISMISS_MS - elapsed;

      if (remaining > 0) {
        const timer = setTimeout(() => {
          handleDismiss(achievement.key);
        }, remaining);
        timers.push(timer);
      } else {
        // Already expired, dismiss immediately
        handleDismiss(achievement.key);
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [visibleAchievements, isGameOver, handleDismiss]);

  // Don't render if no visible achievements or globally dismissed
  if (visibleAchievements.length === 0 || isDismissed) {
    return null;
  }

  return (
    <div className={cn("fixed bottom-[calc(5rem+var(--admob-banner-height,0px))] ltr:right-4 rtl:left-4 z-40 space-y-2", className)}>
      {hasNearMilestone && (
        <div className="flex justify-center my-1">
          <Mascot variant={hasNearMilestone ? 'mindblown' : 'encouraging'} size="xs" animated clipBorder="none" />
        </div>
      )}
      <AnimatePresence>
        {visibleAchievements.map((progress) => (
          <m.div
            key={progress.key}
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => handleDismiss(progress.key)}
            className="bg-neo-navy border-2 border-neo-cyan rounded-neo px-3 py-2 shadow-hard-sm max-w-[200px] cursor-pointer hover:border-neo-pink transition-colors"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{progress.icon}</span>
              <span className="text-xs font-bold text-neo-cyan truncate">
                {progress.name}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neo-black/40 rounded-full h-2 overflow-hidden border border-neo-black/60">
              <m.div
                className="h-full bg-linear-to-r from-neo-cyan to-neo-pink"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress.percentage, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            {/* Progress Text */}
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs font-bold text-neo-white">
                {progress.current}/{progress.target}
              </span>
              <span className="text-xs font-bold text-neo-lime">
                {Math.round(progress.percentage)}%
              </span>
            </div>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AchievementProgressTracker;
