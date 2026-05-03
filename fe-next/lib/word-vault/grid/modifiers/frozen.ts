import type { FrozenModifier, TileState } from '../types';

type Rng = () => number; // 0..1

export function applyFrozen(
  tiles: TileState[],
  mod: FrozenModifier,
  rng: Rng = Math.random,
): TileState[] {
  const n = Math.min(mod.n, tiles.length);
  const indices = tiles.map((_, i) => i);
  // Fisher-Yates with provided rng for determinism in tests
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const frozenIdx = new Set(indices.slice(0, n));
  return tiles.map((t) => (frozenIdx.has(t.index) ? { ...t, frozen: true } : t));
}

export function isSelectable(tile: TileState): boolean {
  return !tile.frozen;
}

export function thawOnTargetHit(tiles: TileState[]): TileState[] {
  return tiles.map((t) => (t.frozen ? { ...t, frozen: false } : t));
}
