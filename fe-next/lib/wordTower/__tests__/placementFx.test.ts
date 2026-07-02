import { describe, it, expect } from 'vitest';
import { letterPlacementFx, letterTickRate } from '../placementFx';

describe('letterPlacementFx (escalating placement juice)', () => {
  it('has a baseline punch even for the first letter', () => {
    const fx = letterPlacementFx(0);
    expect(fx.particles).toBeGreaterThanOrEqual(7);
    expect(fx.ringScale).toBe(1);
  });

  it('escalates with depth — each deeper letter is punchier', () => {
    const a = letterPlacementFx(1);
    const b = letterPlacementFx(4);
    expect(b.particles).toBeGreaterThan(a.particles);
    expect(b.ringScale).toBeGreaterThan(a.ringScale);
  });

  it('is monotonic non-decreasing across depth', () => {
    let prev = letterPlacementFx(0);
    for (let d = 1; d <= 20; d++) {
      const cur = letterPlacementFx(d);
      expect(cur.particles).toBeGreaterThanOrEqual(prev.particles);
      expect(cur.ringScale).toBeGreaterThanOrEqual(prev.ringScale);
      prev = cur;
    }
  });

  it('caps intensity so a very long word never goes berserk', () => {
    const fx = letterPlacementFx(50);
    expect(fx.particles).toBeLessThanOrEqual(22);
    expect(fx.ringScale).toBeLessThanOrEqual(1.7);
  });

  it('treats negative depth as the baseline (defensive)', () => {
    expect(letterPlacementFx(-3)).toEqual(letterPlacementFx(0));
  });
});

describe('letterTickRate — the spell tick climbs in pitch per letter', () => {
  it('starts at normal pitch for the first letter', () => {
    expect(letterTickRate(0)).toBe(1);
  });

  it('rises monotonically with each added letter', () => {
    let prev = letterTickRate(0);
    for (let i = 1; i <= 12; i++) {
      const cur = letterTickRate(i);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });

  it('caps so a marathon word never chipmunks', () => {
    expect(letterTickRate(20)).toBe(1.6);
    expect(letterTickRate(100)).toBe(1.6);
  });

  it('treats negative index as the baseline (defensive)', () => {
    expect(letterTickRate(-2)).toBe(1);
  });
});
