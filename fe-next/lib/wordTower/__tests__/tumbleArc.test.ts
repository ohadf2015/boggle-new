/**
 * Word Tower — tumble arcs (TDD). Toppled floors LAUNCH toward the lean side,
 * spin, and fall off screen on a parabola instead of vanishing. Deterministic
 * per floor key so replays look identical.
 */
import { describe, it, expect } from 'vitest';
import { tumbleParams, tumbleAt, TUMBLE_MS } from '../tumbleArc';

describe('tumbleParams', () => {
  it('is deterministic per floor key', () => {
    expect(tumbleParams('floor-abc', 1)).toEqual(tumbleParams('floor-abc', 1));
  });

  it('varies between floor keys', () => {
    expect(tumbleParams('floor-a', 1)).not.toEqual(tumbleParams('floor-b', 1));
  });

  it('launches toward the lean side (upright tower defaults right)', () => {
    expect(tumbleParams('x', 1).dirX).toBe(1);
    expect(tumbleParams('x', -1).dirX).toBe(-1);
    expect(tumbleParams('x', 0).dirX).toBe(1);
  });
});

describe('tumbleAt', () => {
  const p = tumbleParams('floor-1', 1);

  it('starts at origin, fully opaque', () => {
    const f = tumbleAt(p, 0);
    expect(f.dx).toBe(0);
    expect(f.dy).toBe(0);
    expect(f.alpha).toBe(1);
  });

  it('arcs: rises first (screen-y negative), ends well below the start', () => {
    expect(tumbleAt(p, TUMBLE_MS * 0.15).dy).toBeLessThan(0);
    const end = tumbleAt(p, TUMBLE_MS);
    expect(end.dy).toBeGreaterThan(0);
    expect(Math.sign(end.dx)).toBe(p.dirX);
  });

  it('spins continuously and fades only near the end', () => {
    const end = tumbleAt(p, TUMBLE_MS);
    expect(Math.abs(end.rotDeg)).toBeGreaterThan(90);
    expect(end.alpha).toBeLessThan(0.2);
    expect(tumbleAt(p, TUMBLE_MS * 0.5).alpha).toBe(1);
  });

  it('clamps past the window (no runaway values)', () => {
    expect(tumbleAt(p, TUMBLE_MS * 5)).toEqual(tumbleAt(p, TUMBLE_MS));
  });
});
