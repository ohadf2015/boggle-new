import { describe, it, expect } from 'vitest';
import {
  clamp,
  normalizePointer,
  pointerToTilt,
  parallaxOffset,
  shadowForTilt,
  type Rect,
} from './tilt';

// 200x100 box at origin -> center is (100, 50)
const RECT: Rect = { left: 0, top: 0, width: 200, height: 100 };

describe('clamp', () => {
  it('passes values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps to the bounds', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('normalizePointer', () => {
  it('returns 0,0 at the exact center', () => {
    expect(normalizePointer(100, 50, RECT)).toEqual({ nx: 0, ny: 0 });
  });

  it('returns +1 at the right/bottom edge and -1 at the left/top edge', () => {
    expect(normalizePointer(200, 100, RECT)).toEqual({ nx: 1, ny: 1 });
    expect(normalizePointer(0, 0, RECT)).toEqual({ nx: -1, ny: -1 });
  });

  it('clamps pointers outside the rect to [-1, 1]', () => {
    expect(normalizePointer(400, 300, RECT)).toEqual({ nx: 1, ny: 1 });
    expect(normalizePointer(-400, -300, RECT)).toEqual({ nx: -1, ny: -1 });
  });

  it('returns 0,0 for a degenerate rect (not yet measured)', () => {
    expect(normalizePointer(50, 50, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ nx: 0, ny: 0 });
  });
});

describe('pointerToTilt', () => {
  it('is flat at the center', () => {
    expect(pointerToTilt(100, 50, RECT, 12)).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it('tilts toward the cursor: right edge yaws +maxDeg, top edge pitches +maxDeg', () => {
    // right edge: nx=1 -> rotateY = +maxDeg
    expect(pointerToTilt(200, 50, RECT, 12).rotateY).toBe(12);
    // top edge: ny=-1 -> rotateX = +maxDeg (card leans back toward a cursor above it)
    expect(pointerToTilt(100, 0, RECT, 12).rotateX).toBe(12);
    // bottom edge: ny=1 -> rotateX = -maxDeg
    expect(pointerToTilt(100, 100, RECT, 12).rotateX).toBe(-12);
  });
});

describe('parallaxOffset', () => {
  it('is zero at the center', () => {
    expect(parallaxOffset(100, 50, RECT, 20)).toEqual({ x: 0, y: 0 });
  });

  it('shifts by ±depth at the edges', () => {
    expect(parallaxOffset(200, 50, RECT, 20).x).toBe(20);
    expect(parallaxOffset(0, 50, RECT, 20).x).toBe(-20);
  });

  it('supports negative depth for layers that move against the pointer', () => {
    expect(parallaxOffset(200, 50, RECT, -20).x).toBe(-20);
  });
});

describe('shadowForTilt', () => {
  it('returns the resting offset when flat', () => {
    expect(shadowForTilt(0, 0, 8, 0.6)).toEqual({ x: 8, y: 8 });
  });

  it('moves the hard shadow opposite the yaw and along the pitch', () => {
    // yaw right (rotateY=+10) -> shadow slides left (x shrinks)
    expect(shadowForTilt(0, 10, 8, 0.6).x).toBeCloseTo(2);
    // pitch down (rotateX=+10) -> shadow grows downward (y grows)
    expect(shadowForTilt(10, 0, 8, 0.6).y).toBeCloseTo(14);
  });
});
