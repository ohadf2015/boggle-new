import {
  SPECIAL_TILE_DISTRIBUTION,
  COUNTDOWN_INITIAL_MOVES,
  type BlastTileState,
  type BlastTileType,
} from '../types';
import { getInitialHitsRemaining } from './blastTileUtils';
import { getWaveConfig, getWaveDistribution } from './blastWaveConfig';
import { FROST_INNER_CANDIDATES } from '@/shared/constants/blastMultiplayerConstants';

let _tileUidCounter = 0;
/** Generate a unique tile ID that persists through gravity shifts */
export function nextTileUid(): string {
  return `t${++_tileUidCounter}`;
}
/** Reset counter (for testing) */
export function resetTileUidCounter(): void {
  _tileUidCounter = 0;
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
  currentWave: number = 1,
): BlastTileState[][] {
  const random = seededRandom(seed);
  const tiles: BlastTileState[][] = [];
  const dist = customDistribution ?? SPECIAL_TILE_DISTRIBUTION;

  // Build wave-gated distribution for frost inner type selection
  const waveConfigForFrost = getWaveConfig(currentWave);
  const waveDistForFrost = getWaveDistribution(waveConfigForFrost);
  const frostInnerDist: Record<string, number> = {};
  for (const t of FROST_INNER_CANDIDATES) {
    if ((waveDistForFrost[t] ?? 0) > 0) {
      frostInnerDist[t] = waveDistForFrost[t] ?? 0;
    }
  }
  // Normalize to sum to 1.0
  const frostInnerTotal = Object.values(frostInnerDist).reduce((a, b) => a + b, 0);
  if (frostInnerTotal > 0) {
    for (const k of Object.keys(frostInnerDist)) {
      frostInnerDist[k] /= frostInnerTotal;
    }
  }
  const hasFrostInnerCandidates = Object.values(frostInnerDist).some(v => v > 0);
  const effectiveFrostInnerDist = hasFrostInnerCandidates
    ? frostInnerDist
    : { bomb: 0.5, rainbow: 0.5 };

  for (let row = 0; row < gridSize; row++) {
    tiles[row] = [];
    for (let col = 0; col < gridSize; col++) {
      let type: BlastTileType = 'standard';

      if (random() < specialTileChance) {
        type = rollSpecialFromDistribution(random(), dist);
      }

      const innerType: BlastTileType | undefined =
        type === 'frozen'
          ? rollSpecialFromDistribution(random(), effectiveFrostInnerDist)
          : undefined;

      tiles[row][col] = {
        uid: nextTileUid(),
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: getInitialHitsRemaining(type),
        ...(innerType !== undefined ? { innerType } : {}),
        ...(type === 'countdown' ? { countdown: COUNTDOWN_INITIAL_MOVES } : {}),
      };
    }
  }

  // Pair portal tiles — each pair shares a portalPairId
  const portalTiles: BlastTileState[] = [];
  for (const row of tiles) {
    for (const tile of row) {
      if (tile.type === 'portal') portalTiles.push(tile);
    }
  }
  let pairIdx = 0;
  for (let i = 0; i + 1 < portalTiles.length; i += 2) {
    const pairId = `portal-${pairIdx++}`;
    portalTiles[i].portalPairId = pairId;
    portalTiles[i + 1].portalPairId = pairId;
  }
  // Odd portal out — convert to standard (can't have unpaired portal)
  if (portalTiles.length % 2 === 1) {
    const orphan = portalTiles[portalTiles.length - 1];
    orphan.type = 'standard';
    orphan.hitsRemaining = 0;
  }

  // Pair fuse tiles — each pair shares a fuseGroupId.
  // Require min Manhattan distance ≥3 so defusing a partner is a real spatial choice.
  const fuseTiles: BlastTileState[] = [];
  for (const row of tiles) {
    for (const tile of row) {
      if (tile.type === 'fuse') fuseTiles.push(tile);
    }
  }
  const MIN_FUSE_DISTANCE = 3;
  const fusePaired = new Set<number>();
  let fuseGroupIdx = 0;
  for (let i = 0; i < fuseTiles.length; i++) {
    if (fusePaired.has(i)) continue;
    for (let j = i + 1; j < fuseTiles.length; j++) {
      if (fusePaired.has(j)) continue;
      const dist =
        Math.abs(fuseTiles[i].row - fuseTiles[j].row) +
        Math.abs(fuseTiles[i].col - fuseTiles[j].col);
      if (dist >= MIN_FUSE_DISTANCE) {
        const groupId = `fuse-${fuseGroupIdx++}`;
        fuseTiles[i].fuseGroupId = groupId;
        fuseTiles[j].fuseGroupId = groupId;
        fusePaired.add(i);
        fusePaired.add(j);
        break;
      }
    }
  }
  // Unpaired fuses (no partner ≥3 away) → downgrade to standard
  for (let i = 0; i < fuseTiles.length; i++) {
    if (!fusePaired.has(i)) {
      fuseTiles[i].type = 'standard';
      fuseTiles[i].hitsRemaining = 0;
    }
  }

  // Pair locked + key tiles — each locked must have a key within Manhattan ≤3.
  // Orphan locked or orphan key → downgrade to standard.
  const lockedTiles: BlastTileState[] = [];
  const keyTiles: BlastTileState[] = [];
  for (const row of tiles) {
    for (const tile of row) {
      if (tile.type === 'locked') lockedTiles.push(tile);
      else if (tile.type === 'key') keyTiles.push(tile);
    }
  }
  const MAX_KEY_DISTANCE = 3;
  const lockedPaired = new Set<number>();
  const keyPaired = new Set<number>();
  for (let i = 0; i < lockedTiles.length; i++) {
    for (let j = 0; j < keyTiles.length; j++) {
      if (keyPaired.has(j)) continue;
      const dist =
        Math.abs(lockedTiles[i].row - keyTiles[j].row) +
        Math.abs(lockedTiles[i].col - keyTiles[j].col);
      if (dist <= MAX_KEY_DISTANCE) {
        lockedPaired.add(i);
        keyPaired.add(j);
        break;
      }
    }
  }
  for (let i = 0; i < lockedTiles.length; i++) {
    if (!lockedPaired.has(i)) {
      lockedTiles[i].type = 'standard';
      lockedTiles[i].hitsRemaining = 0;
    }
  }
  for (let j = 0; j < keyTiles.length; j++) {
    if (!keyPaired.has(j)) {
      keyTiles[j].type = 'standard';
      keyTiles[j].hitsRemaining = 0;
    }
  }

  return tiles;
}
