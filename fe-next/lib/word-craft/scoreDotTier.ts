export type ScoreTier = 'common' | 'mid' | 'rare' | 'legendary';

export function scoreDotTier(points: number): ScoreTier {
  if (points <= 1) return 'common';
  if (points <= 3) return 'mid';
  if (points <= 5) return 'rare';
  return 'legendary';
}

// Project palette per fe-next/.claude/docs/design-system.md:
// common = neutral (cream-tinted); mid = neo-cyan; rare = neo-purple;
// legendary = neo-yellow (semantic "celebration/gold — coin/XP rewards" per design-system spec).
export const TIER_COLOR_CLASS: Record<ScoreTier, string> = {
  common: 'bg-neo-cream/40',
  mid: 'bg-neo-cyan',
  rare: 'bg-neo-purple',
  legendary: 'bg-neo-yellow',
};
