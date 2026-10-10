import { describe, it, expect } from 'vitest';
import { wheelSlotPoint, trailPathD } from '../trailGeometry';

describe('wheelSlotPoint', () => {
  it('puts the centre letter (index -1) on the wheel centre', () => {
    expect(wheelSlotPoint(-1, 100, 6, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('puts outer slot 0 at the top of the orbit', () => {
    const p = wheelSlotPoint(0, 100, 6, 0, 0);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(-100, 6);
  });

  it('places slot 1 of six at 60 degrees clockwise from the top', () => {
    const p = wheelSlotPoint(1, 100, 6, 0, 0);
    expect(p.x).toBeCloseTo(86.6, 1);
    expect(p.y).toBeCloseTo(-50, 1);
  });

  it('offsets from the supplied centre', () => {
    expect(wheelSlotPoint(-1, 100, 6, 10, 20)).toEqual({ x: 10, y: 20 });
  });
});

describe('trailPathD', () => {
  it('is empty when nothing is selected', () => {
    expect(trailPathD([])).toBe('');
  });

  it('moves to the first point and line-tos the rest', () => {
    expect(trailPathD([{ x: 1, y: 2 }, { x: 3.4, y: -4 }])).toBe('M1.0 2.0 L3.4 -4.0');
  });
});
