import type { WordObject } from '@/components/results/types';

/**
 * selectUniqueWords — the words ONLY the current player found.
 *
 * Single source of truth so the "Only You" highlight count and the
 * UniqueWordsSection chip list always agree. A word counts as unique when the
 * current player has it validated-and-non-duplicate AND no OTHER player has it
 * validated-and-non-duplicate. Opponents' duplicate-flagged words don't cancel
 * your find. Comparison is case-insensitive; result is sorted longest-first.
 *
 * Returns [] for solo play (<2 players) or when the player has no uniques.
 */
export function selectUniqueWords(
  allPlayerWords: Record<string, WordObject[]>,
  currentUsername: string,
): string[] {
  const playerNames = Object.keys(allPlayerWords);
  if (playerNames.length < 2) return [];

  const toValidSet = (words: WordObject[]): Set<string> => {
    const s = new Set<string>();
    words.forEach((w) => {
      if (w.validated && !w.isDuplicate) s.add(w.word.toLowerCase());
    });
    return s;
  };

  const mySet = toValidSet(allPlayerWords[currentUsername] || []);
  if (mySet.size === 0) return [];

  const otherUnion = new Set<string>();
  playerNames.forEach((name) => {
    if (name === currentUsername) return;
    toValidSet(allPlayerWords[name]).forEach((w) => otherUnion.add(w));
  });

  return Array.from(mySet)
    .filter((w) => !otherUnion.has(w))
    .sort((a, b) => b.length - a.length);
}

export default selectUniqueWords;
