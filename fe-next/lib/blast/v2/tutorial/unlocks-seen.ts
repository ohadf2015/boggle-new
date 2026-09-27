export const MECHANIC_KEYS = [
  'coinOverlay',
  'reverseSelection',
  'shuffleButton',
  'gemTiles',
  'frozenTiles',
  'cascadeWords',
  'doubleBonusTile',
  'revealLetterHint',
  'bonusDictionary',
  'revealWordHint',
  'lateralSlideGravity',
  'multiWordReveal',
] as const;

export type MechanicKey = typeof MECHANIC_KEYS[number];

// Concepts are board-layout ideas introduced as the generator unlocks new
// placement freedom — separate from mechanic unlocks (gems/coins/frozen)
// because they describe *where* words live, not what tiles do.
export const CONCEPT_KEYS = ['anyRow', 'verticalWords'] as const;
export type ConceptKey = typeof CONCEPT_KEYS[number];

type ConceptSeen = { [K in ConceptKey as `concept_${K}`]?: boolean };

export type UnlocksSeen = {
  ftue_completed?: boolean;
  skip_all?: boolean;
  veteran_bonus_granted?: boolean;
} & {
  [key in MechanicKey]?: boolean;
} & ConceptSeen;

export function validateUnlocksSeen(raw: unknown): UnlocksSeen {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }
  // Accept any record of booleans/undefined, ignore extra keys
  const result: UnlocksSeen = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'boolean' || value === undefined) {
      result[key as keyof UnlocksSeen] = value;
    }
  }
  return result;
}

export function hasSeenUnlock(
  unlocks: UnlocksSeen,
  key: MechanicKey | 'ftue_completed' | 'skip_all' | 'veteran_bonus_granted',
): boolean {
  return unlocks[key as keyof UnlocksSeen] === true;
}

export function markUnlockSeen(
  unlocks: UnlocksSeen,
  key: MechanicKey | 'ftue_completed',
): UnlocksSeen {
  return { ...unlocks, [key]: true };
}

export function markConceptSeen(unlocks: UnlocksSeen, key: ConceptKey): UnlocksSeen {
  return { ...unlocks, [`concept_${key}`]: true };
}

export function hasSeenConcept(unlocks: UnlocksSeen, key: ConceptKey): boolean {
  return unlocks[`concept_${key}`] === true;
}

export function shouldSkipAll(unlocks: UnlocksSeen): boolean {
  return unlocks.skip_all === true;
}

export function setSkipAll(unlocks: UnlocksSeen, skip: boolean): UnlocksSeen {
  return { ...unlocks, skip_all: skip };
}

export function completeFtue(unlocks: UnlocksSeen): UnlocksSeen {
  return { ...unlocks, ftue_completed: true };
}
