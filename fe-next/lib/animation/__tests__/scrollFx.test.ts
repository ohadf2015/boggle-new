import { describe, it, expect } from 'vitest';
import { magneticOffset, parallaxShift } from '../scrollFx';

describe('magneticOffset', () => {
  const box = { left: 100, top: 100, width: 200, height: 100 }; // center = (200, 150)

  it('returns zero offset when pointer is at the element center', () => {
    expect(magneticOffset(200, 150, box)).toEqual({ x: 0, y: 0 });
  });

  it('pulls toward the pointer scaled by strength (default 0.4)', () => {
    // pointer 100px right, 50px below center
    expect(magneticOffset(300, 200, box)).toEqual({ x: 40, y: 20 });
  });

  it('respects a custom strength', () => {
    expect(magneticOffset(300, 150, box, 0.5)).toEqual({ x: 50, y: 0 });
  });

  it('produces negative offsets when pointer is left/above center', () => {
    const { x, y } = magneticOffset(100, 100, box, 1);
    expect(x).toBe(-100);
    expect(y).toBe(-50);
  });
});

describe('parallaxShift', () => {
  it('is zero at the midpoint of the scroll range', () => {
    expect(parallaxShift(0.5, 80)).toBe(0);
  });

  it('maps progress 0 -> -distance/2 and progress 1 -> +distance/2', () => {
    expect(parallaxShift(0, 80)).toBe(-40);
    expect(parallaxShift(1, 80)).toBe(40);
  });

  it('clamps progress outside [0,1]', () => {
    expect(parallaxShift(-2, 80)).toBe(-40);
    expect(parallaxShift(5, 80)).toBe(40);
  });
});
