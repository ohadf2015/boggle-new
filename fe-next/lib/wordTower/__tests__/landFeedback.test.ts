/**
 * Word Tower — event-driven land / success feedback (TDD).
 * One pure helper drives drop-land juice + success celebration so the scene
 * and crane share the same params (and reduced-motion collapses to static).
 */
import { describe, it, expect } from 'vitest';
import { landFeedback } from '../landFeedback';
import type { PlacementQuality } from '../cranePlacement';

const ORDER: PlacementQuality[] = ['perfect', 'good', 'sloppy', 'miss'];

describe('landFeedback — drop/land + success params', () => {
  it('perfect lands with success punch, glow, and celebration sparkles', () => {
    const f = landFeedback('perfect');
    expect(f.celebrate).toBe(true);
    expect(f.glow).toBe(true);
    expect(f.sparkles).toBeGreaterThan(0);
    expect(f.punchIntensity).toBeGreaterThan(0.7);
    expect(f.impactIntensity).toBeGreaterThanOrEqual(0.4); // solid Bloxx thud
    expect(f.impactIntensity).toBeLessThan(0.75); // still not a miss slam
    expect(f.ringScale).toBeGreaterThan(1.4);
    expect(f.flashIntensity).toBeGreaterThan(0.3);
    expect(f.flashColor).toBeGreaterThan(0);
    expect(f.ringColor).toBeGreaterThan(0);
    expect(f.wobbleImpulse).toBe(0);
    expect(f.celebrateTier).toBe('big');
  });

  it('good is a solid land with lighter success feedback than perfect', () => {
    const g = landFeedback('good');
    const p = landFeedback('perfect');
    expect(g.celebrate).toBe(true);
    expect(g.glow).toBe(false);
    expect(g.sparkles).toBeLessThan(p.sparkles);
    expect(g.punchIntensity).toBeLessThan(p.punchIntensity);
    expect(g.punchIntensity).toBeGreaterThan(0);
    expect(g.wobbleImpulse).toBe(0);
    expect(g.celebrateTier).toBe('pop');
  });

  it('sloppy/miss never celebrate — impact weight still rises with severity', () => {
    const s = landFeedback('sloppy');
    const m = landFeedback('miss');
    expect(s.celebrate).toBe(false);
    expect(m.celebrate).toBe(false);
    expect(s.glow).toBe(false);
    expect(m.glow).toBe(false);
    expect(s.sparkles).toBe(0);
    expect(m.sparkles).toBe(0);
    expect(m.impactIntensity).toBeGreaterThanOrEqual(s.impactIntensity);
    expect(m.impactIntensity).toBeCloseTo(1, 5);
    expect(s.punchIntensity).toBe(0);
    expect(m.punchIntensity).toBeLessThan(0); // negative = shrink/impact feel
    expect(s.debris).toBeGreaterThan(0);
    expect(m.debris).toBeGreaterThanOrEqual(s.debris);
    expect(s.wobbleImpulse).toBeGreaterThan(0);
    expect(m.wobbleImpulse).toBeGreaterThan(s.wobbleImpulse);
    expect(s.celebrateTier).toBe('none');
    expect(m.celebrateTier).toBe('none');
  });

  it('impact intensity is monotonic across quality (miss hits hardest)', () => {
    const vals = ORDER.map((q) => landFeedback(q).impactIntensity);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]!).toBeGreaterThanOrEqual(vals[i - 1]! - 0.001);
    }
  });

  it('depth floors add a touch more debris / particles without unbounded growth', () => {
    const shallow = landFeedback('good', { depthFloors: 0 });
    const deep = landFeedback('good', { depthFloors: 12 });
    expect(deep.particles).toBeGreaterThan(shallow.particles);
    expect(deep.particles).toBeLessThanOrEqual(40);
    expect(deep.shakePx).toBeLessThanOrEqual(16);
  });

  it('reduced-motion path zeroes continuous motion but keeps layout-usable statics', () => {
    for (const q of ORDER) {
      const f = landFeedback(q, { reducedMotion: true });
      expect(f.impactIntensity).toBe(0);
      expect(f.punchIntensity).toBe(0);
      expect(f.shakePx).toBe(0);
      expect(f.particles).toBe(0);
      expect(f.sparkles).toBe(0);
      expect(f.flashIntensity).toBe(0);
      expect(f.celebrate).toBe(false);
      expect(f.glow).toBe(false);
      expect(f.debris).toBe(0);
      expect(f.wobbleImpulse).toBe(0);
      // ringScale stays 1 so layout math never needs a special branch
      expect(f.ringScale).toBe(1);
    }
  });

  it('perfect success is louder than a plain good land (event-driven juice)', () => {
    const p = landFeedback('perfect');
    const g = landFeedback('good');
    expect(p.particles + p.sparkles).toBeGreaterThan(g.particles + g.sparkles);
    expect(p.flashIntensity).toBeGreaterThan(g.flashIntensity);
  });

  it('colours shift from green → cyan → orange → red across quality', () => {
    const p = landFeedback('perfect');
    const g = landFeedback('good');
    const s = landFeedback('sloppy');
    const m = landFeedback('miss');
    expect(p.flashColor).not.toBe(g.flashColor);
    expect(g.flashColor).not.toBe(s.flashColor);
    expect(s.flashColor).not.toBe(m.flashColor);
  });
});
