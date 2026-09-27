import type { WordTowerFloor } from './wordTowerManager';

export type ArchitectTier = 'Apprentice' | 'Journeyman' | 'Master';

/** Scrabble-style rarity score per letter (higher = rarer). */
const RARITY: Record<string, number> = {
  q: 10, z: 10, x: 8, j: 8, k: 5, w: 4, v: 4, y: 4,
  f: 4, h: 4, b: 3, c: 3, m: 3, p: 3,
};

function rarityScore(word: string): number {
  return [...word.toLowerCase()].reduce((s, ch) => s + (RARITY[ch] ?? 0), 0);
}

/**
 * Scores a tower's played word history into a mastery tier.
 * Returns null when < 5 floors (too early to judge).
 *
 * Scoring: 60% rare-letter density, 40% word-length variety.
 */
export function getTowerArchitectTier(floors: WordTowerFloor[]): ArchitectTier | null {
  if (floors.length < 5) return null;

  const words = floors.map((f) => f.word);

  // Rare-letter score: average rarity per character across all words
  const totalChars = words.reduce((s, w) => s + w.length, 0);
  const totalRarity = words.reduce((s, w) => s + rarityScore(w), 0);
  const avgRarityPerChar = totalChars > 0 ? totalRarity / totalChars : 0;

  // Variety score: unique word lengths / total possible lengths seen
  const uniqueLengths = new Set(words.map((w) => w.length)).size;
  const varietyRatio = uniqueLengths / Math.min(words.length, 8);

  // Composite (0–1 scale: rarity normalised to 2.5 max, variety already 0–1)
  const rarityNorm = Math.min(avgRarityPerChar / 2.5, 1);
  const composite = 0.6 * rarityNorm + 0.4 * varietyRatio;

  if (composite >= 0.55) return 'Master';
  if (composite >= 0.28) return 'Journeyman';
  return 'Apprentice';
}
