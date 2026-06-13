/**
 * Pure ice/frozen THAW logic — single source of truth shared by the client
 * engine (useBlastEngine) and the server cascade (blastModeManager).
 *
 * An ice/frozen tile thaws when it is 8-directionally adjacent to any cell in a
 * submitted word path. Kept structurally typed (no React, no concrete
 * BlastTileState import) so it is safe to import from both browser and backend.
 */

/**
 * Tile types that are LOCKED until thawed by an adjacent word.
 *
 * Ice was removed (2026-06-13): players found "can't select this tile" confusing.
 * Ice now spawns as a directly-selectable, meltable tile (2-hit crack→melt via
 * hitsRemaining) — it is no longer lockable. Only `frozen` (the inner-special
 * vault) still gates selection; it's currently retired from spawning anyway.
 */
export const THAWABLE_TYPES: ReadonlySet<string> = new Set(['frozen']);

type CellCoord = { row: number; col: number };

/** Minimal tile shape this module needs — both client and server tiles satisfy it. */
interface ThawableTile {
  row: number;
  col: number;
  type: string;
  isCleared?: boolean;
  isThawed?: boolean;
}

/**
 * After a word is submitted, compute which ice/frozen tiles should thaw.
 * A tile thaws if it is adjacent (8-directional) to any cell in the path and is
 * not itself in the path, already cleared, or already thawed.
 */
export function computeThawedCells(
  tileStates: ReadonlyArray<ReadonlyArray<ThawableTile>>,
  path: ReadonlyArray<CellCoord>,
): CellCoord[] {
  const gridSize = tileStates.length;
  const thawed: CellCoord[] = [];
  const seen = new Set<string>();

  const pathSet = new Set(path.map((c) => `${c.row}-${c.col}`));

  for (const cell of path) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = cell.row + dr;
        const c = cell.col + dc;
        if (r < 0 || r >= gridSize || c < 0 || c >= (tileStates[0]?.length ?? 0)) continue;

        const key = `${r}-${c}`;
        if (seen.has(key) || pathSet.has(key)) continue;
        seen.add(key);

        const tile = tileStates[r]?.[c];
        if (!tile || tile.isCleared || tile.isThawed) continue;
        if (THAWABLE_TYPES.has(tile.type)) {
          thawed.push({ row: r, col: c });
        }
      }
    }
  }

  return thawed;
}
