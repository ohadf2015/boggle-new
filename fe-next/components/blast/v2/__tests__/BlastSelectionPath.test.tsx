import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { BlastSelectionPath } from '../BlastSelectionPath';
import { cellId } from '@/lib/blast/v2/engine';

// jsdom doesn't implement SVGPathElement.getTotalLength — stub before render
// so the GSAP draw-in effect doesn't throw. Real browsers return the actual
// path length; tests just need a numeric stand-in.
beforeAll(() => {
  if (typeof SVGPathElement !== 'undefined'
    && typeof (SVGPathElement.prototype as unknown as { getTotalLength?: () => number }).getTotalLength !== 'function') {
    (SVGPathElement.prototype as unknown as { getTotalLength: () => number }).getTotalLength = () => 240;
  }
});

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
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2); // glow + main
    const mainPath = paths[1];
    expect(mainPath.getAttribute('d')).toMatch(/^M 30 30/);
    expect(mainPath.getAttribute('d')).toMatch(/L 30 90/);
    expect(mainPath.getAttribute('d')).toMatch(/L 30 150/);
  });

  it('empty cells returns null', () => {
    const { container } = render(
      <BlastSelectionPath cells={[]} getCellCenter={mockGetCellCenter} color="#ff0000" />
    );
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('growing cell count re-renders without throwing', () => {
    const { rerender, container } = render(
      <BlastSelectionPath cells={[cellId(0, 0)]} getCellCenter={mockGetCellCenter} color="#0f0" />
    );
    rerender(<BlastSelectionPath cells={[cellId(0, 0), cellId(0, 1)]} getCellCenter={mockGetCellCenter} color="#0f0" />);
    rerender(<BlastSelectionPath cells={[cellId(0, 0), cellId(0, 1), cellId(0, 2)]} getCellCenter={mockGetCellCenter} color="#0f0" />);
    expect(container.querySelectorAll('path').length).toBe(2);
  });
});
