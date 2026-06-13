/**
 * Bug 2 fix — "tiles disappear with no effect".
 *
 * The blast FX layer (BlastEffectsCanvas → spawnDebris + per-type shatter) is
 * driven by an explicit list of cleared tiles. That list used to contain only the
 * submitted word's tiles, so anything cleared by a bomb/lightning/prism CHAIN was
 * removed from the board with no shatter or debris — it just vanished.
 *
 * The engine, after `submitWord`, leaves every cleared tile flagged `isCleared`
 * (gravity runs later, in the cascade). So diffing the pre-clear grid against the
 * post-clear grid recovers the FULL set the engine actually cleared. The FX type
 * is read from the PRE-clear tile so each cell gets the right effect (bomb shatter,
 * ice dissolve, …); plain chain neighbours come back as 'standard' → cheap debris.
 */
import type { BlastTileState, BlastTileType } from '../types';

export interface ClearedTileFx {
  row: number;
  col: number;
  type: BlastTileType;
}

export function diffClearedTiles(
  preGrid: BlastTileState[][],
  postGrid: BlastTileState[][],
): ClearedTileFx[] {
  const out: ClearedTileFx[] = [];
  for (let r = 0; r < preGrid.length; r++) {
    const preRow = preGrid[r];
    const postRow = postGrid[r];
    if (!preRow || !postRow) continue;
    for (let c = 0; c < preRow.length; c++) {
      const pre = preRow[c];
      const post = postRow[c];
      if (pre && post?.isCleared && !pre.isCleared) {
        out.push({ row: r, col: c, type: pre.type });
      }
    }
  }
  return out;
}
