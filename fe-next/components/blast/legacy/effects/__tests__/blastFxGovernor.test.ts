import { describe, it, expect } from 'vitest';
import { createFxGovernor, startQualityFor } from '../blastFxGovernor';

const feed = (g: ReturnType<typeof createFxGovernor>, dt: number, n: number) => {
  for (let i = 0; i < n; i++) g.sample(dt);
};

describe('createFxGovernor', () => {
  it('starts at the requested quality and scales budgets by it', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    expect(g.quality).toBe(2);
    expect(g.scale(20)).toBe(20);
  });

  it('holds quality while frames are smooth', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    feed(g, 16.7, 300);
    expect(g.quality).toBe(2);
  });

  it('drops one level quickly when rolling p95 exceeds 20ms', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    feed(g, 16.7, 50);
    feed(g, 28, 10);
    expect(g.quality).toBe(1);
  });

  it('keeps dropping to the floor under sustained jank, never below 0', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    feed(g, 40, 400);
    expect(g.quality).toBe(0);
    expect(g.scale(20)).toBeGreaterThan(0);
    expect(g.scale(20)).toBeLessThan(10);
  });

  it('recovers slowly: needs seconds of smooth frames, one level at a time', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    feed(g, 40, 400);
    expect(g.quality).toBe(0);
    feed(g, 16.7, 60);
    expect(g.quality).toBe(0);
    feed(g, 16.7, 300);
    expect(g.quality).toBe(1);
  });

  it('never recovers above the device ceiling', () => {
    const g = createFxGovernor({ maxQuality: 1 });
    feed(g, 10, 2000);
    expect(g.quality).toBe(1);
  });

  it('ignores huge gaps (tab hidden / GC pause) instead of panicking', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    feed(g, 16.7, 50);
    g.sample(2000);
    g.sample(900);
    feed(g, 16.7, 10);
    expect(g.quality).toBe(2);
  });

  it('gates optional work: ambient off at the floor, cheap work always allowed', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    expect(g.allows('ambient')).toBe(true);
    feed(g, 40, 400);
    expect(g.allows('ambient')).toBe(false);
    expect(g.allows('core')).toBe(true);
  });

  it('setMaxQuality() clamps down at once and lets recovery climb to the new ceiling', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    g.setMaxQuality(0);
    expect(g.quality).toBe(0);
    g.setMaxQuality(1);
    feed(g, 10, 2000);
    expect(g.quality).toBe(1);
  });

  it('reset() returns to the ceiling and clears history', () => {
    const g = createFxGovernor({ maxQuality: 2 });
    feed(g, 40, 400);
    g.reset();
    expect(g.quality).toBe(2);
  });
});

describe('startQualityFor', () => {
  it('maps device signals to a quality ceiling', () => {
    expect(startQualityFor({ isLowEnd: true, isMobile: true })).toBe(0);
    expect(startQualityFor({ isLowEnd: false, isMobile: true })).toBe(1);
    expect(startQualityFor({ isLowEnd: false, isMobile: false })).toBe(2);
  });
});
