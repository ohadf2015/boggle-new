/**
 * WordCraft Multiplayer Bag & Board Setup
 * Shared utilities for creating real game boards and tile bags.
 * Uses English distribution; language support can be added later.
 *
 * No dependency on lib/** — this lives in shared/ for both client and server.
 */

import type { RackTile, PlacedTile } from '@/lib/word-craft/types';

// English tile values (Scrabble-like)
export const ENGLISH_TILE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
  _: 0, // blank
};

// English tile distribution (Scrabble-like, 100 tiles total)
export const ENGLISH_TILE_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1,
  K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6,
  U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
  _: 2, // blanks
};

/**
 * Simple seeded PRNG using a linear congruential generator.
 * Deterministic so the same seed always produces the same bag.
 */
function seededRandom(seed: number): () => number {
  // Lehmer / MINSTD. The previous version ended with `>>> 0`, which casts to an
  // unsigned integer — so it returned 0 on every call, Fisher-Yates swapped
  // every tile with index 0, and every match dealt the SAME rack no matter the
  // seed (observed live: three matches in a row dealt A _ Y X W V U).
  // state stays under 2^31 and 2147483646 * 48271 < 2^53, so this is exact in
  // doubles — no overflow, no bit-truncation.
  let state = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return function () {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646; // [0, 1)
  };
}

/**
 * Create a bag of tiles with the given distribution, shuffled by a seed.
 */
export function createWordCraftBag(seed: number = Date.now()): RackTile[] {
  const rng = seededRandom(seed);
  const tiles: RackTile[] = [];
  let tileId = 0;

  // Create tiles according to distribution
  for (const [letter, count] of Object.entries(ENGLISH_TILE_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: `t-${tileId++}`,
        letter,
        value: ENGLISH_TILE_VALUES[letter] ?? 0,
        isBlank: letter === '_',
      });
    }
  }

  // Fisher-Yates shuffle using seeded RNG
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  return tiles;
}

/**
 * Create an empty board of the given size, with all cells initialized to null.
 */
export function createWordCraftBoard(size: number = 13): (PlacedTile | null)[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}
