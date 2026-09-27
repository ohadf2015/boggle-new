'use client';
import type { BlastLevel } from '@/lib/blast/v2/types';
import {
  hasSeenUnlock, hasSeenConcept, shouldSkipAll,
  MECHANIC_KEYS, CONCEPT_KEYS,
  type UnlocksSeen, type MechanicKey, type ConceptKey,
} from '@/lib/blast/v2/tutorial/unlocks-seen';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';

type TutorialState = {
  showFtueOverlay: boolean;
  showUnlockCard: MechanicKey | null;
  unlockCardIndex: number;
  // Layout-rule concept intro (e.g. "any row", "vertical words"). Independent
  // of mechanic unlock cards and not capped at level 2 — these only fire when
  // the generator actually starts using the new degree of freedom.
  showConceptCard: ConceptKey | null;
};

// First level at which each concept becomes relevant to the player.
// anyRow: chain packs (L1–L15) already stack the chain on multiple rows, so
//   L4 is the right moment to spell it out — "look past the floor row".
// verticalWords: chain-builder still uses horizontal-only placement; the
//   generator (L31+) is what introduces vertical words, so the intro lands
//   exactly when the player will see one.
const CONCEPT_LEVELS: Record<ConceptKey, number> = {
  anyRow: 4,
  verticalWords: 31,
};

function pickConceptCard(level: number, unlocks: UnlocksSeen): ConceptKey | null {
  if (shouldSkipAll(unlocks)) return null;
  for (const key of CONCEPT_KEYS) {
    if (level >= CONCEPT_LEVELS[key] && !hasSeenConcept(unlocks, key)) {
      return key;
    }
  }
  return null;
}

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
      showConceptCard: null,
    };
  }

  const conceptCard = pickConceptCard(level.levelNumber, unlocksSeen);

  // Tutorial ends after level 2. Levels 3+ are pure gameplay with no
  // unlock cards or FTUE overlays — mechanics are discovered organically
  // by playing. See feedback in conversation: "everything function like
  // tutorial we should have the tutorial only first 2 levels".
  if (level.levelNumber > 2) {
    return {
      showFtueOverlay: false,
      showUnlockCard: null,
      unlockCardIndex: -1,
      showConceptCard: conceptCard,
    };
  }

  // Skip-all flag hides all future cards
  if (shouldSkipAll(unlocksSeen)) {
    return {
      showFtueOverlay: false,
      showUnlockCard: null,
      unlockCardIndex: -1,
      showConceptCard: null,
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
        showConceptCard: null,
      };
    }
  }

  return {
    showFtueOverlay: false,
    showUnlockCard: null,
    unlockCardIndex: -1,
    showConceptCard: conceptCard,
  };
}
