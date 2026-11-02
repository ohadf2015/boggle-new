import type { BlastTileState } from '../types';
import { processTilesForWord } from './clearTilesProcessor';

/** Dry run of the engine's clear step: every live tile this word would remove, with its type. */
export function predictBlastClears(
  tiles: BlastTileState[][],
  path: Array<{ row: number; col: number }>,
  word: string,
  gridSize: number,
): Array<{ row: number; col: number; type: BlastTileState['type'] }> {
  const cleared: Array<{ row: number; col: number; type: BlastTileState['type'] }> = [];
  let next: BlastTileState[][];
  try {
    ({ next } = processTilesForWord({ prev: tiles, path, word, baseScore: 0, gridSize, currentWave: 1, rng: () => 0.5 }));
  } catch {
    return cleared; // display-only: the engine still clears whatever it clears
  }
  for (const row of tiles) {
    for (const before of row) {
      if (!before.isCleared && next[before.row]?.[before.col]?.isCleared) {
        cleared.push({ row: before.row, col: before.col, type: before.type });
      }
    }
  }
  return cleared;
}
