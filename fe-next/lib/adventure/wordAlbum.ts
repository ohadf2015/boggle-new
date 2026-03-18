/**
 * Word Album — Tracks all unique words a player has found across Adventure mode.
 *
 * Stored as a Set<string> in progression context, persisted as JSON array.
 * Milestone rewards at 100, 250, 500, 1000, 2500 unique words.
 */

export interface WordAlbumMilestone {
  /** Number of unique words required */
  target: number;
  /** Gold reward */
  gold: number;
  /** XP reward */
  xp: number;
  /** Badge ID (optional) */
  badge?: string;
  /** Translation key for milestone name */
  nameKey: string;
}

export const WORD_ALBUM_MILESTONES: WordAlbumMilestone[] = [
  { target: 50, gold: 50, xp: 25, nameKey: 'adventure.album.milestones.novice' },
  { target: 100, gold: 100, xp: 50, nameKey: 'adventure.album.milestones.explorer' },
  { target: 250, gold: 200, xp: 100, badge: 'badge-word-collector', nameKey: 'adventure.album.milestones.collector' },
  { target: 500, gold: 400, xp: 200, badge: 'badge-word-scholar', nameKey: 'adventure.album.milestones.scholar' },
  { target: 1000, gold: 800, xp: 400, badge: 'badge-word-master', nameKey: 'adventure.album.milestones.master' },
  { target: 2500, gold: 1500, xp: 750, badge: 'badge-lexicon', nameKey: 'adventure.album.milestones.lexicon' },
];

/**
 * Get the next unclaimed milestone for the player.
 */
export function getNextMilestone(
  uniqueWordCount: number,
  claimedMilestones: number[]
): WordAlbumMilestone | null {
  return WORD_ALBUM_MILESTONES.find(
    m => uniqueWordCount >= m.target && !claimedMilestones.includes(m.target)
  ) ?? null;
}

/**
 * Get all milestones with their completion status.
 */
export function getMilestoneProgress(
  uniqueWordCount: number,
  claimedMilestones: number[]
): Array<WordAlbumMilestone & { isUnlocked: boolean; isClaimed: boolean }> {
  return WORD_ALBUM_MILESTONES.map(m => ({
    ...m,
    isUnlocked: uniqueWordCount >= m.target,
    isClaimed: claimedMilestones.includes(m.target),
  }));
}

/**
 * Add new words to the album and return newly added count.
 */
export function addWordsToAlbum(
  existingWords: string[],
  newWords: string[]
): { updatedWords: string[]; newCount: number } {
  const set = new Set(existingWords.map(w => w.toUpperCase()));
  const beforeSize = set.size;
  for (const word of newWords) {
    set.add(word.toUpperCase());
  }
  return {
    updatedWords: Array.from(set),
    newCount: set.size - beforeSize,
  };
}
