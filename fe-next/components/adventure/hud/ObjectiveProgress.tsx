/**
 * ObjectiveProgress Component
 *
 * Displays determinate progress bars for level objectives.
 * Shows 1-3 objectives with icons, labels, progress, and completion states.
 */

'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Target, FileText, Zap, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

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

// ============================================
// COMPONENT
// ============================================

export const ObjectiveProgress = memo<ObjectiveProgressProps>(
  ({ objectives, className }) => {
    const prefersReducedMotion = usePrefersReducedMotion();

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
          aria-label="Level objectives"
        />
      );
    }

    return (
      <ul
        role="list"
        className={cn('flex flex-col gap-2', className)}
        aria-label="Level objectives"
      >
        {objectivesWithProgress.map((objective) => {
          const Icon = OBJECTIVE_ICONS[objective.type];

          return (
            <li
              key={objective.id}
              data-testid={`objective-${objective.id}`}
              className={cn(
                'flex items-center gap-2 p-2',
                'rounded-neo border-2',
                'bg-neo-navy/80',
                'transition-all duration-300',
                objective.isComplete
                  ? 'border-neo-lime/60 objective-complete'
                  : 'border-neo-white/20'
              )}
            >
              {/* Icon */}
              <div
                data-testid={`icon-${objective.type}`}
                className={cn(
                  'flex-shrink-0 w-6 h-6 flex items-center justify-center',
                  'rounded-neo border-2',
                  objective.isComplete
                    ? 'bg-neo-lime border-neo-black text-neo-black'
                    : 'bg-neo-cyan/20 border-neo-cyan/60 text-neo-cyan'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Label and Progress */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                {/* Label and value row */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-xs font-neo-body font-bold truncate',
                      objective.isComplete
                        ? 'text-neo-lime'
                        : 'text-neo-white'
                    )}
                  >
                    {objective.label}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-mono font-bold whitespace-nowrap',
                      objective.isComplete ? 'text-neo-lime' : 'text-neo-white/80'
                    )}
                  >
                    {objective.current}/{objective.target}
                  </span>
                </div>

                {/* Progress bar using determinate Progress component */}
                <Progress
                  data-testid={`progress-${objective.id}`}
                  value={objective.progress}
                  size="sm"
                  variant={objective.isComplete ? 'success' : 'cyan'}
                  className="w-full"
                  role="progressbar"
                  aria-valuenow={objective.current}
                  aria-valuemax={objective.target}
                  aria-label={`${objective.label} progress`}
                />
              </div>

              {/* Checkmark for completed objectives */}
              {objective.isComplete && (
                <motion.div
                  data-testid={`checkmark-${objective.id}`}
                  initial={prefersReducedMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 400, damping: 20 }
                  }
                  className={cn(
                    'flex-shrink-0 w-6 h-6 flex items-center justify-center',
                    'rounded-full bg-neo-lime text-neo-black'
                  )}
                >
                  <Check className="w-4 h-4" strokeWidth={3} />
                </motion.div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
);

ObjectiveProgress.displayName = 'ObjectiveProgress';
