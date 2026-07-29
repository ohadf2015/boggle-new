import type { CellId } from '../types';

export const cellId = (col: number, row: number): CellId => `c${col}r${row}` as CellId;

export function parseCell(id: CellId): { col: number; row: number } {
  const m = id.match(/^c(\d+)r(\d+)$/);
  if (!m) throw new Error(`bad CellId: ${id}`);
  return { col: Number(m[1]), row: Number(m[2]) };
}
