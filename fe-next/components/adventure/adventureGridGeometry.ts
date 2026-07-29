/**
 * Adventure Grid Geometry Utilities
 *
 * Handles selection threshold calculations for Adventure Mode grid.
 * Ensures cells are only selected when touch is close to cell center,
 * matching the behavior of the main game mode.
 */

import type { GridTileState } from '@/types/adventure';
import { getDeadzoneThreshold } from '@/utils/consts';

// ==============================================
// CONSTANTS
// ==============================================

/**
 * Selection threshold - must be within this % of cell radius to select.
 * 0.85 = 85% of cell radius from center (matches classic mode for forgiving selection).
 * Previously 0.65 which was too strict and caused missed tiles during fast swipes.
 */
export const CELL_SELECTION_THRESHOLD = 0.85;

/**
 * Diagonal selection threshold - slightly more lenient for diagonal movement.
 * 0.95 = 95% of cell radius (matches classic mode).
 * Previously 0.75 which made diagonal drags frustratingly imprecise.
 */
export const DIAGONAL_SELECTION_THRESHOLD = 0.95;

/**
 * Deadzone threshold - delegates to adaptive getDeadzoneThreshold()
 * from utils/consts which adjusts based on device screen size.
 * Previously hardcoded to 12px.
 */

// ==============================================
// TYPES
// ==============================================

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

export interface CellPosition {
  row: number;
  col: number;
  letter: string;
  distanceFromCenter: number;
  cellRadius: number;
}

// ==============================================
// GRID MEASUREMENT
// ==============================================

/**
 * Measure grid layout and return cached measurements object.
 * This is expensive - cache the result and avoid calling frequently.
 */
export function measureAdventureGrid(
  gridElement: HTMLDivElement,
  gridSize: number
): GridMeasurements | null {
  const gridRect = gridElement.getBoundingClientRect();

  const firstCell = gridElement.querySelector('[role="gridcell"]');
  if (!firstCell) return null;

  const firstCellRect = firstCell.getBoundingClientRect();
  const cellWidth = firstCellRect.width;
  const cellHeight = firstCellRect.height;
  const gridPaddingLeft = firstCellRect.left - gridRect.left;
  const gridPaddingTop = firstCellRect.top - gridRect.top;

  // Calculate horizontal gap between cells
  const allCells = gridElement.querySelectorAll('[role="gridcell"]');
  const lastCellInRow = allCells[gridSize - 1];
  const gapX = lastCellInRow
    ? (lastCellInRow.getBoundingClientRect().left - firstCellRect.left - (gridSize - 1) * cellWidth) /
      Math.max(1, gridSize - 1)
    : 0;

  // Calculate vertical gap between cells
  const firstCellInSecondRow = gridSize > 1 ? allCells[gridSize] : null;
  const gapY = firstCellInSecondRow
    ? firstCellInSecondRow.getBoundingClientRect().top - firstCellRect.top - cellHeight
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

// ==============================================
// CELL DETECTION
// ==============================================

/**
 * Get cell at touch/mouse position with distance from cell center.
 * Uses cached measurements for performance.
 */
export function getCellAtPosition(
  touchX: number,
  touchY: number,
  tiles: GridTileState[],
  gridSize: number,
  measurements: GridMeasurements
): CellPosition | null {
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

  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;

  const index = row * gridSize + col;
  const tile = tiles[index];
  if (!tile) return null;

  // Calculate cell center for distance checking
  const cellCenterX = col * cellWithGapWidth + cellWidth / 2;
  const cellCenterY = row * cellWithGapHeight + cellHeight / 2;
  const distanceFromCenter = Math.sqrt(
    Math.pow(adjustedX - cellCenterX, 2) + Math.pow(adjustedY - cellCenterY, 2)
  );

  return {
    row,
    col,
    letter: tile.letter,
    distanceFromCenter,
    cellRadius: Math.min(cellWidth, cellHeight) / 2,
  };
}

/**
 * Get tile index from row and column.
 */
export function getTileIndex(row: number, col: number, gridSize: number): number {
  return row * gridSize + col;
}

// ==============================================
// SELECTION VALIDATION
// ==============================================

/**
 * Check if a touch position is within selection threshold of a cell.
 * Accounts for diagonal movement (more lenient threshold) and velocity bonus.
 */
export function isWithinSelectionThreshold(
  cellPosition: CellPosition,
  isDiagonal: boolean,
  swipeVelocity: number = 0
): boolean {
  const threshold = isDiagonal ? DIAGONAL_SELECTION_THRESHOLD : CELL_SELECTION_THRESHOLD;
  const selectionThreshold = cellPosition.cellRadius * threshold;

  // Fast swipes get more lenient threshold (matching regular mode)
  const velocityBonus = swipeVelocity > 0.3 ? 0.1 : 0;

  return cellPosition.distanceFromCenter <= selectionThreshold * (1 + velocityBonus);
}

/**
 * Check if two cells are adjacent (8 directions including diagonals).
 */
export function isAdjacentCell(
  cell1: { row: number; col: number },
  cell2: { row: number; col: number }
): boolean {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}

/**
 * Check if movement between two cells is diagonal.
 */
export function isDiagonalMove(
  cell1: { row: number; col: number },
  cell2: { row: number; col: number }
): boolean {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff === 1 && colDiff === 1;
}

/**
 * Check if movement has exceeded the deadzone threshold.
 */
export function hasExceededDeadzone(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): boolean {
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  return totalMovement > getDeadzoneThreshold();
}
