/**
 * Rare Gems — pure gem logic.
 *
 * Cosy framing: every word is a gem, longer word = rarer/bigger gem.
 * The length→tier rule is intentionally transparent (clarity over
 * linguistic-frequency realism) so the player always understands why a
 * word earned the gem it did. Keep behaviour identical to the prior
 * inline `getWordRarity`/`RARITY_POINTS` so scoring is unchanged.
 */

export type GemTier = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Word length → gem tier. 3-=common, 4=uncommon, 5=rare, 6+=legendary. */
export function classifyGem(word: string): GemTier {
  const len = word.length;
  if (len >= 6) return 'legendary';
  if (len >= 5) return 'rare';
  if (len >= 4) return 'uncommon';
  return 'common';
}

export const GEM_POINTS: Record<GemTier, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  legendary: 100,
};

export function gemValue(tier: GemTier): number {
  return GEM_POINTS[tier];
}

/** Rare + legendary gems are the ones that fill the pouch toward the goal. */
export function isRareGem(tier: string): boolean {
  return tier === 'rare' || tier === 'legendary';
}

export interface GemProgress {
  /** Rare/legendary gems found — the goal metric. */
  rareCount: number;
  target: number;
  /** rareCount / target, clamped to [0, 1] for the meter fill. */
  fraction: number;
  complete: boolean;
  /** Every gem in the haul (all words found). */
  totalGems: number;
}

export function computeGemProgress(
  words: { rarity: string }[],
  target: number,
): GemProgress {
  const rareCount = words.reduce((n, w) => n + (isRareGem(w.rarity) ? 1 : 0), 0);
  const safeTarget = target > 0 ? target : 0;
  const fraction = safeTarget > 0 ? Math.min(1, rareCount / safeTarget) : 0;
  return {
    rareCount,
    target: safeTarget,
    fraction,
    complete: safeTarget > 0 && rareCount >= safeTarget,
    totalGems: words.length,
  };
}

/** Escalating juice intensity for the find ceremony. */
export type CelebrationLevel = 'small' | 'medium' | 'big' | 'epic';

const CELEBRATION: Record<GemTier, CelebrationLevel> = {
  common: 'small',
  uncommon: 'medium',
  rare: 'big',
  legendary: 'epic',
};

export function celebrationFor(tier: GemTier): CelebrationLevel {
  return CELEBRATION[tier];
}
