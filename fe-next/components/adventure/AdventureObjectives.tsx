/**
 * AdventureObjectives Component
 *
 * Displays objective progress with icons, progress bars, and completion states.
 * Enhanced with animated progress bars and satisfying completion effects.
 */

'use client';

import React, { memo, useState, useEffect } from 'react';
import {
  Check,
  Target,
  Star,
  Snowflake,
  Clock,
  Gem,
  FileText,
  Swords,
  Heart,
  Zap,
  Shield,
} from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { OBJECTIVE_TRANSLATION_KEYS } from '@/lib/adventure/constants';
import type { LevelObjective, ObjectiveType } from '@/types/adventure';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';

// ==============================================
// TYPES
// ==============================================

interface AdventureObjectivesProps {
  /** Array of level objectives with progress */
  objectives: LevelObjective[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to show slide-in animation */
  showSlideIn?: boolean;
  /** Callback when slide-in animation completes */
  onSlideInComplete?: () => void;
}

// ==============================================
// CONSTANTS
// ==============================================

const OBJECTIVE_ICONS: Record<ObjectiveType, React.ComponentType<{ className?: string }>> = {
  // Regular level objectives
  wordCount: FileText,
  scoreTarget: Target,
  longWords: Star,
  clearIce: Snowflake,
  timeBonus: Clock,
  collectGems: Gem,
  // Boss level objectives
  defeatBoss: Swords,
  surviveBattle: Heart,
  mechanicTrigger: Zap,
  noDamage: Shield,
};

const OBJECTIVE_COLORS: Record<ObjectiveType, string> = {
  // Regular level objectives
  wordCount: 'text-neo-cyan',
  scoreTarget: 'text-neo-yellow',
  longWords: 'text-neo-purple',
  clearIce: 'text-neo-cyan',
  timeBonus: 'text-neo-lime',
  collectGems: 'text-neo-pink',
  // Boss level objectives - red/orange theme for battle
  defeatBoss: 'text-neo-red',
  surviveBattle: 'text-neo-pink',
  mechanicTrigger: 'text-neo-orange',
  noDamage: 'text-neo-lime',
};

// ==============================================
// COMPONENT
// ==============================================

const AdventureObjectives = memo<AdventureObjectivesProps>(
  ({ objectives, className, showSlideIn = false, onSlideInComplete }) => {
    const { language, t } = useLanguage();
    const { prefersReducedMotion } = useDevicePerformance();
    const isRTL = language === 'he';

    // Track animation completion
    const [animationComplete, setAnimationComplete] = useState(!showSlideIn);

    // Reset animation state when showSlideIn transitions to true
    useEffect(() => {
      if (showSlideIn && animationComplete) {
        setAnimationComplete(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally omit animationComplete to avoid infinite loop
    }, [showSlideIn]);

    // Calculate total animation time and call completion callback
    useEffect(() => {
      if (!showSlideIn || animationComplete) return;

      const totalTime = OPTIMIZED_TIMING.getObjectivesDuration(objectives.length);

      const timer = setTimeout(() => {
        setAnimationComplete(true);
        onSlideInComplete?.();
      }, totalTime);

      return () => clearTimeout(timer);
    }, [showSlideIn, animationComplete, objectives.length, onSlideInComplete]);

    // Handle reduced motion - complete immediately
    useEffect(() => {
      if (showSlideIn && prefersReducedMotion && !animationComplete) {
        setAnimationComplete(true);
        onSlideInComplete?.();
      }
    }, [showSlideIn, prefersReducedMotion, animationComplete, onSlideInComplete]);

    // Define animation variants for slide-in
    const slideVariants = {
      hidden: (isRTL: boolean) => ({
        x: isRTL ? -50 : 50,
        opacity: 0,
      }),
      visible: {
        x: 0,
        opacity: 1,
      },
    };

    return (
      <AdaptiveMotion.ul
        role="list"
        className={cn('flex flex-col gap-2', className)}
        aria-label={t('adventure.game.objectives')}
        initial={false}
        data-testid="objectives-list"
        data-animation-complete={animationComplete}
      >
        {objectives.map((objective, index) => {
          const Icon = OBJECTIVE_ICONS[objective.type];
          const translationKey = OBJECTIVE_TRANSLATION_KEYS[objective.type];
          const label = t(translationKey, { target: objective.target });
          const current = objective.current ?? 0;
          const progress = Math.min((current / objective.target) * 100, 100);
          const colorClass = OBJECTIVE_COLORS[objective.type];

          // Skip animation if not showing or reduced motion
          const shouldAnimate = showSlideIn && !prefersReducedMotion && !animationComplete;

          return (
            <AdaptiveMotion.li
              key={objective.type}
              data-testid={`objective-${objective.type}`}
              custom={isRTL}
              initial={shouldAnimate ? 'hidden' : 'visible'}
              animate="visible"
              variants={slideVariants}
              transition={
                shouldAnimate
                  ? {
                      type: 'spring',
                      stiffness: OPTIMIZED_TIMING.objectives.spring.stiffness,
                      damping: OPTIMIZED_TIMING.objectives.spring.damping,
                      delay: index * (OPTIMIZED_TIMING.objectives.staggerMs / 1000),
                    }
                  : { duration: 0 }
              }
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-neo',
                'border-3 transition-all duration-300',
                'shadow-hard-sm',
                objective.isPrimary && 'objective-primary',
                !objective.isPrimary && 'objective-secondary',
                objective.isComplete && 'objective-complete',
                // Background based on state
                objective.isComplete
                  ? 'bg-neo-lime/20 border-neo-lime'
                  : objective.isPrimary
                    ? 'bg-neo-yellow/10 border-neo-yellow/40'
                    : 'bg-neo-black/40 border-neo-white/10'
              )}
            >
              {/* Icon with background */}
              <AdaptiveMotion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn(
                  'shrink-0 w-9 h-9 flex items-center justify-center',
                  'rounded-neo border-2',
                  objective.isComplete
                    ? 'bg-neo-lime border-neo-black text-neo-black'
                    : objective.isPrimary
                      ? `bg-neo-black/50 border-neo-yellow/40 ${colorClass}`
                      : 'bg-neo-black/30 border-neo-white/20 text-neo-white'
                )}
              >
                <Icon className="w-4 h-4" />
              </AdaptiveMotion.div>

              {/* Label and Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'text-sm font-bold leading-snug break-words min-w-0',
                      objective.isComplete
                        ? 'text-neo-lime'
                        : objective.isPrimary
                          ? 'text-neo-white'
                          : 'text-neo-white'
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-mono font-black tabular-nums leading-snug',
                      objective.isComplete
                        ? 'text-neo-lime'
                        : 'text-neo-white'
                    )}
                  >
                    {current}/{objective.target}
                  </span>
                </div>

                {/* Enhanced Progress Bar */}
                <div
                  role="progressbar"
                  aria-valuenow={current}
                  aria-valuemax={objective.target}
                  aria-label={`${label} progress`}
                  className={cn(
                    'mt-1.5 h-2 rounded-full',
                    'bg-neo-black/50 overflow-hidden border border-neo-white/10'
                  )}
                >
                  <AdaptiveMotion.div
                    data-testid={`progress-bar-${objective.type}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full relative',
                      objective.isComplete
                        ? 'bg-neo-lime'
                        : objective.isPrimary
                          ? 'bg-linear-to-r from-neo-yellow to-neo-orange'
                          : 'bg-neo-white/50'
                    )}
                  >
                    {/* Shimmer effect on progress */}
                    {!objective.isComplete && progress > 0 && (
                      <AdaptiveMotion.div
                        className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </AdaptiveMotion.div>
                </div>
              </div>

              {/* Completion badge */}
              <AdaptiveAnimatePresence>
                {objective.isComplete && (
                  <AdaptiveMotion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className={cn(
                      'shrink-0 w-7 h-7 flex items-center justify-center',
                      'rounded-full bg-neo-lime border-2 border-neo-black shadow-hard-sm'
                    )}
                  >
                    <Check className="w-4 h-4 text-neo-black" strokeWidth={3} />
                  </AdaptiveMotion.div>
                )}
              </AdaptiveAnimatePresence>
            </AdaptiveMotion.li>
          );
        })}
      </AdaptiveMotion.ul>
    );
  }
);

AdventureObjectives.displayName = 'AdventureObjectives';

export default AdventureObjectives;
