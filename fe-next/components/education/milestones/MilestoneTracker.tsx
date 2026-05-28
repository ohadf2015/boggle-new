/**
 * MilestoneTracker Component
 *
 * Visual progress tracker showing progression to next milestone level.
 * Displays current level, next milestone, XP remaining, and milestone markers.
 */

'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMilestoneProgress, getMilestones } from '@/lib/supabase/education/milestones';
import { getXpForLevel } from '@/backend/modules/xpManager';

// ==============================================
// TYPES
// ==============================================

export interface MilestoneTrackerProps {
  /** Total XP for progress calculation */
  totalXp: number;
  /** Optional className for styling */
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

export const MilestoneTracker = memo<MilestoneTrackerProps>(
  ({ totalXp, className }) => {
    const { t } = useLanguage();

    // Calculate milestone progress and visible milestones
    const { currentLevel, nextMilestone, progressPercent, xpToNextMilestone, visibleMilestones } = React.useMemo(() => {
      const prog = getMilestoneProgress(totalXp);
      const all = getMilestones();
      return {
        ...prog,
        visibleMilestones: all.filter(
          m => m.level >= prog.currentLevel && m.level <= prog.currentLevel + 20
        ),
      };
    }, [totalXp]);

    return (
      <div className={cn('space-y-2', className)}>
        {/* Header: Current Level -> Next Milestone */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-neo-lime font-black text-lg">
              {currentLevel}
            </span>
            <span className="text-neo-white">→</span>
            <span className={cn(
              'font-black text-lg',
              nextMilestone ? 'text-neo-white' : 'text-neo-white'
            )}>
              {nextMilestone?.level || '—'}
            </span>
          </div>
          {nextMilestone && (
            <div className="text-sm text-neo-white">
              {t('education.milestones.xpRemaining')}: <span className="font-bold text-neo-lime">{xpToNextMilestone}</span>
            </div>
          )}
        </div>

        {/* Progress Bar with Milestone Markers */}
        <div className="relative">
          {/* Background bar */}
          <div
            className={cn(
              'relative h-8 w-full',
              'bg-neo-navy/50 rounded-full',
              'border-neo border-neo-black',
              'overflow-hidden'
            )}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* Animated gradient fill */}
            <div
              className={cn(
                'h-full rounded-full',
                'bg-linear-to-r from-neo-lime to-neo-pink',
                'transition-all duration-500 ease-out'
              )}
              style={{ width: `${progressPercent}%` }}
            />

            {/* Milestone markers */}
            <div className="absolute inset-0 flex items-center px-1">
              {visibleMilestones.map((milestone, index) => {
                // Calculate position (0-100%)
                const milestoneXp = getXpForLevel(milestone.level);
                const currentLevelXp = getXpForLevel(currentLevel);
                const nextMilestoneLevelXp = nextMilestone
                  ? getXpForLevel(nextMilestone.level)
                  : currentLevelXp;

                const range = nextMilestoneLevelXp - currentLevelXp;
                const offset = milestoneXp - currentLevelXp;
                const positionPercent = range > 0 ? Math.min((offset / range) * 100, 100) : 0;

                const isPassed = milestone.level <= currentLevel;

                return (
                  <div
                    key={milestone.level}
                    data-testid={`milestone-marker-${milestone.level}`}
                    className={cn(
                      'absolute',
                      'rounded-sm',
                      // Size: major = larger
                      milestone.isMajor ? 'w-4 h-8' : 'w-2 h-6',
                      // Color: major = yellow, minor = gray
                      milestone.isMajor ? 'bg-neo-lime' : 'bg-neo-white/60',
                      // Dim upcoming milestones
                      !isPassed && 'opacity-30'
                    )}
                    style={{
                      left: `${positionPercent}%`,
                      transform: 'translateX(-50%)',
                    }}
                    title={`Level ${milestone.level}${milestone.title ? ` - ${milestone.title}` : ''}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MilestoneTracker.displayName = 'MilestoneTracker';
