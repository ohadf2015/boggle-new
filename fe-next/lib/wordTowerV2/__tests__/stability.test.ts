import { describe, expect, it } from 'vitest';
import { type RiskBlock, stabilityBand, towerRisk } from '../stability';

const H = 34;
/** A floor `n` up from the street, centred at `x`. y grows DOWN (Matter). */
const floor = (n: number, x: number, w = 140, extra: Partial<RiskBlock> = {}): RiskBlock => ({
  x,
  y: -H / 2 - n * H,
  widthPx: w,
  heightPx: H,
  angleRad: 0,
  ...extra,
});

describe('towerRisk', () => {
  it('given no tower or a single floor, then it is perfectly steady', () => {
    expect(towerRisk([])).toBe(0);
    expect(towerRisk([floor(0, 0)])).toBe(0);
  });

  it('given floors stacked plumb, then risk is ~0', () => {
    expect(towerRisk([floor(0, 0), floor(1, 0), floor(2, 1), floor(3, -1)])).toBeLessThan(0.05);
  });

  it('given a top floor hanging most of the way off its support, then risk is high', () => {
    // 56px off a 70px half-width: 80% of the way to tipping.
    expect(towerRisk([floor(0, 0), floor(1, 56)])).toBeGreaterThan(0.75);
  });

  it('given a tower that walks sideways, then the LOAD above the base counts, not just the last step', () => {
    const lean = [0, 20, 40, 60, 80].map((x, n) => floor(n, x));
    // Each step is only 20/70 = 0.29 of a floor, but the four floors above the
    // base average 50px off it: 50/70 = 0.71.
    expect(towerRisk(lean)).toBeGreaterThan(0.65);
  });

  it('given a tilted floor, then risk rises with the tilt', () => {
    const flat = towerRisk([floor(0, 0), floor(1, 0)]);
    const tilted = towerRisk([floor(0, 0), floor(1, 0, 140, { angleRad: 0.25 })]);
    expect(tilted).toBeGreaterThan(0.6);
    expect(tilted).toBeGreaterThan(flat);
  });

  it('given a missed slab lying on the street beside the tower, then it is ignored', () => {
    const debris = { ...floor(0, 400), angleRad: 1.2 };
    expect(towerRisk([floor(0, 0), floor(1, 0), debris])).toBeLessThan(0.05);
  });

  it('given welded (rebar) floors, then load above a weld never counts against the floors below it', () => {
    // Floor 2 is welded: the crooked stack above it rests on the weld, not on floor 0.
    const blocks = [floor(0, 0), floor(1, 60, 140, { fixed: true }), floor(2, 60, 140, { fixed: true }), floor(3, 62)];
    expect(towerRisk(blocks)).toBeLessThan(0.1);
  });

  it('never leaves 0..1', () => {
    expect(towerRisk([floor(0, 0), floor(1, 500), floor(2, 900, 140, { angleRad: 3 })])).toBeLessThanOrEqual(1);
  });
});

describe('stabilityBand', () => {
  it('reads steady, wobbly, then danger as risk climbs', () => {
    expect(stabilityBand(0.1)).toBe('steady');
    expect(stabilityBand(0.5)).toBe('wobbly');
    expect(stabilityBand(0.85)).toBe('danger');
  });
});
