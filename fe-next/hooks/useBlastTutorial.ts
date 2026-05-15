'use client';
import type { BlastLevel } from '@/lib/blast/v2/types';
import { hasSeenUnlock, shouldSkipAll, MECHANIC_KEYS, type UnlocksSeen, type MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';

type TutorialState = {
  showFtueOverlay: boolean;
  showUnlockCard: MechanicKey | null;
  unlockCardIndex: number;
};

export function useBlastTutorial(
  level: BlastLevel,
  unlocksSeen: UnlocksSeen,
  isVeteran: boolean,
  onUpdateUnlocks: (updated: UnlocksSeen) => void,
): TutorialState {
  // FTUE: Level 1, not yet completed
  if (level.levelNumber === 1 && !hasSeenUnlock(unlocksSeen, 'ftue_completed')) {
    return {
      showFtueOverlay: true,
      showUnlockCard: null,
      unlockCardIndex: -1,
    };
  }

  // Tutorial ends after level 2. Levels 3+ are pure gameplay with no
  // unlock cards or FTUE overlays — mechanics are discovered organically
  // by playing. See feedback in conversation: "everything function like
  // tutorial we should have the tutorial only first 2 levels".
  if (level.levelNumber > 2) {
    return {
      showFtueOverlay: false,
      showUnlockCard: null,
      unlockCardIndex: -1,
    };
  }

  // Skip-all flag hides all future cards
  if (shouldSkipAll(unlocksSeen)) {
    return {
      showFtueOverlay: false,
      showUnlockCard: null,
      unlockCardIndex: -1,
    };
  }

  // Check for new mechanic unlock
  const mechanics = mechanicsForLevel(level.levelNumber);
  const visibleMechanics: MechanicKey[] = [];

  for (const key of MECHANIC_KEYS) {
    if (mechanics[key]) {
      visibleMechanics.push(key);
    }
  }

  for (let i = 0; i < visibleMechanics.length; i++) {
    const key = visibleMechanics[i];
    if (!hasSeenUnlock(unlocksSeen, key)) {
      return {
        showFtueOverlay: false,
        showUnlockCard: key,
        unlockCardIndex: i,
      };
    }
  }

  return {
    showFtueOverlay: false,
    showUnlockCard: null,
    unlockCardIndex: -1,
  };
}
