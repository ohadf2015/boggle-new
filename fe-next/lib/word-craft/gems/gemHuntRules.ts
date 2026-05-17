import {
  emptyInventory,
  GEM_COLORS,
  TRANSMUTE_COST,
  WIN_RARITY,
  type CollectedGem,
  type Gem,
  type GemCell,
  type GemColor,
  type GemInventory,
  type GemRarity,
} from './types';

export function addToInventory(inv: GemInventory, gem: Gem): GemInventory {
  return {
    ...inv,
    [gem.color]: {
      ...inv[gem.color],
      [gem.rarity]: inv[gem.color][gem.rarity] + 1,
    },
  };
}

export function canTransmute(inv: GemInventory, color: GemColor, rarity: GemRarity): boolean {
  if (rarity >= WIN_RARITY) return false;
  return inv[color][rarity] >= TRANSMUTE_COST;
}

export function transmute(inv: GemInventory, color: GemColor, rarity: GemRarity): GemInventory {
  if (!canTransmute(inv, color, rarity)) {
    throw new Error(`cannot transmute ${color} rarity ${rarity}: requires ${TRANSMUTE_COST} of that rarity`);
  }
  const nextRarity = (rarity + 1) as GemRarity;
  return {
    ...inv,
    [color]: {
      ...inv[color],
      [rarity]: inv[color][rarity] - TRANSMUTE_COST,
      [nextRarity]: inv[color][nextRarity] + 1,
    },
  };
}

export function hasWinningInventory(inv: GemInventory): boolean {
  return GEM_COLORS.every((c) => inv[c][WIN_RARITY] >= 1);
}

export interface CollectionResult {
  collected: CollectedGem[];
  remaining: GemCell[];
}

export function collectGemsFromPlacements(
  cells: readonly GemCell[],
  placements: readonly { row: number; col: number }[],
): CollectionResult {
  const placedKeys = new Set(placements.map((p) => `${p.row},${p.col}`));
  const collected: CollectedGem[] = [];
  const remaining: GemCell[] = [];
  for (const cell of cells) {
    if (placedKeys.has(`${cell.row},${cell.col}`)) {
      collected.push({
        color: cell.color,
        rarity: cell.rarity,
        fromRow: cell.row,
        fromCol: cell.col,
        cellId: cell.id,
      });
    } else {
      remaining.push(cell);
    }
  }
  return { collected, remaining };
}

/**
 * Can the player still win given the current inventory and what's left on the
 * board? Accounts for transmute paths (3 chips → 1 shard, 3 shards → 1 crown).
 *
 * Conservative model: for each missing color, treat the player's current and
 * still-available chip/shard/crown counts and ask whether a crown is reachable
 * via greedy upward transmute.
 */
export function canStillWin(inv: GemInventory, remainingCells: readonly GemCell[]): boolean {
  for (const color of GEM_COLORS) {
    const onBoard = { 1: 0, 2: 0, 3: 0 } as Record<GemRarity, number>;
    for (const cell of remainingCells) {
      if (cell.color === color) onBoard[cell.rarity] += 1;
    }
    let chips = inv[color][1] + onBoard[1];
    let shards = inv[color][2] + onBoard[2];
    let crowns = inv[color][3] + onBoard[3];
    if (crowns >= 1) continue;
    // Up-promote chips → shards (3:1)
    const promotedShards = Math.floor(chips / TRANSMUTE_COST);
    shards += promotedShards;
    chips -= promotedShards * TRANSMUTE_COST;
    if (shards < TRANSMUTE_COST) return false;
    // Up-promote shards → crown
    const promotedCrowns = Math.floor(shards / TRANSMUTE_COST);
    crowns += promotedCrowns;
    if (crowns < 1) return false;
  }
  return true;
}

export { emptyInventory };
