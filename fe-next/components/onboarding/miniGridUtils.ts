import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, type LucideIcon } from 'lucide-react';

export interface GridPosition {
  row: number;
  col: number;
}

export interface SelectedCell extends GridPosition {
  letter: string;
  index: number;
}

export interface ShakingCell extends GridPosition {
  id: number;
}

export interface GridMeasurements {
  gridRect: DOMRect;
  cellWidth: number;
  cellHeight: number;
  gridPaddingLeft: number;
  gridPaddingTop: number;
  cellWithGapWidth: number;
  cellWithGapHeight: number;
  timestamp: number;
}

/** Get arrow direction from current cell to next cell */
export function getArrowDirection(from: GridPosition | null, to: GridPosition): string {
  if (!from) return 'point';

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;

  if (rowDiff === 0 && colDiff > 0) return 'right';
  if (rowDiff === 0 && colDiff < 0) return 'left';
  if (rowDiff > 0 && colDiff === 0) return 'down';
  if (rowDiff < 0 && colDiff === 0) return 'up';
  if (rowDiff > 0 && colDiff > 0) return 'down-right';
  if (rowDiff > 0 && colDiff < 0) return 'down-left';
  if (rowDiff < 0 && colDiff > 0) return 'up-right';
  if (rowDiff < 0 && colDiff < 0) return 'up-left';

  return 'point';
}

/** Arrow component map */
export const ArrowComponents: Record<string, LucideIcon> = {
  'right': ArrowRight,
  'left': ArrowLeft,
  'down': ArrowDown,
  'up': ArrowUp,
  'down-right': ArrowDownRight,
  'down-left': ArrowDownLeft,
  'up-right': ArrowUpRight,
  'up-left': ArrowUpLeft,
  'point': ArrowDown,
};

/** Check if cells are adjacent (including diagonals) */
export function areAdjacent(cell1: GridPosition, cell2: GridPosition): boolean {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
}

/** Measure grid layout from DOM and return cached measurements */
export function measureGridLayout(
  gridElement: HTMLDivElement,
  letters: string[][],
  _size: number
): GridMeasurements | null {
  const gridRect = gridElement.getBoundingClientRect();
  const rows = letters.length;

  const firstCell = gridElement.querySelector('[data-row="0"][data-col="0"]');
  if (!firstCell) return null;

  const firstCellRect = firstCell.getBoundingClientRect();
  const cellWidth = firstCellRect.width;
  const cellHeight = firstCellRect.height;
  const gridPaddingLeft = firstCellRect.left - gridRect.left;
  const gridPaddingTop = firstCellRect.top - gridRect.top;

  const secondCell = gridElement.querySelector('[data-row="0"][data-col="1"]');
  const gapX = secondCell
    ? secondCell.getBoundingClientRect().left - firstCellRect.right
    : 8;

  const cellInSecondRow = rows > 1 ? gridElement.querySelector('[data-row="1"][data-col="0"]') : null;
  const gapY = cellInSecondRow
    ? cellInSecondRow.getBoundingClientRect().top - firstCellRect.bottom
    : gapX;

  return {
    gridRect,
    cellWidth,
    cellHeight,
    gridPaddingLeft,
    gridPaddingTop,
    cellWithGapWidth: cellWidth + gapX,
    cellWithGapHeight: cellHeight + gapY,
    timestamp: performance.now(),
  };
}

/** Get cell at touch position using math (not elementFromPoint) */
export function getCellAtTouchPosition(
  touchX: number,
  touchY: number,
  measurements: GridMeasurements,
  rows: number,
  cols: number
): { row: number; col: number } | null {
  const adjustedX = touchX - measurements.gridRect.left - measurements.gridPaddingLeft;
  const adjustedY = touchY - measurements.gridRect.top - measurements.gridPaddingTop;

  const col = Math.floor(adjustedX / measurements.cellWithGapWidth);
  const row = Math.floor(adjustedY / measurements.cellWithGapHeight);

  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

  const cellStartX = col * measurements.cellWithGapWidth;
  const cellStartY = row * measurements.cellWithGapHeight;
  const xInCell = adjustedX - cellStartX;
  const yInCell = adjustedY - cellStartY;

  if (xInCell < -10 || xInCell > measurements.cellWithGapWidth + 10) return null;
  if (yInCell < -10 || yInCell > measurements.cellWithGapHeight + 10) return null;

  return { row, col };
}
