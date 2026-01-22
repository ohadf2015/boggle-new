/**
 * AdventureObjectives Component
 *
 * Displays objective progress with icons, progress bars, and completion states.
 */

'use client';

import React, { memo } from 'react';
import {
  Check,
  Target,
  Star,
  Snowflake,
  Clock,
  Gem,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LevelObjective, ObjectiveType } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface AdventureObjectivesProps {
  /** Array of level objectives with progress */
  objectives: LevelObjective[];
  /** Additional CSS classes */
  className?: string;
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

const OBJECTIVE_LABELS: Record<ObjectiveType, string> = {
  wordCount: 'Find Words',
  scoreTarget: 'Score Points',
  longWords: 'Long Words',
  clearIce: 'Clear Ice',
  timeBonus: 'Time Bonus',
  collectGems: 'Collect Gems',
};

// ==============================================
// COMPONENT
// ==============================================

const AdventureObjectives = memo<AdventureObjectivesProps>(
  ({ objectives, className }) => {
    return (
      <ul
        role="list"
        className={cn('flex flex-col gap-2', className)}
        aria-label="Level objectives"
      >
        {objectives.map((objective) => {
          const Icon = OBJECTIVE_ICONS[objective.type];
          const label = OBJECTIVE_LABELS[objective.type];
          const current = objective.current ?? 0;
          const progress = Math.min((current / objective.target) * 100, 100);

          return (
            <li
              key={objective.type}
              data-testid={`objective-${objective.type}`}
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
            </li>
          );
        })}
      </ul>
    );
  }
);

AdventureObjectives.displayName = 'AdventureObjectives';

export default AdventureObjectives;
