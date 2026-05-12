import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastSelectionPath } from '../BlastSelectionPath';
import { cellId } from '@/lib/blast/v2/engine';

describe('BlastSelectionPath', () => {
  const mockGetCellCenter = (id: string) => {
    const coords: Record<string, { x: number; y: number }> = {
      'c0r0': { x: 30, y: 30 },
      'c0r1': { x: 30, y: 90 },
      'c0r2': { x: 30, y: 150 },
    };
    return coords[id] || null;
  };

  it('3 cells produce SVG path with M and L commands', () => {
    const { container } = render(
      <BlastSelectionPath
        cells={[cellId(0, 0), cellId(0, 1), cellId(0, 2)]}
        getCellCenter={mockGetCellCenter}
        color="#ff0000"
      />
    );
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute('d')).toMatch(/^M 30 30/);
    expect(path?.getAttribute('d')).toMatch(/L 30 90/);
    expect(path?.getAttribute('d')).toMatch(/L 30 150/);
  });

  it('empty cells returns null', () => {
    const { container } = render(
      <BlastSelectionPath cells={[]} getCellCenter={mockGetCellCenter} color="#ff0000" />
    );
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
