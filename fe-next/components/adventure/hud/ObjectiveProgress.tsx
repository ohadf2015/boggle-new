/**
 * ObjectiveProgress Component
 *
 * Displays determinate progress bars for level objectives.
 * Shows 1-3 objectives with icons, labels, progress, and completion states.
 * 
 * Enhanced with:
 * - Color-coded objective types
 * - Animated progress transitions
 * - Better visual hierarchy
 * - Completion celebration effects
 */

'use client';

import { memo, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Check, Target, FileText, Zap, Clock, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ObjectiveProgressProps {
  objectives: Array<{
    id: string;
    type: 'score' | 'words' | 'time' | 'combo';
    target: number;
    current: number;
    label: string;
  }>;
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const OBJECTIVE_ICONS = {
  score: Target,
  words: FileText,
  time: Clock,
  combo: Zap,
} as const;

/** Color schemes for different objective types */
const OBJECTIVE_COLORS = {
  score: {
    bg: 'bg-neo-yellow/20',
    border: 'border-neo-yellow/60',
    iconBg: 'bg-neo-yellow',
    text: 'text-neo-yellow',
    progress: 'yellow',
  },
  words: {
    bg: 'bg-neo-cyan/20',
    border: 'border-neo-cyan/60',
    iconBg: 'bg-neo-cyan',
    text: 'text-neo-cyan',
    progress: 'cyan',
  },
  time: {
    bg: 'bg-neo-lime/20',
    border: 'border-neo-lime/60',
    iconBg: 'bg-neo-lime',
    text: 'text-neo-lime',
    progress: 'lime',
  },
  combo: {
    bg: 'bg-neo-pink/20',
    border: 'border-neo-pink/60',
    iconBg: 'bg-neo-pink',
    text: 'text-neo-pink',
    progress: 'pink',
  },
} as const;

/** Type for objective colors */
type ObjectiveType = keyof typeof OBJECTIVE_COLORS;

// ============================================
// COMPONENT
// ============================================

export const ObjectiveProgress = memo<ObjectiveProgressProps>(
  ({ objectives, className }) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const { t } = useLanguage();

    // Calculate progress for each objective
    const objectivesWithProgress = useMemo(() => {
      return objectives.map((obj) => {
        const progress = Math.min((obj.current / obj.target) * 100, 100);
        const isComplete = obj.current >= obj.target;
        return {
          ...obj,
          progress,
          isComplete,
        };
      });
    }, [objectives]);

    if (objectives.length === 0) {
      return (
        <ul
          role="list"
          className={cn('flex flex-col gap-2', className)}
          aria-label={t('adventure.game.objectives')}
        />
      );
    }

    // Check if all objectives are complete
    const allComplete = objectivesWithProgress.every((obj) => obj.isComplete);

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {/* All Complete Banner */}
        <AdaptiveAnimatePresence>
          {allComplete && (
            <AdaptiveMotion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex items-center justify-center gap-2 px-3 py-1.5',
                'bg-neo-lime/20 border-2 border-neo-lime rounded-neo',
                'text-neo-lime font-neo-display font-bold text-sm'
              )}
            >
              <Trophy className="w-4 h-4" />
              <span>{t('adventure.game.allObjectivesComplete')}</span>
              <Sparkles className="w-4 h-4" />
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        <ul
          role="list"
          className="flex flex-col gap-1.5"
          aria-label={t('adventure.game.objectives')}
        >
          {objectivesWithProgress.map((objective) => {
            const Icon = OBJECTIVE_ICONS[objective.type];
            const colors = OBJECTIVE_COLORS[objective.type as ObjectiveType] ?? OBJECTIVE_COLORS.score;

            return (
              <li
                key={objective.id}
                data-testid={`objective-${objective.id}`}
                className={cn(
                  'flex items-center gap-2 p-1.5',
                  'rounded-neo border-2',
                  'transition-all duration-300',
                  objective.isComplete
                    ? 'objective-complete bg-neo-lime/10 border-neo-lime/80'
                    : `${colors.bg} ${colors.border}`
                )}
              >
                {/* Icon */}
                <AdaptiveMotion.div
                  data-testid={`icon-${objective.type}`}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                  className={cn(
                    'shrink-0 w-6 h-6 flex items-center justify-center',
                    'rounded-neo border-2 transition-colors duration-300',
                    objective.isComplete
                      ? 'bg-neo-lime border-neo-black text-neo-black'
                      : `${colors.iconBg} border-neo-black text-neo-black`
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </AdaptiveMotion.div>

                {/* Label and Progress */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  {/* Label and value row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-xs font-neo-body font-bold truncate',
                        objective.isComplete
                          ? 'text-neo-lime'
                          : colors.text
                      )}
                    >
                      {objective.label}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-mono font-bold whitespace-nowrap tabular-nums',
                        objective.isComplete ? 'text-neo-lime' : 'text-neo-white'
                      )}
                    >
                      {objective.current}/{objective.target}
                    </span>
                  </div>

                  {/* Progress bar with animation */}
                  <div className="relative h-1.5 bg-neo-black/30 rounded-full overflow-hidden">
                    <AdaptiveMotion.div
                      data-testid={`progress-${objective.id}`}
                      className={cn(
                        'absolute inset-y-0 start-0 rounded-full',
                        objective.isComplete
                          ? 'bg-neo-lime'
                          : colors.iconBg
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${objective.progress}%` }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { duration: 0.5, ease: 'easeOut' }
                      }
                      role="progressbar"
                      aria-valuenow={objective.current}
                      aria-valuemax={objective.target}
                      aria-label={`${objective.label} progress`}
                    />
                  </div>
                </div>

                {/* Checkmark for completed objectives */}
                <AdaptiveAnimatePresence>
                  {objective.isComplete && (
                    <AdaptiveMotion.div
                      data-testid={`checkmark-${objective.id}`}
                      initial={prefersReducedMotion ? false : { scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 400, damping: 15 }
                      }
                      className={cn(
                        'shrink-0 w-5 h-5 flex items-center justify-center',
                        'rounded-full bg-neo-lime text-neo-black shadow-hard-sm'
                      )}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </AdaptiveMotion.div>
                  )}
                </AdaptiveAnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
);

ObjectiveProgress.displayName = 'ObjectiveProgress';
