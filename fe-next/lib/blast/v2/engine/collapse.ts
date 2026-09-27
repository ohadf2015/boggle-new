import type { BlastLevel, BlastColumn, CellId, TileFlag } from '../types';
import { parseCell, cellId } from './cell-id';

export type CollapseResult = {
  level: BlastLevel;
  thawedCells: CellId[];
  slidCells: { from: CellId; to: CellId }[];
  // Per-column old-row -> new-row map for every tile that survived the collapse.
  // Keyed by column index. Reflects vertical gravity only (lateral slides are in slidCells).
  rowRemapByCol: Map<number, Map<number, number>>;
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

  return { level: resultLevel, thawedCells: thawed, slidCells: slid, rowRemapByCol: flagRemapByCol };
}

// Produce post-collapse tileIds parallel to `collapse.level.columns`, given the
// pre-collapse columns + pre-collapse tileIds. Surviving tiles keep their id and
// move to their new slot; popped tiles' ids drop out; lateral-slid tiles' ids
// move columns. Pure — mirrors the gravity collapseCells applied to the tiles.
export function rebuildTileIds(
  oldColumns: BlastColumn[],
  oldTileIds: string[][],
  collapse: CollapseResult,
): string[][] {
  // Step 1: vertical gravity — remap each surviving tile id to its new row.
  const byColIndex = new Map<number, string[]>();
  oldColumns.forEach((col, c) => {
    const remap = collapse.rowRemapByCol.get(col.index);
    const next = new Array<string>(remap ? remap.size : 0);
    if (remap) {
      for (const [oldRow, newRow] of remap) {
        next[newRow] = oldTileIds[c]![oldRow]!;
      }
    }
    byColIndex.set(col.index, next);
  });

  // Step 2: lateral slides (gravityMode 'lateral-slide' only).
  for (const { from, to } of collapse.slidCells) {
    const moving = byColIndex.get(parseCell(from).col);
    const target = byColIndex.get(parseCell(to).col);
    if (moving && target && moving.length > 0) {
      target.push(moving[0]!);
      byColIndex.set(parseCell(from).col, []);
    }
  }

  // Emit parallel to the post-collapse column order.
  return collapse.level.columns.map((col) => byColIndex.get(col.index) ?? []);
}
