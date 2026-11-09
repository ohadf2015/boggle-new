import type { BlastGemKind, BlastTileState } from '@/shared/types/blast';
import type { BlastWordRarityTier } from './blastWordRarity';
import { getWaveTheme } from './blastWaveTheme';

export interface BlastGemDef {
  kind: BlastGemKind;
  /** Points when the gem is cleared by any blast. */
  clearBonus: number;
  /** Word score multiplier when the gem is in the played word. */
  wordMult: number;
  /**
   * Played gem blasts a plus shape: this many tiles out in each of the 4 directions.
   * 0 = no blast. Small and fixed so the player can see exactly what a gem will take.
   */
  reach: number;
}

/** Full row + column: only the jackpot ruby reaches the board edges. */
export const GEM_FULL_REACH = 99;

/**
 * Emerald is the small find, ruby the jackpot. Blasts grow with rarity but stay a
 * readable plus shape; only a ruby clears its whole row and column.
 */
export const GEM_DEFS: Record<BlastGemKind, BlastGemDef> = {
  emerald: { kind: 'emerald', clearBonus: 15, wordMult: 2, reach: 0 },
  sapphire: { kind: 'sapphire', clearBonus: 30, wordMult: 2, reach: 1 },
  amethyst: { kind: 'amethyst', clearBonus: 60, wordMult: 3, reach: 2 },
  ruby: { kind: 'ruby', clearBonus: 120, wordMult: 4, reach: GEM_FULL_REACH },
};

/** Cells a played gem blasts (its own cell excluded), nearest first. */
export function gemBlastCells(row: number, col: number, gem: BlastGemKind, gridSize: number): Array<{ row: number; col: number }> {
  const reach = Math.min(GEM_DEFS[gem].reach, gridSize);
  const cells: Array<{ row: number; col: number }> = [];
  for (let d = 1; d <= reach; d++) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const r = row + dr * d;
      const c = col + dc * d;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

export const DEFAULT_GEM: BlastGemKind = 'sapphire';

export const EMERALD_CHANCE_UNCOMMON = 0.35;
export const RUBY_CHANCE: Partial<Record<BlastWordRarityTier, number>> = { rare: 0.1, epic: 0.25 };

export function gemOfTile(tile: Pick<BlastTileState, 'gem'>): BlastGemKind {
  return tile.gem ?? DEFAULT_GEM;
}

/** Gems a word earns. Draws from `rng` only when a roll is needed, so MP client and server stay in step. */
export function rollGemsForWord(tier: BlastWordRarityTier, rng: () => number): BlastGemKind[] {
  let gems: BlastGemKind[];
  if (tier === 'epic') gems = ['amethyst', 'sapphire'];
  else if (tier === 'rare') gems = ['sapphire'];
  else if (tier === 'uncommon') return rng() < EMERALD_CHANCE_UNCOMMON ? ['emerald'] : [];
  else return [];
  const rubyChance = RUBY_CHANCE[tier] ?? 0;
  if (rng() < rubyChance) gems = ['ruby', ...gems.slice(1)];
  return gems;
}

/**
 * Gems a wave's opening board hides, so every level has a treasure to chase and the
 * finds climb with the run: a clean warm-up, emeralds first, then sapphires, amethysts,
 * and a ruby only on late boss waves. Hunt waves hide extra.
 */
export function getWaveGemSeeds(wave: number): BlastGemKind[] {
  const w = Math.max(1, Math.floor(wave));
  if (w === 1) return [];
  const theme = getWaveTheme(w);
  const seeds: BlastGemKind[] = w < 4 ? ['emerald'] : ['emerald', 'sapphire'];
  if (w >= 8) seeds.push('amethyst');
  if (theme.id === 'diamondHunt') seeds.push('sapphire', w >= 6 ? 'amethyst' : 'emerald');
  if (theme.id === 'boss') seeds.push('amethyst');
  if (theme.id === 'boss' && w >= 10) seeds.push('ruby');
  return seeds;
}

/** Turn random live standard tiles into the wave's gems. Mutates `tiles`; pass the opening board only. */
export function seedWaveGems(tiles: BlastTileState[][], wave: number, rng: () => number): BlastTileState[][] {
  const candidates = tiles.flat().filter(t => t.type === 'standard' && !t.isCleared);
  for (const gem of getWaveGemSeeds(wave)) {
    if (candidates.length === 0) break;
    const [tile] = candidates.splice(Math.floor(rng() * candidates.length), 1);
    tile.type = 'diamond';
    tile.gem = gem;
  }
  return tiles;
}

export type BlastGemCounts = Partial<Record<BlastGemKind, number>>;

export function mergeGemCounts(a: BlastGemCounts = {}, b: BlastGemCounts = {}): BlastGemCounts {
  const out: BlastGemCounts = { ...a };
  for (const [k, n] of Object.entries(b) as Array<[BlastGemKind, number]>) out[k] = (out[k] ?? 0) + n;
  return out;
}
