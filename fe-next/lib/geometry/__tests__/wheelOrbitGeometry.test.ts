import { describe, it, expect } from 'vitest';
import { getWheelOuterOffset } from '../wheelOrbitGeometry';

describe('getWheelOuterOffset — wheel orbit geometry', () => {
  it('places index 0 directly above center (top)', () => {
    const off = getWheelOuterOffset(0, 6, 100);
    expect(off.x).toBeCloseTo(0, 5);
    expect(off.y).toBeCloseTo(-100, 5);
    expect(off.angleDeg).toBe(0);
  });

  it('uses 60° spacing for 6 outer letters (real WheelRush)', () => {
    expect(getWheelOuterOffset(1, 6, 100).angleDeg).toBe(60);
    expect(getWheelOuterOffset(2, 6, 100).angleDeg).toBe(120);
    expect(getWheelOuterOffset(5, 6, 100).angleDeg).toBe(300);
  });

  it('places index 3 of 6 directly below center (180°)', () => {
    const off = getWheelOuterOffset(3, 6, 80);
    expect(off.x).toBeCloseTo(0, 5);
    expect(off.y).toBeCloseTo(80, 5);
  });

  it('uses 90° spacing for 4 outer letters (compact preview)', () => {
    expect(getWheelOuterOffset(1, 4, 50).angleDeg).toBe(90);
    expect(getWheelOuterOffset(1, 4, 50).x).toBeCloseTo(50, 5);
    expect(getWheelOuterOffset(1, 4, 50).y).toBeCloseTo(0, 5);
  });

  it('scales linearly with radius', () => {
    const a = getWheelOuterOffset(2, 6, 50);
    const b = getWheelOuterOffset(2, 6, 100);
    expect(b.x).toBeCloseTo(a.x * 2, 5);
    expect(b.y).toBeCloseTo(a.y * 2, 5);
  });
});
