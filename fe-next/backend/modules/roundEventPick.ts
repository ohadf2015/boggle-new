import type { CatalystType } from './roundEventsManager';

const CATALYSTS: readonly CatalystType[] = ['blizzard', 'lightning', 'meteor', 'earthquake'];
// The earthquake reshuffles the board, wiping the leader's head start on it.
const RUBBER_BAND_WEIGHTS: Record<CatalystType, number> = { blizzard: 1, lightning: 1, meteor: 1, earthquake: 4 };

/** Deterministic [0,1) generator (FNV-1a seed + mulberry32) so a round's event pick is reproducible. */
export function seededRng(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Leader has run away: at least 150 points ahead of the last player and more than double their score. */
export function isLeaderMarginLarge(scores: readonly number[]): boolean {
  if (scores.length < 2) return false;
  const leader = Math.max(...scores);
  const last = Math.min(...scores);
  return leader - last >= 150 && last * 2 < leader;
}

export function pickWeightedCatalyst(rng: () => number, rubberBand: boolean): CatalystType {
  if (!rubberBand) return CATALYSTS[Math.floor(rng() * CATALYSTS.length)];
  const total = CATALYSTS.reduce((sum, c) => sum + RUBBER_BAND_WEIGHTS[c], 0);
  let roll = rng() * total;
  for (const c of CATALYSTS) {
    roll -= RUBBER_BAND_WEIGHTS[c];
    if (roll < 0) return c;
  }
  return 'earthquake';
}
