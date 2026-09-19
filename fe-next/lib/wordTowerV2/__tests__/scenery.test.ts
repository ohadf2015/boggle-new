import { describe, expect, it } from 'vitest';
import { buildSkyline, rulerTicks } from '../scenery';

describe('buildSkyline', () => {
  it('given a seed, when built twice, then identical (no hydration drift)', () => {
    expect(buildSkyline(7, 1200)).toEqual(buildSkyline(7, 1200));
  });

  it('given a width, when built, then buildings tile it edge to edge with no gaps', () => {
    const b = buildSkyline(3, 1440);
    expect(b[0].x).toBe(0);
    for (let i = 1; i < b.length; i += 1) expect(b[i].x).toBe(b[i - 1].x + b[i - 1].w);
    const last = b[b.length - 1];
    expect(last.x + last.w).toBeGreaterThanOrEqual(1440);
  });

  it('given buildings, when read, then every window sits inside its building', () => {
    for (const bld of buildSkyline(11, 800)) {
      for (const w of bld.windows) {
        expect(w.x).toBeGreaterThanOrEqual(0);
        expect(w.x + w.w).toBeLessThanOrEqual(bld.w);
        expect(w.y + w.h).toBeLessThanOrEqual(bld.h);
      }
    }
  });
});

describe('rulerTicks', () => {
  it('given a span, when ticked, then one tick per metre and a label every 5', () => {
    const ticks = rulerTicks(0, 10);
    expect(ticks.map((t) => t.m)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(ticks.filter((t) => t.major).map((t) => t.m)).toEqual([0, 5, 10]);
  });

  it('given a partial span, when ticked, then starts at the next whole metre and never below ground', () => {
    expect(rulerTicks(-3.2, 2.5).map((t) => t.m)).toEqual([0, 1, 2]);
  });
});
