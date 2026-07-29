export interface GridPosition {
  row: number;
  col: number;
}

/** Check if cells are adjacent (including diagonals) */
export function areAdjacent(cell1: GridPosition, cell2: GridPosition): boolean {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
}
