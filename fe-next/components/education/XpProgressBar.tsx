'use client';

/**
 * XpProgressBar - Education XP Progress Component
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
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getXpProgress, type XpProgress } from '@/backend/modules/xpManager';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface XpProgressBarProps {
  /** Total XP accumulated by the student */
  totalXp: number;
  /** Recent XP gain to highlight with pulse effect */
  recentXpGain?: number;
  /** Show level number (default: true) */
  showLevel?: boolean;
  /** Show "Next Level" preview (default: true) */
  showNextLevel?: boolean;
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

const XpProgressBar = memo<XpProgressBarProps>(({
  totalXp,
  recentXpGain,
  showLevel = true,
  showNextLevel = true,
  size = 'md',
  className,
}) => {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  // Calculate XP progress
  const progress: XpProgress = useMemo(() => {
    return getXpProgress(totalXp);
  }, [totalXp]);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const sizeConfig = SIZE_CONFIG[size];

  // Animation transition
  const progressTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.8, ease: 'easeOut' as const };

  return (
    <div
      data-testid="xp-progress-wrapper"
      className={cn('w-full', className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Level display row */}
      {showLevel && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-neo-display font-black text-neo-black dark:text-neo-white',
              sizeConfig.levelText
            )}>
              {t('education.xp.level')}
            </span>
            <span className={cn(
              'font-neo-display font-black text-neo-lime',
              sizeConfig.levelText
            )}>
              {progress.currentLevel}
            </span>
          </div>

          {/* XP values */}
          {!progress.isMaxLevel && (
            <div className="flex items-center gap-1">
              <span className={cn(
                'font-neo-body font-bold text-neo-black/70 dark:text-neo-white tabular-nums',
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
                'font-neo-body font-bold text-neo-black/70 dark:text-neo-white tabular-nums',
                sizeConfig.xpText
              )}>
                {progress.xpNeededForNextLevel}
              </span>
              <span className={cn(
                'font-neo-body text-neo-black/50 dark:text-neo-white',
                sizeConfig.xpText
              )}>
                {t('education.xp.xpLabel')}
              </span>
            </div>
          )}

          {/* Recent XP gain indicator */}
          {recentXpGain && recentXpGain > 0 && (
            <m.span
              data-testid="xp-recent-gain"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              initial={{ opacity: 1, scale: 1.2 }}
              animate={{ opacity: 0, scale: 1 }}
              transition={{ duration: 1.2 }}
              className={cn(
                'font-neo-body font-black text-neo-lime tabular-nums',
                sizeConfig.xpText
              )}
            >
              +{recentXpGain}
            </m.span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        data-testid="xp-progress-container"
        className={cn(
          'relative w-full rounded-neo overflow-hidden',
          'bg-neo-navy border-neo border-neo-black shadow-hard',
          sizeConfig.container,
          // RTL: Progress bar fill direction handled by CSS
          isRTL && 'rtl:shadow-hard-rtl'
        )}
      >
        {/* Progress fill - uses scaleX for compositor-only animation */}
        <m.div
          data-testid="xp-progress-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress.progressPercent / 100 }}
          transition={progressTransition}
          className={cn(
            'absolute inset-y-0 w-full',
            'bg-neo-lime',
            // RTL: transform origin on right side
            isRTL ? 'origin-right' : 'origin-left'
          )}
        />
        {/* Border overlay for fill edge */}
        {!progress.isMaxLevel && progress.progressPercent > 0 && (
          <div
            className={cn(
              'absolute inset-y-0 w-[3px] bg-neo-black',
              isRTL ? 'right-0' : 'left-0'
            )}
            style={{
              [isRTL ? 'right' : 'left']: `${progress.progressPercent}%`,
              transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)'
            }}
          />
        )}

        {/* Progress percentage text (centered) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            'font-neo-body font-black text-neo-black mix-blend-difference tabular-nums',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}>
            {progress.progressPercent}%
          </span>
        </div>
      </div>

      {/* Next level preview */}
      {showNextLevel && !progress.isMaxLevel && (
        <div className="flex items-center justify-between mt-2">
          <span className={cn(
            'font-neo-body text-neo-black/60 dark:text-neo-white',
            sizeConfig.xpText
          )}>
            {t('education.xp.nextLevel')}: {progress.currentLevel + 1}
          </span>
          <span className={cn(
            'font-neo-body text-neo-black/50 dark:text-neo-white',
            sizeConfig.xpText
          )}>
            {t('education.xp.keepGoing')}
          </span>
        </div>
      )}

      {/* Max level indicator */}
      {progress.isMaxLevel && (
        <div className="flex items-center justify-center mt-2">
          <span className={cn(
            'font-neo-display font-black text-neo-pink',
            sizeConfig.levelText
          )}>
            {t('education.xp.maxLevel')}
          </span>
        </div>
      )}
    </div>
  );
});

XpProgressBar.displayName = 'XpProgressBar';

export default XpProgressBar;
