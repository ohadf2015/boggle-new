/**
 * The top of the praise ladder (Bookworm's ASTONISHING! / WHOMPED!): a blow sized against the
 * foe's REMAINING HP, plus word length, earns a full-width stamped deed. Small hits stay the
 * fx chip; the killing blow belongs to the kill beat. Pure.
 */
export type Deed = 'crushed' | 'obliterated';

/** A deed drops a bonus hint, at most this many times per level. */
export const DEED_DROPS_PER_LEVEL = 2;

const CRUSHED = 0.5;
const OBLITERATED = 0.8;
/** The blow must also be a real share of the whole bar (not a big share of a last sliver). */
const MIN_SHARE = 0.2;
/** The same blow reads bigger on a bigger foe: an elite, and most of all the world boss. */
const FOE_WEIGHT = { foe: 1, elite: 1.25, boss: 1.5 } as const;
export type DeedFoe = keyof typeof FOE_WEIGHT;

export function deedTier({ word, pts, hpBefore, maxHp, foe = 'foe' }: { word: string; pts: number; hpBefore: number; maxHp: number; foe?: DeedFoe }): Deed | null {
  if (pts <= 0 || hpBefore <= 0 || maxHp <= 0 || pts >= hpBefore) return null;
  if (pts / maxHp < MIN_SHARE) return null;
  const letters = Array.from(word).length;
  const weight = (pts / hpBefore) * FOE_WEIGHT[foe] + Math.max(0, letters - 4) * 0.1;
  if (weight >= OBLITERATED) return 'obliterated';
  if (weight >= CRUSHED) return 'crushed';
  return null;
}
