import type { TileId } from '../types';

/**
 * 8-direction adjacency check for a tile grid.
 * Two tiles are adjacent if they're within 1 cell in any direction (incl. diagonals)
 * and not the same cell.
 */
export function areAdjacent(a: TileId, b: TileId, cols: number): boolean {
  if (a === b) return false;
  const ar = Math.floor(a / cols);
  const ac = a % cols;
  const br = Math.floor(b / cols);
  const bc = b % cols;
  const dr = Math.abs(ar - br);
  const dc = Math.abs(ac - bc);
  return dr <= 1 && dc <= 1;
}

/** Validate every consecutive pair in path is adjacent + path has no duplicates. */
export function isValidPath(path: TileId[], cols: number): boolean {
  const seen = new Set<TileId>();
  for (let i = 0; i < path.length; i++) {
    if (seen.has(path[i])) return false;
    seen.add(path[i]);
    if (i > 0 && !areAdjacent(path[i - 1], path[i], cols)) return false;
  }
  return true;
}

/**
 * Find an adjacency-respecting path through the grid that spells `word`,
 * using only un-claimed tiles. Returns tile id sequence or null.
 * Used by the bot picker for fair word selection.
 */
export function findAdjacencyPathForWord(
  word: string,
  tiles: { id: TileId; letter: string; claimedBy?: 'bot' | null }[],
  cols: number,
): TileId[] | null {
  const rows = tiles.length / cols;
  const upper = word.toUpperCase();

  function dfs(idx: number, startId: TileId, visited: Set<TileId>, path: TileId[]): TileId[] | null {
    if (idx === upper.length) return [...path];
    const r = Math.floor(startId / cols);
    const c = startId % cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const nextId = (nr * cols + nc) as TileId;
        if (visited.has(nextId)) continue;
        const t = tiles[nextId];
        if (!t || t.claimedBy) continue;
        if (t.letter.toUpperCase() !== upper[idx]) continue;
        visited.add(nextId);
        path.push(nextId);
        const r2 = dfs(idx + 1, nextId, visited, path);
        if (r2) return r2;
        path.pop();
        visited.delete(nextId);
      }
    }
    return null;
  }

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (!t || t.claimedBy) continue;
    if (t.letter.toUpperCase() !== upper[0]) continue;
    const visited = new Set<TileId>([i as TileId]);
    const result = dfs(1, i as TileId, visited, [i as TileId]);
    if (result) return result;
  }
  return null;
}
