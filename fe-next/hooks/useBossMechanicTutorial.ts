/**
 * useBossMechanicTutorial Hook
 *
 * Manages boss mechanic tutorial state.
 * Tracks which twist types have been seen (localStorage) and shows
 * the tutorial the first time each mechanic is encountered.
 */

import { useState, useCallback, useEffect } from 'react';
import type { BossTwistType } from '@/types/boss';

// ==============================================
// CONSTANTS
// ==============================================

const STORAGE_KEY = 'lexiclash-seen-boss-mechanics';

// ==============================================
// HOOK
// ==============================================

export interface UseBossMechanicTutorialReturn {
  /** Currently shown twist type tutorial (null = none shown) */
  activeTwistType: BossTwistType | null;
  /** Call when a boss mechanic is first encountered */
  onMechanicEncountered: (twistType: BossTwistType) => void;
  /** Dismiss the current tutorial */
  dismissTutorial: () => void;
  /** Whether the tutorial is currently visible */
  isTutorialVisible: boolean;
}

export function useBossMechanicTutorial(): UseBossMechanicTutorialReturn {
  const [seenMechanics, setSeenMechanics] = useState<Set<BossTwistType>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        return new Set(parsed as BossTwistType[]);
      }
    } catch {
      // ignore
    }
    return new Set();
  });

  const [activeTwistType, setActiveTwistType] = useState<BossTwistType | null>(null);

  // Persist to localStorage whenever seen set changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...seenMechanics]));
    } catch {
      // ignore
    }
  }, [seenMechanics]);

  const onMechanicEncountered = useCallback(
    (twistType: BossTwistType) => {
      if (seenMechanics.has(twistType)) return;
      setActiveTwistType(twistType);
    },
    [seenMechanics]
  );

  const dismissTutorial = useCallback(() => {
    if (!activeTwistType) return;
    setSeenMechanics((prev) => new Set([...prev, activeTwistType]));
    setActiveTwistType(null);
  }, [activeTwistType]);

  return {
    activeTwistType,
    onMechanicEncountered,
    dismissTutorial,
    isTutorialVisible: activeTwistType !== null,
  };
}
