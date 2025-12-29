'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Milestone thresholds - subtle, achievable goals
const MILESTONES = [5, 10, 15, 20, 30, 50];

interface WordsProgressProps {
  /** Total words available on the board (used for validation, not displayed) */
  totalWords: number | null;
  /** Number of valid words found by the player */
  foundWordsCount: number;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Optional: minimum word length being tracked (for display purposes) */
  minLength?: number;
  /** Optional: ultra-compact mode for landscape sidebar */
  compact?: boolean;
}

/**
 * WordsProgress - Minimal, elegant progress indicator for single player
 * Shows word count with subtle milestone dots - non-distracting
 */
export const WordsProgress = memo<WordsProgressProps>(({
  totalWords,
  foundWordsCount,
  t,
  minLength = 5,
  compact = false,
}) => {
  // Find next milestone - must be before any early returns (rules of hooks)
  const { nextMilestone, milestonesReached } = useMemo(() => {
    const reached = MILESTONES.filter(m => foundWordsCount >= m).length;
    const next = MILESTONES.find(m => foundWordsCount < m) || null;
    return { nextMilestone: next, milestonesReached: reached };
  }, [foundWordsCount]);

  // Don't render if we don't have total words yet
  if (totalWords === null || totalWords === 0) {
    return null;
  }

  // Ultra-compact mode for landscape sidebar - just count + dots
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        {/* Word count */}
        <span className={cn(
          'text-sm font-black tabular-nums transition-colors duration-300',
          milestonesReached >= 4 ? 'text-neo-lime' :
          milestonesReached >= 2 ? 'text-neo-cyan' :
          'text-neo-cream/90'
        )}>
          {foundWordsCount}
        </span>
        {/* Milestone dots */}
        <div className="flex gap-0.5">
          {MILESTONES.slice(0, 4).map((m, i) => (
            <div
              key={m}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all duration-300',
                foundWordsCount >= m
                  ? 'bg-neo-cyan scale-100'
                  : 'bg-neo-cream/40 scale-75'
              )}
            />
          ))}
        </div>
        {/* Label */}
        <span className="text-[8px] font-medium text-neo-cream/50 uppercase">
          {minLength}+
        </span>
      </div>
    );
  }

  // Full display for portrait mode - clean horizontal layout
  return (
    <div className="flex items-center gap-2.5 px-3 py-1">
      {/* Word count - prominent but clean */}
      <span className={cn(
        'text-xl font-black tabular-nums transition-colors duration-500',
        milestonesReached >= 4 ? 'text-neo-lime' :
        milestonesReached >= 2 ? 'text-neo-cyan' :
        'text-neo-cream'
      )}>
        {foundWordsCount}
      </span>

      {/* Divider */}
      <div className="w-px h-5 bg-neo-cream/20" />

      {/* Milestone progress dots */}
      <div className="flex items-center gap-1">
        {MILESTONES.map((m) => (
          <div
            key={m}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              foundWordsCount >= m
                ? 'bg-neo-cyan'
                : foundWordsCount >= m - 2 // Almost there - subtle hint
                  ? 'bg-neo-cream/50'
                  : 'bg-neo-cream/30'
            )}
            title={`${m} words`}
          />
        ))}
      </div>

      {/* Next goal hint - only show if close */}
      {nextMilestone && nextMilestone - foundWordsCount <= 3 && (
        <span className="text-[10px] text-neo-cream/40 font-medium">
          {nextMilestone - foundWordsCount} more
        </span>
      )}

      {/* Label */}
      <span className="text-[10px] text-neo-cream/40 font-medium">
        {minLength}+ {t('playerView.letterWords') || 'letter words'}
      </span>
    </div>
  );
});

WordsProgress.displayName = 'WordsProgress';

export default WordsProgress;
