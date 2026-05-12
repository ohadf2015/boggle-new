'use client';
import type { CellId } from '@/lib/blast/v2/types';

type Props = {
  cells: CellId[];
  getCellCenter: (id: CellId) => { x: number; y: number } | null;
  color: string;
};

export function BlastSelectionPath({ cells, getCellCenter, color }: Props) {
  if (cells.length === 0) return null;
  const pts = cells.map((id) => getCellCenter(id)).filter((p): p is { x: number; y: number } => p != null);
  if (pts.length === 0) return null;
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <svg className="pointer-events-none absolute inset-0" data-testid="blast-selection-path">
      <path d={d} stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} />
    </svg>
  );
}
