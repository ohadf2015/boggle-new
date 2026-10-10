import { describe, it, expect } from 'vitest';
import {
  DISC,
  slotPoint,
  letterPoint,
  praiseTier,
  toDiscPercent,
} from '../discGeometry';

const distToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

describe('disc geometry', () => {
  it('given slot 0, when placed, then it sits at twelve o’clock on the ring', () => {
    const p = slotPoint(0, 6);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(50 - DISC.ring);
  });

  it('given slots, when placed, then they run clockwise', () => {
    const p = slotPoint(1, 6);
    expect(p.x).toBeGreaterThan(50);
    expect(p.y).toBeLessThan(50);
  });

  it('given the hub index, when placed, then it is the disc centre', () => {
    expect(letterPoint(-1, 6)).toEqual({ x: 50, y: 50 });
    expect(letterPoint(2, 6)).toEqual(slotPoint(2, 6));
  });

  it('given any swipe between two outer letters, then it never crosses a third outer letter', () => {
    const n = 6;
    const pts = Array.from({ length: n }, (_, i) => slotPoint(i, n));
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        for (let c = 0; c < n; c++) {
          if (c === a || c === b) continue;
          expect(distToSegment(pts[c], pts[a], pts[b])).toBeGreaterThan(DISC.outer / 2);
        }
      }
    }
  });

  it('given a swipe between non-opposite outer letters, then it never touches the hub', () => {
    const n = 6;
    const hub = { x: 50, y: 50 };
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        if (a === b || Math.abs(a - b) === 3) continue;
        expect(distToSegment(hub, slotPoint(a, n), slotPoint(b, n))).toBeGreaterThan(DISC.center / 2);
      }
    }
  });

  it('given neighbouring letters, then their discs do not overlap', () => {
    const a = slotPoint(0, 6);
    const b = slotPoint(1, 6);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(DISC.outer);
    expect(DISC.ring - DISC.outer / 2).toBeGreaterThan(DISC.center / 2);
  });

  it('given a client point, when mapped, then it is in percent of the disc box', () => {
    const rect = { left: 100, top: 200, width: 400, height: 400 };
    expect(toDiscPercent(300, 400, rect)).toEqual({ x: 50, y: 50 });
    expect(toDiscPercent(100, 200, rect)).toEqual({ x: 0, y: 0 });
  });
});

describe('praiseTier', () => {
  it('given short words, then there is no stamp', () => {
    expect(praiseTier(3)).toBeNull();
  });

  it('given longer words, then the stamp climbs with length', () => {
    expect(praiseTier(4)).toBe('nice');
    expect(praiseTier(5)).toBe('great');
    expect(praiseTier(6)).toBe('brilliant');
    expect(praiseTier(7)).toBe('amazing');
    expect(praiseTier(9)).toBe('legendary');
  });
});
