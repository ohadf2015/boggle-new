'use client';

/**
 * AdventureXpProgressBar - Adventure XP Progress Component
 *
 * Displays current level and progress percentage with neo-brutalist styling.
 * Uses Framer Motion for smooth progress animations.
 *
 * Features:
 * - Animated progress bar fill
 * - Recent XP gain highlight with pulse effect
 * - RTL support for Hebrew
 * - Reduced motion preference support
 */

import { memo, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getXpProgress, type AdventureXpProgress } from '@/shared/utils/adventureXpUtils';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AdventureXpProgressBarProps {
  /** Total XP accumulated by the player */
  totalXp: number;
  /** Recent XP gain to highlight with pulse effect */
  recentXpGain?: number;
  /** Size variant: sm (24px), md (32px), lg (40px) */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// SIZE CONFIGURATION
// ============================================

const SIZE_CONFIG = {
  sm: {
    container: 'h-6',
    bar: 'h-4',
    levelText: 'text-sm',
    xpText: 'text-xs',
  },
  md: {
    container: 'h-8',
    bar: 'h-5',
    levelText: 'text-base',
    xpText: 'text-sm',
  },
  lg: {
    container: 'h-10',
    bar: 'h-6',
    levelText: 'text-lg',
    xpText: 'text-base',
  },
} as const;

// ============================================
// COMPONENT
// ============================================

const AdventureXpProgressBar = memo<AdventureXpProgressBarProps>(({
  totalXp,
  recentXpGain,
  size = 'md',
  className,
}) => {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  // Calculate XP progress
  const progress: AdventureXpProgress = useMemo(() => {
    return getXpProgress(totalXp);
  }, [totalXp]);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const sizeConfig = SIZE_CONFIG[size];

  // Animation variants
  const progressAnimation = prefersReducedMotion
    ? { width: `${progress.progressPercent}%` }
    : { width: `${progress.progressPercent}%` };

  const progressTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.8, ease: 'easeOut' as const };

  return (
    <div
      data-testid="adventure-xp-progress-wrapper"
      className={cn('w-full', className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Level display row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-neo-display font-black text-neo-black dark:text-neo-white',
            sizeConfig.levelText
          )}>
            {t('adventure.xp.level')}
          </span>
          <span className={cn(
            'font-neo-display font-black text-neo-yellow',
            sizeConfig.levelText
          )}>
            {progress.currentLevel}
          </span>
        </div>

        {/* XP values */}
        {!progress.isMaxLevel && (
          <div className="flex items-center gap-1">
            <span className={cn(
              'font-neo-body font-bold text-neo-black/70 dark:text-neo-white',
              sizeConfig.xpText
            )}>
              {progress.xpInCurrentLevel}
            </span>
            <span className={cn(
              'font-neo-body text-neo-black/50 dark:text-neo-white',
              sizeConfig.xpText
            )}>
              /
            </span>
            <span className={cn(
              'font-neo-body font-bold text-neo-black/70 dark:text-neo-white',
              sizeConfig.xpText
            )}>
              {progress.xpNeededForNextLevel}
            </span>
            <span className={cn(
              'font-neo-body text-neo-black/50 dark:text-neo-white',
              sizeConfig.xpText
            )}>
              {t('adventure.xp.label')}
            </span>
          </div>
        )}

        {/* Recent XP gain indicator */}
        {recentXpGain && recentXpGain > 0 && (
          <AdaptiveMotion.span
            initial={{ opacity: 1, scale: 1.2 }}
            animate={{ opacity: 0, scale: 1 }}
            transition={{ duration: 1.2 }}
            className={cn(
              'font-neo-body font-black text-neo-lime',
              sizeConfig.xpText
            )}
          >
            +{recentXpGain}
          </AdaptiveMotion.span>
        )}
      </div>

      {/* Progress bar container */}
      <div
        data-testid="adventure-xp-progress-container"
        className={cn(
          'relative w-full rounded-neo overflow-hidden',
          'bg-neo-navy border-neo border-neo-black shadow-hard',
          sizeConfig.container,
          // RTL: Progress bar fill direction handled by CSS
          isRTL && 'rtl:shadow-hard-rtl'
        )}
      >
        {/* Progress fill */}
        <AdaptiveMotion.div
          data-testid="adventure-xp-progress-fill"
          initial={{ width: 0 }}
          animate={progressAnimation}
          transition={progressTransition}
          className={cn(
            'absolute inset-y-0',
            'bg-neo-cyan',
            // Border on the right edge of fill (left for RTL)
            !progress.isMaxLevel && (isRTL ? 'border-l-neo border-neo-black' : 'border-r-neo border-neo-black'),
            // RTL: Start from right
            isRTL ? 'right-0' : 'left-0'
          )}
          style={{ width: `${progress.progressPercent}%` }}
        />

        {/* Progress percentage text (centered) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            'font-neo-body font-black text-neo-black mix-blend-difference',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}>
            {progress.progressPercent}%
          </span>
        </div>
      </div>

      {/* Max level indicator */}
      {progress.isMaxLevel && (
        <div className="flex items-center justify-center mt-2">
          <span className={cn(
            'font-neo-display font-black text-neo-pink',
            sizeConfig.levelText
          )}>
            {t('adventure.xp.maxLevel')}
          </span>
        </div>
      )}
    </div>
  );
});

AdventureXpProgressBar.displayName = 'AdventureXpProgressBar';

export default AdventureXpProgressBar;
