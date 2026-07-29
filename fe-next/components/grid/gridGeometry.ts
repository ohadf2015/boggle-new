/**
 * Grid Geometry Utilities
 * Handles grid measurement, cell position calculation, and adjacency logic.
 * Extracted from useGridInteraction to reduce complexity.
 */

import type { LetterGrid, GridPosition } from '@/types';
import type { CellPosition, SelectedCell } from './types';

// Selection threshold - must be within this % of cell center to select
export const CELL_SELECTION_THRESHOLD = 0.85;
// Diagonal selection threshold - slightly more lenient for diagonal movement
export const DIAGONAL_SELECTION_THRESHOLD = 0.95;

/**
 * Cached grid measurements to avoid layout thrashing on every touch move
 */
export interface GridMeasurements {
  gridRect: DOMRect;
  cellWidth: number;
  cellHeight: number;
  gridPaddingLeft: number;
  gridPaddingTop: number;
  gapX: number;
  gapY: number;
  cellWithGapWidth: number;
  cellWithGapHeight: number;
  timestamp: number;
}

/**
 * Check if two cells are adjacent (8 directions including diagonals)
 */
export function isAdjacentCell(cell1: GridPosition, cell2: GridPosition): boolean {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}

/**
 * Check if movement between two cells is diagonal
 */
export function isDiagonalMove(cell1: GridPosition, cell2: GridPosition): boolean {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff === 1 && colDiff === 1;
}

/**
 * Get all adjacent cells that can be selected (not already selected)
 */
export function getSelectableAdjacentCells(
  lastCell: GridPosition | null,
  grid: LetterGrid,
  selectedCells: SelectedCell[]
): GridPosition[] {
  if (!lastCell) return [];

  const rows = grid.length;
  const cols = grid[0]?.length || 4;
  const adjacent: GridPosition[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;

      const newRow = lastCell.row + dr;
      const newCol = lastCell.col + dc;

      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
        const isSelected = selectedCells.some(c => c.row === newRow && c.col === newCol);
        if (!isSelected) {
          adjacent.push({ row: newRow, col: newCol });
        }
      }
    }
  }

  return adjacent;
}

/**
 * Measure grid layout and return measurements object.
 * This is an expensive operation - cache the result and avoid calling frequently.
 */
export function measureGrid(
  gridElement: HTMLDivElement,
  grid: LetterGrid
): GridMeasurements | null {
  const gridRect = gridElement.getBoundingClientRect();
  const cols = grid[0]?.length || 4;
  const rows = grid.length;

  const firstCell = gridElement.children[0];
  if (!firstCell) return null;

  const firstCellRect = firstCell.getBoundingClientRect();
  const cellWidth = firstCellRect.width;
  const cellHeight = firstCellRect.height;
  const gridPaddingLeft = firstCellRect.left - gridRect.left;
  const gridPaddingTop = firstCellRect.top - gridRect.top;

  // Calculate horizontal gap between cells
  const lastCellInRow = gridElement.children[cols - 1];
  const gapX = lastCellInRow
    ? (lastCellInRow.getBoundingClientRect().left - firstCellRect.left - (cols - 1) * cellWidth) / Math.max(1, cols - 1)
    : 0;

  // Calculate vertical gap between cells
  const firstCellInSecondRow = rows > 1 ? gridElement.children[cols] : null;
  const gapY = firstCellInSecondRow
    ? (firstCellInSecondRow.getBoundingClientRect().top - firstCellRect.top - cellHeight)
    : gapX;

  return {
    gridRect,
    cellWidth,
    cellHeight,
    gridPaddingLeft,
    gridPaddingTop,
    gapX,
    gapY,
    cellWithGapWidth: cellWidth + gapX,
    cellWithGapHeight: cellHeight + gapY,
    timestamp: performance.now(),
  };
}

/**
 * Get cell at touch/mouse position with distance from cell center.
 * Uses cached measurements for performance.
 */
export function getCellAtPosition(
  touchX: number,
  touchY: number,
  grid: LetterGrid,
  measurements: GridMeasurements
): CellPosition | null {
  const cols = grid[0]?.length || 4;
  const rows = grid.length;

  const {
    gridRect,
    cellWidth,
    cellHeight,
    gridPaddingLeft,
    gridPaddingTop,
    cellWithGapWidth,
    cellWithGapHeight,
  } = measurements;

  const adjustedX = touchX - gridRect.left - gridPaddingLeft;
  const adjustedY = touchY - gridRect.top - gridPaddingTop;

  const col = Math.floor(adjustedX / cellWithGapWidth);
  const row = Math.floor(adjustedY / cellWithGapHeight);

  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

  const gridRow = grid[row];
  const letter = gridRow?.[col];
  if (!letter) return null;

  // Calculate cell center for distance checking
  const cellCenterX = col * cellWithGapWidth + cellWidth / 2;
  const cellCenterY = row * cellWithGapHeight + cellHeight / 2;
  const distanceFromCenter = Math.sqrt(
    Math.pow(adjustedX - cellCenterX, 2) +
    Math.pow(adjustedY - cellCenterY, 2)
  );

  return {
    row,
    col,
    letter,
    distanceFromCenter,
    cellRadius: Math.min(cellWidth, cellHeight) / 2
  };
}

/**
 * Check if a touch position is within selection threshold of a cell.
 * Accounts for diagonal movement (more lenient threshold) and velocity bonus.
 */
export function isWithinSelectionThreshold(
  cellPosition: CellPosition,
  isDiagonal: boolean,
  swipeVelocity: number
): boolean {
  const threshold = isDiagonal ? DIAGONAL_SELECTION_THRESHOLD : CELL_SELECTION_THRESHOLD;
  const selectionThreshold = cellPosition.cellRadius * threshold;

  // Fast swipes get more lenient threshold
  const velocityBonus = swipeVelocity > 0.3 ? 0.1 : 0;

  return cellPosition.distanceFromCenter <= selectionThreshold * (1 + velocityBonus);
}
