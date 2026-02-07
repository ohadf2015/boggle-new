/**
 * useStreakCinematic Hook
 *
 * Manages streak milestone cinematic state for daily challenge results.
 * Shows StreakMilestoneCinematic for milestones >= 30.
 * Smaller milestones (7, 14) keep the existing lightweight badge UI.
 */

import { useState, useCallback } from 'react';
import type { StreakMilestoneCinematicProps } from '../cinematics/StreakMilestoneCinematic';

type Milestone = 7 | 14 | 30 | 50 | 100 | 365;

const CINEMATIC_MILESTONES = new Set<number>([30, 50, 100, 365]);

const MILESTONE_EMOJIS: Record<number, string> = {
  30: '🔥',
  50: '⚡',
  100: '👑',
  365: '🌟',
};

export interface UseStreakCinematicReturn {
  /** Whether the cinematic should be shown */
  showCinematic: boolean;
  /** Props for the StreakMilestoneCinematic */
  cinematicProps: Omit<StreakMilestoneCinematicProps, 'rewards'> | null;
  /** Check if a milestone warrants a cinematic and trigger it */
  triggerIfEligible: (streakCount: number, milestone: number, t: (key: string) => string) => boolean;
  /** Handle cinematic completion */
  handleComplete: () => void;
}

export function useStreakCinematic(): UseStreakCinematicReturn {
  const [showCinematic, setShowCinematic] = useState(false);
  const [cinematicProps, setCinematicProps] = useState<Omit<StreakMilestoneCinematicProps, 'rewards'> | null>(null);

  const triggerIfEligible = useCallback((streakCount: number, milestone: number, t: (key: string) => string): boolean => {
    if (!CINEMATIC_MILESTONES.has(milestone)) return false;

    const emoji = MILESTONE_EMOJIS[milestone] || '🔥';
    const title = t('daily.streakCinematic.streakDays').replace('{count}', String(streakCount));
    const subtitle = t('daily.streakCinematic.milestone');

    setCinematicProps({
      streakCount,
      milestone: milestone as Milestone,
      emoji,
      title,
      subtitle,
    });
    setShowCinematic(true);
    return true;
  }, []);

  const handleComplete = useCallback(() => {
    setShowCinematic(false);
    setCinematicProps(null);
  }, []);

  return {
    showCinematic,
    cinematicProps,
    triggerIfEligible,
    handleComplete,
  };
}
