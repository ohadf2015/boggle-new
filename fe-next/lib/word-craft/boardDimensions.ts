import type { BoardSize } from './board';

export const PHONE_BREAKPOINT_PX = 768;

export interface BoardDims {
  size: BoardSize;
  bagSize: number;
}

// Bags are deliberately small for SOLO play: a tighter bag ends the game in
// ~6-8 rounds, which feels like a complete match instead of dragging toward an
// invisible 100-tile horizon (the "no ending" complaint).
export const PHONE_DIMS: BoardDims = { size: 11, bagSize: 54 };
export const TABLET_DIMS: BoardDims = { size: 13, bagSize: 70 };

export function getBoardDims(viewportWidth: number): BoardDims {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return PHONE_DIMS;
  return viewportWidth < PHONE_BREAKPOINT_PX ? PHONE_DIMS : TABLET_DIMS;
}
