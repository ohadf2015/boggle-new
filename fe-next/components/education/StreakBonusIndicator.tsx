'use client';

/**
 * StreakBonusIndicator - Streak Display with Bonus Multiplier
 *
 * Displays the current streak count and XP bonus multiplier.
 * Uses neo-brutalist styling with subtle fire emoji animation.
 *
 * Streak bonus thresholds (from EDUCATION_XP_CONFIG):
 * - 7+ days: 1.5x (+50% XP)
 * - 14+ days: 1.75x (+75% XP)
 * - 30+ days: 2.0x (+100% XP / Double XP)
 */

import { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface StreakBonusIndicatorProps {
  /** Current streak count in days */
  currentStreak: number;
  /** Show bonus multiplier if streak >= 7 (default: true) */
  showBonus?: boolean;
  /** Display variant: badge or inline (default: 'badge') */
  variant?: 'badge' | 'inline';
  /** Size variant: sm or md (default: 'md') */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// STREAK BONUS CONFIGURATION
// ============================================

const STREAK_THRESHOLDS = [
  { days: 30, multiplier: 2.0, bonus: 100 },
  { days: 14, multiplier: 1.75, bonus: 75 },
  { days: 7, multiplier: 1.5, bonus: 50 },
] as const;

/**
 * Get the bonus percentage for a given streak
 * @returns Bonus percentage (50, 75, 100) or null if no bonus
 */
function getStreakBonus(streakDays: number): number | null {
  for (const threshold of STREAK_THRESHOLDS) {
    if (streakDays >= threshold.days) {
      return threshold.bonus;
    }
  }
  return null;
}

// ============================================
// SIZE CONFIGURATION
// ============================================

const SIZE_CONFIG = {
  sm: {
    text: 'text-xs',
    padding: 'px-2 py-1',
    emoji: 'text-base',
    gap: 'gap-1',
  },
  md: {
    text: 'text-sm',
    padding: 'px-3 py-1.5',
    emoji: 'text-xl',
    gap: 'gap-2',
  },
} as const;

// ============================================
// COMPONENT
// ============================================

const StreakBonusIndicator = memo<StreakBonusIndicatorProps>(({
  currentStreak,
  showBonus = true,
  variant = 'badge',
  size = 'md',
  className,
}) => {
  const { t } = useLanguage();
  const sizeConfig = SIZE_CONFIG[size];
  const bonus = useMemo(() => getStreakBonus(currentStreak), [currentStreak]);

  // Don't render if streak is 0 or less
  if (currentStreak < 1) {
    return null;
  }

  // Spelled-out screen-reader label so streak bonus isn't conveyed
  // by color alone (WCAG 1.4.1).
  const ariaLabel = bonus !== null
    ? `${currentStreak} day streak, +${bonus}% XP bonus`
    : `${currentStreak} day streak`;

  // Badge variant: Full styled badge
  if (variant === 'badge') {
    return (
      <m.div
        data-testid="streak-indicator"
        role="img"
        aria-label={ariaLabel}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' as const }}
        className={cn(
          // Base styles
          'inline-flex flex-col items-center',
          // Neo-brutalist styling
          'bg-neo-pink border-neo border-neo-black rounded-neo shadow-hard',
          sizeConfig.padding,
          className
        )}
      >
        {/* Top row: Fire emoji + streak count */}
        <div className={cn('flex items-center', sizeConfig.gap)}>
          <m.span
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut' as const,
            }}
            className={sizeConfig.emoji}
          >
            <Flame className="w-4 h-4" />
          </m.span>
          <span className={cn(
            'font-neo-display font-black text-neo-black',
            sizeConfig.text
          )}>
            {currentStreak}
          </span>
          <span className={cn(
            'font-neo-body font-bold text-neo-black',
            sizeConfig.text
          )}>
            {t('education.xp.streak')}
          </span>
        </div>

        {/* Bottom row: Bonus percentage (if applicable) */}
        {showBonus && bonus !== null && (
          <div className={cn(
            'font-neo-body font-black text-neo-black',
            size === 'sm' ? 'text-[10px]' : 'text-xs',
            'mt-0.5'
          )}>
            +{bonus}% XP
          </div>
        )}
      </m.div>
    );
  }

  // Inline variant: Compact inline display
  return (
    <m.div
      data-testid="streak-indicator"
      role="img"
      aria-label={ariaLabel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center',
        sizeConfig.gap,
        sizeConfig.text,
        className
      )}
    >
      <m.span
        animate={{ rotate: [0, -3, 3, 0] }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 4,
          ease: 'easeInOut' as const,
        }}
        className={sizeConfig.emoji}
      >
        <Flame className="w-4 h-4" />
      </m.span>
      <span className="font-neo-display font-black text-neo-pink">
        {currentStreak}
      </span>
      <span className="font-neo-body font-bold text-neo-black/70 dark:text-neo-white">
        {t('education.xp.streak')}
      </span>
      {showBonus && bonus !== null && (
        <span className="font-neo-body font-black text-neo-lime">
          (+{bonus}% XP)
        </span>
      )}
    </m.div>
  );
});

StreakBonusIndicator.displayName = 'StreakBonusIndicator';

export default StreakBonusIndicator;
