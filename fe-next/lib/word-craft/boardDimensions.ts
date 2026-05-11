import type { BoardSize } from './board';

export const PHONE_BREAKPOINT_PX = 768;

export interface BoardDims {
  size: BoardSize;
  bagSize: number;
}

const PHONE_DIMS: BoardDims = { size: 11, bagSize: 78 };
const TABLET_DIMS: BoardDims = { size: 13, bagSize: 100 };

export function getBoardDims(viewportWidth: number): BoardDims {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return PHONE_DIMS;
  return viewportWidth < PHONE_BREAKPOINT_PX ? PHONE_DIMS : TABLET_DIMS;
}
