import { describe, it, expect } from 'vitest';
import { lightningPolyline, strikeHoldMs, STRIKE_HOLD_MS, STRIKE_HOLD_REDUCED_MS } from '../lightningPath';

describe('lightningPolyline', () => {
  it('starts at from and ends at to', () => {
    const pts = lightningPolyline({ x: 0, y: 0 }, { x: 100, y: 0 }, { segments: 5, seed: 42 });
    const parts = pts.split(' ');
    expect(parts[0]).toBe('0.0,0.0');
    expect(parts[parts.length - 1]).toBe('100.0,0.0');
    expect(parts.length).toBe(6); // segments + 1
  });

  it('is deterministic for a given seed', () => {
    const a = lightningPolyline({ x: 10, y: 10 }, { x: 80, y: -40 }, { seed: 7 });
    const b = lightningPolyline({ x: 10, y: 10 }, { x: 80, y: -40 }, { seed: 7 });
    expect(a).toBe(b);
  });

  it('differs across seeds (not a straight line only)', () => {
    const a = lightningPolyline({ x: 0, y: 0 }, { x: 0, y: -100 }, { seed: 1, jitter: 14 });
    const b = lightningPolyline({ x: 0, y: 0 }, { x: 0, y: -100 }, { seed: 99, jitter: 14 });
    expect(a).not.toBe(b);
  });
});

describe('strikeHoldMs', () => {
  it('holds long enough to feel the strike when motion is ok', () => {
    expect(strikeHoldMs(false)).toBe(STRIKE_HOLD_MS);
    expect(STRIKE_HOLD_MS).toBeGreaterThanOrEqual(700);
  });

  it('shortens under reduced motion but still shows loading', () => {
    expect(strikeHoldMs(true)).toBe(STRIKE_HOLD_REDUCED_MS);
    expect(STRIKE_HOLD_REDUCED_MS).toBeGreaterThan(0);
  });
});
