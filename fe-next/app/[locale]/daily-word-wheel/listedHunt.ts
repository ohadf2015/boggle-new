import { isValidWordWheelWord } from '@/utils/dailyChallenge/wordWheelGeneration';

export const LISTED_HUNT_LENGTHS = [4, 5, 6, 7, 8, 9] as const;

export type ListedHuntBucket = {
  length: (typeof LISTED_HUNT_LENGTHS)[number];
  found: number;
  total: number;
};

export type ListedHuntProgress = {
  found: number;
  total: number;
  buckets: ListedHuntBucket[];
};

/** Finite 4–9 letter targets that can be formed on this wheel (centre required). */
export function toListedHuntTargets(
  words: string[],
  centerLetter: string,
  allLetters: string[],
): string[] {
  const seen = new Set<string>();
  const targets: string[] = [];
  for (const word of words) {
    const upper = word.toUpperCase();
    if (upper.length < 4 || upper.length > 9) continue;
    if (!isValidWordWheelWord(upper, centerLetter, allLetters)) continue;
    if (seen.has(upper)) continue;
    seen.add(upper);
    targets.push(upper);
  }
  return targets;
}

export function listedHuntProgress(targetWords: string[], found: string[]): ListedHuntProgress {
  const foundSet = new Set(found.map((w) => w.toUpperCase()));
  const targets = targetWords.map((w) => w.toUpperCase());
  const buckets = LISTED_HUNT_LENGTHS.map((length) => ({
    length,
    found: targets.filter((w) => w.length === length && foundSet.has(w)).length,
    total: targets.filter((w) => w.length === length).length,
  }));
  return {
    found: targets.filter((w) => foundSet.has(w)).length,
    total: targets.length,
    buckets,
  };
}
