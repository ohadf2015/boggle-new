import { render } from '@testing-library/react';
import { BlastSelectionPath } from '../BlastSelectionPath';

describe('BlastSelectionPath', () => {
  it('renders nothing when fewer than 2 cells selected', () => {
    const { container } = render(
      <BlastSelectionPath selectedCells={[{ row: 0, col: 0, letter: 'A' }]} gridSize={6} />
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders nothing when no cells selected', () => {
    const { container } = render(
      <BlastSelectionPath selectedCells={[]} gridSize={6} />
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders SVG with polyline when 2+ cells selected', () => {
    const cells = [
      { row: 0, col: 0, letter: 'A' },
      { row: 0, col: 1, letter: 'B' },
      { row: 1, col: 1, letter: 'C' },
    ];
    const { container } = render(
      <BlastSelectionPath selectedCells={cells} gridSize={6} />
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 6 6');

    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBe(2); // glow + core

    // Verify points format: "col+0.5,row+0.5"
    const points = polylines[1]?.getAttribute('points');
    expect(points).toBe('0.5,0.5 1.5,0.5 1.5,1.5');
  });

  it('uses aria-hidden for accessibility', () => {
    const cells = [
      { row: 0, col: 0, letter: 'A' },
      { row: 1, col: 0, letter: 'B' },
    ];
    const { container } = render(
      <BlastSelectionPath selectedCells={cells} gridSize={6} />
    );
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('adapts viewBox to gridSize', () => {
    const cells = [
      { row: 0, col: 0, letter: 'A' },
      { row: 0, col: 1, letter: 'B' },
    ];
    const { container } = render(
      <BlastSelectionPath selectedCells={cells} gridSize={8} />
    );
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 8 8');
  });
});
