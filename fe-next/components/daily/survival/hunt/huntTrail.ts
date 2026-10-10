import type { HuntCell } from './huntStage';

export const CELL_UNIT = 100;

export function cellCentre(cell: HuntCell): { x: number; y: number } {
  return { x: (cell.col + 0.5) * CELL_UNIT, y: (cell.row + 0.5) * CELL_UNIT };
}

export function trailPath(cells: HuntCell[]): string {
  return cells
    .map((c, i) => {
      const { x, y } = cellCentre(c);
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join('');
}
