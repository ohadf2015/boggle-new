/**
 * AdventureObjectives Component
 *
 * Displays objective progress with icons, progress bars, and completion states.
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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { OBJECTIVE_TRANSLATION_KEYS } from '@/lib/adventure/constants';
import type { LevelObjective, ObjectiveType } from '@/types/adventure';

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
  wordCount: FileText,
  scoreTarget: Target,
  longWords: Star,
  clearIce: Snowflake,
  timeBonus: Clock,
  collectGems: Gem,
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
    // This handles the case where component renders first with showSlideIn=false
    // (during cascade phase), then showSlideIn becomes true (objectives phase)
    useEffect(() => {
      if (showSlideIn && animationComplete) {
        setAnimationComplete(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally omit animationComplete to avoid infinite loop
    }, [showSlideIn]);

    // Calculate total animation time and call completion callback
    useEffect(() => {
      if (!showSlideIn || animationComplete) return;

      // Calculate total animation time: each objective staggers 100ms + 300ms duration
      const totalTime = objectives.length * 100 + 300;

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
      <motion.ul
        role="list"
        className={cn('flex flex-col gap-2', className)}
        aria-label="Level objectives"
        initial={false}
        data-testid="objectives-list"
        data-animation-complete={animationComplete}
      >
        {objectives.map((objective, index) => {
          const Icon = OBJECTIVE_ICONS[objective.type];
          const translationKey = OBJECTIVE_TRANSLATION_KEYS[objective.type];
          const label = t(translationKey);
          const current = objective.current ?? 0;
          const progress = Math.min((current / objective.target) * 100, 100);

          // Skip animation if not showing or reduced motion
          const shouldAnimate = showSlideIn && !prefersReducedMotion && !animationComplete;

          return (
            <motion.li
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
                      stiffness: 400,
                      damping: 30,
                      delay: index * 0.1, // 100ms stagger between objectives
                    }
                  : { duration: 0 }
              }
              className={cn(
                'flex items-center gap-2 p-2 rounded-neo',
                'border-2 border-neo-black/20',
                'transition-all duration-300',
                objective.isPrimary && 'objective-primary',
                !objective.isPrimary && 'objective-secondary',
                objective.isComplete && 'objective-complete',
                // Background based on state
                objective.isComplete
                  ? 'bg-neo-lime/20 border-neo-lime/40'
                  : objective.isPrimary
                    ? 'bg-neo-yellow/10 border-neo-yellow/30'
                    : 'bg-neo-white/5 border-neo-white/10'
              )}
            >
              {/* Icon */}
              <div
                data-testid={`icon-${objective.type}`}
                className={cn(
                  'flex-shrink-0 w-8 h-8 flex items-center justify-center',
                  'rounded-neo border-2 border-neo-black/30',
                  objective.isComplete
                    ? 'bg-neo-lime text-neo-black'
                    : objective.isPrimary
                      ? 'bg-neo-yellow/20 text-neo-yellow'
                      : 'bg-neo-white/10 text-neo-white/60'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Label and Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-sm font-bold truncate',
                      objective.isComplete
                        ? 'text-neo-lime'
                        : objective.isPrimary
                          ? 'text-neo-white'
                          : 'text-neo-white/70'
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-mono font-bold',
                      objective.isComplete
                        ? 'text-neo-lime'
                        : 'text-neo-white/80'
                    )}
                  >
                    {current}/{objective.target}
                  </span>
                </div>

                {/* Progress Bar */}
                <div
                  role="progressbar"
                  aria-valuenow={current}
                  aria-valuemax={objective.target}
                  aria-label={`${label} progress`}
                  className={cn(
                    'mt-1 h-1.5 rounded-full',
                    'bg-neo-black/30 overflow-hidden'
                  )}
                >
                  <div
                    data-testid={`progress-bar-${objective.type}`}
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      objective.isComplete
                        ? 'bg-neo-lime'
                        : objective.isPrimary
                          ? 'bg-neo-yellow'
                          : 'bg-neo-white/50'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Checkmark for completed */}
              {objective.isComplete && (
                <div
                  data-testid={`checkmark-${objective.type}`}
                  className={cn(
                    'flex-shrink-0 w-6 h-6 flex items-center justify-center',
                    'rounded-full bg-neo-lime text-neo-black'
                  )}
                >
                  <Check className="w-4 h-4" strokeWidth={3} />
                </div>
              )}
            </motion.li>
          );
        })}
      </motion.ul>
    );
  }
);

AdventureObjectives.displayName = 'AdventureObjectives';

export default AdventureObjectives;
