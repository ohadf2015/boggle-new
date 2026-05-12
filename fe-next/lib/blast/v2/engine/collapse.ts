import type { BlastLevel, BlastColumn, CellId, TileFlag } from '../types';
import { parseCell, cellId } from './cell-id';

export type CollapseResult = {
  level: BlastLevel;
  thawedCells: CellId[];
  slidCells: { from: CellId; to: CellId }[];
};

export function collapseCells(level: BlastLevel, popped: CellId[]): CollapseResult {
  const removed = new Set(popped);

  // Per-column: build new tile stack + capture flag remap (old row to new row).
  const flagRemapByCol = new Map<number, Map<number, number>>(); // col to (oldRow to newRow)
  const newCols: BlastColumn[] = [];
  for (const col of level.columns) {
    const newTiles: string[] = [];
    const rowMap = new Map<number, number>();
    for (let r = 0; r < col.tiles.length; r++) {
      const id = cellId(col.index, r);
      if (removed.has(id)) continue;
      rowMap.set(r, newTiles.length);
      newTiles.push(col.tiles[r]!);
    }
    flagRemapByCol.set(col.index, rowMap);
    newCols.push({ index: col.index, tiles: newTiles });
  }

  // Re-emit tile flags at new positions.
  const newTileFlags: Partial<Record<CellId, TileFlag[]>> = {};
  for (const [oldIdStr, flags] of Object.entries(level.tileFlags) as [CellId, TileFlag[]][]) {
    const { col, row } = parseCell(oldIdStr);
    if (removed.has(oldIdStr)) continue;
    const rowMap = flagRemapByCol.get(col);
    if (!rowMap) continue;
    const newRow = rowMap.get(row);
    if (newRow === undefined) continue;
    newTileFlags[cellId(col, newRow)] = flags;
  }

  // Frozen thaw: any frozen cell with a popped neighbor (orthogonal) loses 'frozen'.
  const thawed: CellId[] = [];
  for (const [id, flags] of Object.entries(newTileFlags) as [CellId, TileFlag[]][]) {
    if (!flags.includes('frozen')) continue;
    const { col, row } = parseCell(id);
    const neighbors: CellId[] = [
      cellId(col - 1, row), cellId(col + 1, row),
      cellId(col, row - 1), cellId(col, row + 1),
    ];
    if (neighbors.some((n) => removed.has(n))) {
      const filtered = flags.filter((f) => f !== 'frozen');
      if (filtered.length === 0) delete newTileFlags[id];
      else newTileFlags[id] = filtered;
      thawed.push(id);
    }
  }

  let resultLevel: BlastLevel = { ...level, columns: newCols, tileFlags: newTileFlags };
  const slid: { from: CellId; to: CellId }[] = [];

  if (level.gravityMode === 'lateral-slide') {
    const slidesToDo: Array<{ colIdx: number; targetIdx: number }> = [];
    for (const col of resultLevel.columns) {
      if (col.tiles.length !== 1) continue;
      const leftIdx = col.index - 1;
      const rightIdx = col.index + 1;
      const left = resultLevel.columns.find((c) => c.index === leftIdx);
      const right = resultLevel.columns.find((c) => c.index === rightIdx);
      const target = left && left.tiles.length === 0 ? left : right && right.tiles.length === 0 ? right : null;
      if (target) {
        slidesToDo.push({ colIdx: col.index, targetIdx: target.index });
      }
    }
    for (const { colIdx, targetIdx } of slidesToDo) {
      const col = resultLevel.columns.find((c) => c.index === colIdx)!;
      const target = resultLevel.columns.find((c) => c.index === targetIdx)!;
      const from = cellId(col.index, 0);
      const to = cellId(target.index, 0);
      target.tiles.push(col.tiles[0]!);
      col.tiles = [];
      slid.push({ from, to });
    }
  }

  return { level: resultLevel, thawedCells: thawed, slidCells: slid };
}
