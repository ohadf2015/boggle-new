/**
 * Word Tower — landing impact (TDD). Tower Bloxx's signature beat: the tower
 * COMPRESSES under a landing block and rebounds (damped spring), and the block
 * itself squash-stretches. Purely cosmetic — never feeds the verdict.
 */
import { describe, it, expect } from 'vitest';
import { impactDipPx, squashScale, IMPACT_MS, IMPACT_DEPTH, MAX_DIP_PX } from '../landingImpact';

describe('impactDipPx (compression wave)', () => {
  it('is 0 before contact and after settling', () => {
    expect(impactDipPx(0, 0, 1)).toBe(0);
    expect(impactDipPx(0, IMPACT_MS, 1)).toBeCloseTo(0, 5);
  });

  it('peaks early and decays with floor depth', () => {
    const t = IMPACT_MS * 0.15;
    const top = impactDipPx(0, t, 1);
    expect(top).toBeGreaterThan(0);
    expect(impactDipPx(1, t, 1)).toBeLessThan(top);
    expect(impactDipPx(IMPACT_DEPTH, t, 1)).toBe(0); // wave dies past depth
  });

  it('scales with intensity, zero intensity = no dip', () => {
    const t = IMPACT_MS * 0.15;
    expect(impactDipPx(0, t, 0)).toBe(0);
    expect(impactDipPx(0, t, 1)).toBeGreaterThan(impactDipPx(0, t, 0.3));
  });

  it('never dips more than the MAX_DIP_PX tile-safe bound', () => {
    for (let t = 0; t <= IMPACT_MS; t += 25) {
      expect(impactDipPx(0, t, 1)).toBeLessThanOrEqual(MAX_DIP_PX);
    }
  });
});

describe('squashScale (block squash-stretch)', () => {
  it('starts squashed (wide + flat), settles to identity', () => {
    const s0 = squashScale(0, 1);
    expect(s0.sx).toBeGreaterThan(1);
    expect(s0.sy).toBeLessThan(1);
    const sEnd = squashScale(IMPACT_MS, 1);
    expect(sEnd.sx).toBeCloseTo(1, 3);
    expect(sEnd.sy).toBeCloseTo(1, 3);
  });

  it('area is roughly preserved at contact (sx*sy ≈ 1)', () => {
    const s = squashScale(0, 0.7);
    expect(s.sx * s.sy).toBeGreaterThan(0.9);
    expect(s.sx * s.sy).toBeLessThan(1.1);
  });

  it('harder impacts squash more', () => {
    expect(squashScale(0, 1).sx).toBeGreaterThan(squashScale(0, 0.3).sx);
  });
});
