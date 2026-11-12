'use client';

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { consumeLevelUp, getPendingLevelUp, settleLevelUp, subscribeLevelUp } from '@/lib/levelUp/levelUpBus';
import type { LevelUpPayload } from '@/components/education/LevelUpCelebration';

const none = () => null;

/**
 * Takes every level-up announced while mounted away from the app-wide watcher, merged into one,
 * so the classroom results can play it as its own last beat. Layout effect: it runs before the
 * watcher's passive settle in the same commit.
 */
export function useClaimedLevelUp(): [LevelUpPayload | null, () => void] {
  const pending = useSyncExternalStore(subscribeLevelUp, getPendingLevelUp, none);
  const [claimed, setClaimed] = useState<LevelUpPayload | null>(null);

  useLayoutEffect(() => {
    if (pending?.display !== 'undecided') return;
    // Settling marks the level as celebrated, so its avatar reveal never pops on a later page.
    if (settleLevelUp() !== 'celebrate') return;
    consumeLevelUp();
    setClaimed((prev) => ({
      oldLevel: Math.min(prev?.oldLevel ?? pending.oldLevel, pending.oldLevel),
      newLevel: Math.max(prev?.newLevel ?? pending.newLevel, pending.newLevel),
      newTitles: pending.title ? [pending.title] : (prev?.newTitles ?? []),
    }));
  }, [pending]);

  const release = useCallback(() => setClaimed(null), []);
  return [claimed, release];
}
