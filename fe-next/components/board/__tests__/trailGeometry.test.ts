import { describe, it, expect } from 'vitest';
import { trailStroke, trailPoints, toPointsAttr, tailSegment } from '../trailGeometry';

describe('trailStroke', () => {
  it('given a 60px cell, scales the ink underlay wider than the accent core', () => {
    const s = trailStroke(60);
    expect(s.underlay).toBeGreaterThan(s.halo);
    expect(s.halo).toBeGreaterThan(s.core);
    expect(s.underlay).toBeCloseTo(60 * 0.31, 5);
  });

  it('given a tiny cell, clamps every layer to a visible minimum', () => {
    const s = trailStroke(8);
    expect(s.core).toBeGreaterThanOrEqual(5);
    expect(s.underlay).toBeGreaterThanOrEqual(10);
  });
});

describe('trailPoints', () => {
  const centers = new Map([
    ['0-0', { x: 50, y: 50 }],
    ['0-1', { x: 150, y: 50 }],
    ['1-1', { x: 150, y: 150 }],
  ]);
  const cells = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
  ];

  it('given selected cells, returns one point per cell at its center plus the per-index lift', () => {
    const pts = trailPoints(cells, centers, (i) => -2 - i);
    expect(pts).toEqual([
      { x: 50, y: 48 },
      { x: 150, y: 47 },
      { x: 150, y: 146 },
    ]);
  });

  it('given a cell with no measured center, skips it instead of drawing to the origin', () => {
    const pts = trailPoints([{ row: 0, col: 0 }, { row: 9, col: 9 }], centers, () => 0);
    expect(pts).toEqual([{ x: 50, y: 50 }]);
  });
});

describe('toPointsAttr', () => {
  it('joins points as space-separated x,y pairs with two decimals', () => {
    expect(toPointsAttr([{ x: 1, y: 2.345 }, { x: 10, y: 20 }])).toBe('1.00,2.35 10.00,20.00');
  });

  it('given no points, returns an empty string so the polyline renders nothing', () => {
    expect(toPointsAttr([])).toBe('');
  });
});

describe('tailSegment', () => {
  it('given a committed point and a pointer, returns the segment from the point to the pointer', () => {
    expect(tailSegment({ x: 1, y: 1 }, { x: 5, y: 9 })).toEqual([{ x: 1, y: 1 }, { x: 5, y: 9 }]);
  });

  it('given no pointer yet, returns an empty segment', () => {
    expect(tailSegment({ x: 1, y: 1 }, null)).toEqual([]);
  });

  it('given no committed point, returns an empty segment', () => {
    expect(tailSegment(undefined, { x: 5, y: 9 })).toEqual([]);
  });
});
