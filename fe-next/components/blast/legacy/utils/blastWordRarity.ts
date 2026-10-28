import { getLetterPoints } from '@/lib/blast/blastLetterBonus';

export type BlastWordRarityTier = 'common' | 'uncommon' | 'rare' | 'epic';

const UNCOMMON_MIN = 14;
const RARE_MIN = 20;
const EPIC_MIN = 28;

const DIAMONDS_BY_TIER: Record<BlastWordRarityTier, number> = {
  common: 0,
  uncommon: 0,
  rare: 1,
  epic: 2,
};

export function scoreWordRarity(word: string): number {
  const letters = [...word];
  const points = letters.map(getLetterPoints);
  // Scripts with no letter values (ja, ru) rate on length alone, weighted up to compensate.
  if (points.every(p => p === 0)) return letters.length * 3;
  return letters.length * 2 + points.reduce((sum, p) => sum + Math.max(0, p - 1), 0);
}

/** `boost` raises the score — a wave theme uses it to make diamonds easier to earn. */
export function getWordRarityTier(word: string, boost = 0): BlastWordRarityTier {
  const score = scoreWordRarity(word) + boost;
  if (score >= EPIC_MIN) return 'epic';
  if (score >= RARE_MIN) return 'rare';
  if (score >= UNCOMMON_MIN) return 'uncommon';
  return 'common';
}

export function diamondsForWord(word: string, boost = 0): number {
  return DIAMONDS_BY_TIER[getWordRarityTier(word, boost)];
}
