/**
 * GridGeometry — pure canvas math for Phaser tile positioning.
 *
 * No DOM access, no Phaser imports — just numbers in, numbers out.
 * Re-exports adjacency helpers from the shared grid utilities.
 */

// Re-export shared adjacency helpers (these are also pure math, no DOM needed)
export { isAdjacentCell, isDiagonalMove } from '@/components/grid/gridGeometry';
export type { GridPosition } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TilePosition {
  row: number;
  col: number;
  /** Centre X in canvas pixels */
  x: number;
  /** Centre Y in canvas pixels */
  y: number;
}

export interface GridLayout {
  /** Canvas-space tile size (width == height, tiles are square) */
  tileSize: number;
  /** Gap between tiles in canvas pixels */
  gap: number;
  /** X offset to the centre of tile (0,0) */
  offsetX: number;
  /** Y offset to the centre of tile (0,0) */
  offsetY: number;
  rows: number;
  cols: number;
  tiles: TilePosition[];
}

// ─── buildGridLayout ──────────────────────────────────────────────────────────

const PADDING_RATIO = 0.05; // 5% of the shortest dimension as minimum padding

/**
 * Compute the tile positions for a square Boggle grid on a Phaser canvas.
 *
 * @param gridSize - Number of tiles per side (e.g. 4 for a 4×4 grid)
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param paddingPx - Optional explicit padding override
 */
export function buildGridLayout(
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number,
  paddingPx?: number
): GridLayout {
  const shortest = Math.min(canvasWidth, canvasHeight);
  const padding = paddingPx ?? shortest * PADDING_RATIO;

  // Allocate the shorter axis for the grid (keep it square)
  const availableSize = shortest - padding * 2;

  // gap = 8% of tile size, at least 2px
  // Solve: gridSize * tileSize + (gridSize - 1) * gap = availableSize
  //   gap = 0.08 * tileSize
  //   gridSize * tileSize + (gridSize - 1) * 0.08 * tileSize = availableSize
  //   tileSize * (gridSize + (gridSize - 1) * 0.08) = availableSize
  const GAP_RATIO = 0.08;
  const tileSize = availableSize / (gridSize + (gridSize - 1) * GAP_RATIO);
  const gap = tileSize * GAP_RATIO;

  // Total grid extent in both axes
  const totalGridWidth = gridSize * tileSize + (gridSize - 1) * gap;
  const totalGridHeight = totalGridWidth; // square

  // Centre the grid within the canvas
  const startX = (canvasWidth - totalGridWidth) / 2 + tileSize / 2;
  const startY = (canvasHeight - totalGridHeight) / 2 + tileSize / 2;

  const tiles: TilePosition[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      tiles.push({
        row,
        col,
        x: startX + col * (tileSize + gap),
        y: startY + row * (tileSize + gap),
      });
    }
  }

  return {
    tileSize,
    gap,
    offsetX: startX,
    offsetY: startY,
    rows: gridSize,
    cols: gridSize,
    tiles,
  };
}

// ─── getTileAtPoint ───────────────────────────────────────────────────────────

/**
 * Return the (row, col) of the tile whose bounding box contains (x, y),
 * or null if the point falls outside every tile.
 */
export function getTileAtPoint(
  x: number,
  y: number,
  layout: GridLayout
): { row: number; col: number } | null {
  const { tileSize, tiles } = layout;
  const half = tileSize / 2;

  for (const tile of tiles) {
    if (
      x >= tile.x - half &&
      x <= tile.x + half &&
      y >= tile.y - half &&
      y <= tile.y + half
    ) {
      return { row: tile.row, col: tile.col };
    }
  }

  return null;
}
