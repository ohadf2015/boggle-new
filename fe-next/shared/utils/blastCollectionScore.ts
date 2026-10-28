/**
 * Points for the coins and diamonds a Blast player collects. The server computes
 * them; clients only display the breakdown it sends.
 */

export const BLAST_COIN_POINTS = 20;
export const BLAST_DIAMOND_POINTS = 150;

export interface BlastCollectionCounts {
  coins?: number;
  diamonds?: number;
}

export interface BlastCollectionScore {
  coinPoints: number;
  diamondPoints: number;
  total: number;
  breakdown: {
    coins: { count: number; points: number };
    diamonds: { count: number; points: number };
  };
}

const count = (n: number | undefined) => Math.max(0, Math.floor(n ?? 0));

export function blastCollectionScore({ coins, diamonds }: BlastCollectionCounts): BlastCollectionScore {
  const c = count(coins);
  const d = count(diamonds);
  const coinPoints = c * BLAST_COIN_POINTS;
  const diamondPoints = d * BLAST_DIAMOND_POINTS;
  return {
    coinPoints,
    diamondPoints,
    total: coinPoints + diamondPoints,
    breakdown: {
      coins: { count: c, points: coinPoints },
      diamonds: { count: d, points: diamondPoints },
    },
  };
}

/** Sort comparator for Blast standings: higher score first, then more diamonds. */
export function compareBlastStandings(
  a: { score: number; diamondsCollected?: number },
  b: { score: number; diamondsCollected?: number },
): number {
  return b.score - a.score || (b.diamondsCollected ?? 0) - (a.diamondsCollected ?? 0);
}
