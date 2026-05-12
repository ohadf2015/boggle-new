/**
 * BlastDragTrail — TDD for the SVG path overlay that connects selected tile
 * centers during a drag. SpellTower-style line trail. Pure presentational
 * component: takes selected cells + grid metrics, renders a polyline.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastDragTrail } from '../BlastDragTrail';

const mkCell = (row: number, col: number) => ({ row, col });

describe('BlastDragTrail', () => {
  it('renders nothing when 0 cells selected', () => {
    const { container } = render(
      <BlastDragTrail
        selectedCells={[]}
        gridSize={6}
        containerWidth={600}
        padding={8}
      />,
    );
    expect(container.querySelector('polyline')).not.toBeInTheDocument();
  });

  it('renders nothing when only 1 cell selected (no line possible)', () => {
    const { container } = render(
      <BlastDragTrail
        selectedCells={[mkCell(0, 0)]}
        gridSize={6}
        containerWidth={600}
        padding={8}
      />,
    );
    expect(container.querySelector('polyline')).not.toBeInTheDocument();
  });

  it('renders polyline with 2 points when 2 cells selected', () => {
    const { container } = render(
      <BlastDragTrail
        selectedCells={[mkCell(0, 0), mkCell(0, 1)]}
        gridSize={6}
        containerWidth={600}
        padding={8}
      />,
    );
    const poly = container.querySelector('polyline');
    expect(poly).toBeInTheDocument();
    const points = poly!.getAttribute('points')!;
    // 2 coordinate pairs separated by space
    expect(points.split(' ').filter(Boolean)).toHaveLength(2);
  });

  it('connects exactly N centers for N selected cells', () => {
    const cells = [mkCell(0, 0), mkCell(1, 0), mkCell(1, 1), mkCell(2, 1), mkCell(2, 2)];
    const { container } = render(
      <BlastDragTrail
        selectedCells={cells}
        gridSize={6}
        containerWidth={600}
        padding={8}
      />,
    );
    const poly = container.querySelector('polyline');
    expect(poly!.getAttribute('points')!.split(' ').filter(Boolean)).toHaveLength(5);
  });

  it('places center of (0,0) tile at expected coords (padding offset + half cell)', () => {
    // gridSize=6, containerWidth=600, padding=8 → playable=584, cell=584/6
    const { container } = render(
      <BlastDragTrail
        selectedCells={[mkCell(0, 0), mkCell(0, 1)]}
        gridSize={6}
        containerWidth={600}
        padding={8}
      />,
    );
    const poly = container.querySelector('polyline')!;
    const firstPoint = poly.getAttribute('points')!.split(' ')[0];
    const [x, y] = firstPoint.split(',').map(Number);
    const cellSize = (600 - 16) / 6;
    expect(x).toBeCloseTo(8 + cellSize / 2, 1);
    expect(y).toBeCloseTo(8 + cellSize / 2, 1);
  });

  it('polyline is decorative (aria-hidden + non-interactive)', () => {
    const { container } = render(
      <BlastDragTrail
        selectedCells={[mkCell(0, 0), mkCell(0, 1)]}
        gridSize={6}
        containerWidth={600}
        padding={8}
      />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.style.pointerEvents).toBe('none');
  });

  it('exposes data-testid for integration probe', () => {
    render(
      <BlastDragTrail
        selectedCells={[mkCell(0, 0), mkCell(0, 1)]}
        gridSize={6}
        containerWidth={600}
        padding={8}
      />,
    );
    expect(screen.getByTestId('blast-drag-trail')).toBeInTheDocument();
  });

  it('does NOT render when containerWidth is 0 or negative (pre-measure)', () => {
    const { container } = render(
      <BlastDragTrail
        selectedCells={[mkCell(0, 0), mkCell(0, 1)]}
        gridSize={6}
        containerWidth={0}
        padding={8}
      />,
    );
    expect(container.querySelector('polyline')).not.toBeInTheDocument();
  });
});
