import { describe, it, expect } from 'vitest';
import { visiblePropsAt, type ParallaxProp } from '../parallaxProps';

const PX = 5;
const props: ParallaxProp[] = [
  { id: 'low', src: 'a.png', atM: 50, topPct: 30, xPct: 20, width: 100, depth: 1, rangeM: 60 },
  { id: 'high', src: 'b.png', atM: 300, topPct: 25, xPct: 70, width: 100, depth: 0.5, rangeM: 100 },
];

describe('visiblePropsAt (lazy altitude-anchored parallax)', () => {
  it('only mounts props within their altitude window (lazy-load gate)', () => {
    expect(visiblePropsAt(50, props, PX).map((p) => p.id)).toEqual(['low']);
    expect(visiblePropsAt(300, props, PX).map((p) => p.id)).toEqual(['high']);
    // a height between, outside both windows → nothing mounted
    expect(visiblePropsAt(150, props, PX)).toEqual([]);
  });

  it('rests at the anchor (zero offset, full opacity) when heightM === atM', () => {
    const [p] = visiblePropsAt(50, props, PX);
    expect(p!.offsetPx).toBe(0);
    expect(p!.opacity).toBeCloseTo(1);
  });

  it('sits high (negative offset) below the anchor, descends (positive) above it', () => {
    const below = visiblePropsAt(20, props, PX)[0]!; // 30m below anchor
    const above = visiblePropsAt(80, props, PX)[0]!; // 30m above anchor
    expect(below.offsetPx).toBeLessThan(0);
    expect(above.offsetPx).toBeGreaterThan(0);
    // offset magnitude = |dm| * px * depth
    expect(above.offsetPx).toBeCloseTo(30 * PX * 1);
  });

  it('applies depth as a parallax multiplier (far props drift slower)', () => {
    const far = visiblePropsAt(350, props, PX)[0]!; // 'high', depth 0.5, dm=50
    expect(far.offsetPx).toBeCloseTo(50 * PX * 0.5);
  });

  it('fades out toward the window edges', () => {
    const nearEdge = visiblePropsAt(50 + 59, props, PX)[0]!; // dm=59, range 60 → edge
    expect(nearEdge.opacity).toBeLessThan(0.1);
    const mid = visiblePropsAt(50 + 20, props, PX)[0]!;
    expect(mid.opacity).toBeGreaterThan(nearEdge.opacity);
  });

  it('offset is monotonic in heightM across the window', () => {
    let prev = -Infinity;
    for (let h = 50 - 60; h <= 50 + 60; h += 5) {
      const a = visiblePropsAt(h, props, PX)[0];
      if (!a) continue;
      expect(a.offsetPx).toBeGreaterThanOrEqual(prev);
      prev = a.offsetPx;
    }
  });
});
