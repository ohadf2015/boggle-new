import {
  SPECIAL_TILE_DISTRIBUTION,
  type BlastTileState,
  type BlastTileType,
} from '../types';

let _tileUidCounter = 0;
/** Generate a unique tile ID that persists through gravity shifts */
export function nextTileUid(): string {
  return `t${++_tileUidCounter}`;
}

/** Seeded random for consistent tile placement per grid */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Roll a special tile type from a distribution map using a given random value */
export function rollSpecialFromDistribution(
  roll: number,
  dist: Record<string, number>,
): BlastTileType {
  let cumulative = 0;
  for (const [tileType, weight] of Object.entries(dist)) {
    if (weight <= 0) continue;
    cumulative += weight;
    if (roll < cumulative) return tileType as BlastTileType;
  }
  return 'standard';
}

/** Generate initial tile states with special tile placement */
export function generateTileStates(
  gridSize: number,
  specialTileChance: number,
  seed: number = Date.now(),
  customDistribution?: Record<string, number>,
): BlastTileState[][] {
  const random = seededRandom(seed);
  const dist = customDistribution ?? SPECIAL_TILE_DISTRIBUTION;
  const tiles: BlastTileState[][] = [];

  for (let row = 0; row < gridSize; row++) {
    tiles[row] = [];
    for (let col = 0; col < gridSize; col++) {
      const type: BlastTileType = random() < specialTileChance ? rollSpecialFromDistribution(random(), dist) : 'standard';
      tiles[row][col] = {
        uid: nextTileUid(),
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      };
    }
  }
  return tiles;
}
