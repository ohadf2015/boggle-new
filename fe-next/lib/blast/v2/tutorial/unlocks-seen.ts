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

export type UnlocksSeen = {
  ftue_completed?: boolean;
  skip_all?: boolean;
  veteran_bonus_granted?: boolean;
} & {
  [key in MechanicKey]?: boolean;
};

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

export function shouldSkipAll(unlocks: UnlocksSeen): boolean {
  return unlocks.skip_all === true;
}

export function setSkipAll(unlocks: UnlocksSeen, skip: boolean): UnlocksSeen {
  return { ...unlocks, skip_all: skip };
}

export function completeFtue(unlocks: UnlocksSeen): UnlocksSeen {
  return { ...unlocks, ftue_completed: true };
}
