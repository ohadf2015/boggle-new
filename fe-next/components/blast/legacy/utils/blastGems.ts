import type { BlastGemKind, BlastTileState } from '@/shared/types/blast';
import type { BlastWordRarityTier } from './blastWordRarity';
import { getWaveTheme } from './blastWaveTheme';

export interface BlastGemDef {
  kind: BlastGemKind;
  /** Points when the gem is cleared by any blast. */
  clearBonus: number;
  /** Word score multiplier when the gem is in the played word. */
  wordMult: number;
  /** Played gem also clears its row and column. */
  cross: boolean;
}

/** Sapphire keeps the numbers diamonds always had; emerald is the small find, ruby the jackpot. */
export const GEM_DEFS: Record<BlastGemKind, BlastGemDef> = {
  emerald: { kind: 'emerald', clearBonus: 15, wordMult: 2, cross: false },
  sapphire: { kind: 'sapphire', clearBonus: 30, wordMult: 2, cross: true },
  amethyst: { kind: 'amethyst', clearBonus: 60, wordMult: 3, cross: true },
  ruby: { kind: 'ruby', clearBonus: 120, wordMult: 4, cross: true },
};

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
