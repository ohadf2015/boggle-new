/**
 * Word Workshop board hints: the empty cells a new word can hook onto
 * (orthogonally next to a committed tile). The skin glows them so the phone
 * board shows where to build instead of reading as dead squares.
 */

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/** Keys ("r,c") of empty cells orthogonally adjacent to any placed cell. */
export function buildableCells(placed: ReadonlySet<string>, size: number): Set<string> {
  const out = new Set<string>();
  for (const key of placed) {
    const [r, c] = key.split(',').map(Number);
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const k = `${nr},${nc}`;
      if (!placed.has(k)) out.add(k);
    }
  }
  return out;
}
