import type { BlastTileState } from '../types';
import { predictBlastClears } from './blastPredictClears';

export type BlastPreviewMark = 'hit' | 'gem';

/** Words this long also clear their middle row, so they get a preview even with no special. */
const ROW_CLEAR_LENGTH = 7;

/**
 * Tiles a traced path would blast beyond its own letters, keyed `row-col`: 'gem' for a gem
 * it would collect, 'hit' for anything else. Null when the path blasts nothing extra, so
 * a plain word shows no preview at all.
 */
export function buildBlastPreview(
  tiles: BlastTileState[][],
  path: ReadonlyArray<{ row: number; col: number }>,
  gridSize: number,
): Map<string, BlastPreviewMark> | null {
  if (path.length === 0 || tiles.length === 0) return null;
  const triggers = path.length >= ROW_CLEAR_LENGTH
    || path.some(p => {
      const tile = tiles[p.row]?.[p.col];
      return !!tile && !tile.isCleared && tile.type !== 'standard';
    });
  if (!triggers) return null;

  const pathKeys = new Set(path.map(p => `${p.row},${p.col}`));
  const cleared = predictBlastClears(tiles, [...path], 'x'.repeat(path.length), gridSize)
    .filter(c => !pathKeys.has(`${c.row},${c.col}`));
  if (cleared.length === 0) return null;

  const marks = new Map<string, BlastPreviewMark>();
  for (const c of cleared) marks.set(`${c.row}-${c.col}`, c.type === 'diamond' ? 'gem' : 'hit');
  return marks;
}
