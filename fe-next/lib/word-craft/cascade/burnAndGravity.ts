import { draw, type TileBag } from '../tileBag';
import { cellIdFor, type CascadeCell, type CascadeGrid } from './boardGrid';

function cloneCells(cells: CascadeCell[]): CascadeCell[] {
  return cells.map((c) => ({ id: c.id, letter: c.letter, value: c.value }));
}

function rebuildIndex(cells: CascadeCell[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < cells.length; i++) m.set(cells[i].id, i);
  return m;
}

export function burnCells(grid: CascadeGrid, cellIds: ReadonlyArray<string>): CascadeGrid {
  if (cellIds.length === 0) {
    return { rows: grid.rows, cols: grid.cols, cells: cloneCells(grid.cells), index: new Map(grid.index) };
  }
  const cells = cloneCells(grid.cells);
  const toBurn = new Set(cellIds);
  for (let i = 0; i < cells.length; i++) {
    if (toBurn.has(cells[i].id)) {
      cells[i] = { id: cells[i].id, letter: null, value: 0 };
    }
  }
  return { rows: grid.rows, cols: grid.cols, cells, index: rebuildIndex(cells) };
}

export interface GravityResult {
  grid: CascadeGrid;
  spawnedCellIds: string[];
}

/**
 * Apply column-wise gravity: surviving letters fall to the bottom of each column,
 * empty slots migrate to the top, and the top empty slots are refilled from the
 * tile bag. Cell ids are positional and remain stable across this operation —
 * only the (letter, value) payload moves.
 */
export function applyGravity(grid: CascadeGrid, bag: TileBag): GravityResult {
  const cells = cloneCells(grid.cells);
  const { rows, cols } = grid;
  const spawnedCellIds: string[] = [];

  for (let col = 0; col < cols; col++) {
    // Collect surviving letters (bottom to top) for this column
    const survivors: Array<{ letter: string; value: number }> = [];
    for (let row = rows - 1; row >= 0; row--) {
      const cell = cells[row * cols + col];
      if (cell.letter !== null) survivors.push({ letter: cell.letter, value: cell.value });
    }

    // Refill column from bottom up
    let writeRow = rows - 1;
    for (const survivor of survivors) {
      cells[writeRow * cols + col] = {
        id: cellIdFor(writeRow, col),
        letter: survivor.letter,
        value: survivor.value,
      };
      writeRow--;
    }
    // Remaining top slots need new tiles from bag
    while (writeRow >= 0) {
      const [newTile] = draw(bag, 1);
      if (!newTile) {
        throw new Error('applyGravity: bag empty, cannot refill grid');
      }
      cells[writeRow * cols + col] = {
        id: cellIdFor(writeRow, col),
        letter: newTile.letter,
        value: newTile.value,
      };
      spawnedCellIds.push(cellIdFor(writeRow, col));
      writeRow--;
    }
  }

  // Sort spawnedCellIds top-down then left-right by parsing the id (s-r-c)
  spawnedCellIds.sort((a, b) => {
    const [, ar, ac] = a.split('-').map(Number);
    const [, br, bc] = b.split('-').map(Number);
    if (ar !== br) return ar - br;
    return ac - bc;
  });

  return {
    grid: { rows, cols, cells, index: rebuildIndex(cells) },
    spawnedCellIds,
  };
}
