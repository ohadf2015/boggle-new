'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  markAchievementEarned,
  type FirstTimeAchievementType,
} from '@/utils/multiplayerProgressStorage';
import { InlineConfetti } from '@/components/effects/InlineConfetti';

// Achievement configurations
const ACHIEVEMENT_CONFIG: Record<FirstTimeAchievementType, {
  title: string;
  emoji: string;
  color: string;
}> = {
  firstWord: {
    title: 'First word found!',
    emoji: '🎯',
    color: 'from-neo-lime to-neo-lime-dark',
  },
  firstCombo: {
    title: 'Combo unlocked!',
    emoji: '🔥',
    color: 'from-neo-pink to-neo-red',
  },
  firstLongWord: {
    title: 'Long word bonus!',
    emoji: '⭐',
    color: 'from-neo-lime-light to-neo-lime',
  },
  firstUniqueWord: {
    title: 'Unique find!',
    emoji: '💎',
    color: 'from-neo-purple to-neo-pink',
  },
};

interface FirstTimeAchievementProps {
  /** Current achievement to potentially trigger */
  achievementType: FirstTimeAchievementType | null;
  /** Callback when achievement is dismissed */
  onDismiss?: () => void;
  /** Position of the notification */
  position?: 'top' | 'center' | 'bottom';
  /** Additional class names */
  className?: string;
}

/**
 * FirstTimeAchievement - Shows brief celebrations for first-time achievements
 * Auto-dismisses after 2 seconds, only shows once per achievement type
 */
const FirstTimeAchievement = memo<FirstTimeAchievementProps>(({
  achievementType,
  onDismiss,
  position = 'top',
  className,
}) => {
  const [visible, setVisible] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<FirstTimeAchievementType | null>(null);

  // Check and show achievement
  useEffect(() => {
    if (achievementType) {
      // Try to mark as earned - returns true if this is the first time
      const isFirstTime = markAchievementEarned(achievementType);
      if (isFirstTime) {
        setCurrentAchievement(achievementType);
        setVisible(true);
      }
    }
  }, [achievementType]);

  // Auto-dismiss after 2 seconds
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const config = currentAchievement ? ACHIEVEMENT_CONFIG[currentAchievement] : null;

  const positionClasses = {
    top: 'top-[max(1rem,env(safe-area-inset-top,1rem))]',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-4',
  };

  return (
    <AnimatePresence>
      {visible && config && (
        <m.div
          initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? -20 : 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto',
            positionClasses[position],
            className
          )}
          onClick={handleDismiss}
        >
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl',
              'bg-linear-to-r shadow-hard border-2 border-neo-black',
              'cursor-pointer select-none',
              config.color
            )}
          >
            {/* Confetti burst on achievement */}
            <InlineConfetti size="sm" duration={1800} />

            {/* Emoji */}
            <m.span
              className="text-2xl"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ type: 'tween', duration: 0.5, ease: 'easeInOut' }}
            >
              {config.emoji}
            </m.span>

            {/* Text */}
            <span className="text-neo-black font-bold text-sm whitespace-nowrap drop-shadow-md">
              {config.title}
            </span>

            {/* Sparkle effect */}
            <m.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.5, times: [0, 0.5, 1] }}
              style={{
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 70%)',
              }}
            />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

FirstTimeAchievement.displayName = 'FirstTimeAchievement';

export default FirstTimeAchievement;

// Hook for easier integration
export function useFirstTimeAchievement() {
  const [pendingAchievement, setPendingAchievement] = useState<FirstTimeAchievementType | null>(null);

  const triggerAchievement = useCallback((type: FirstTimeAchievementType) => {
    setPendingAchievement(type);
  }, []);

  const clearAchievement = useCallback(() => {
    setPendingAchievement(null);
  }, []);

  return {
    pendingAchievement,
    triggerAchievement,
    clearAchievement,
  };
}
