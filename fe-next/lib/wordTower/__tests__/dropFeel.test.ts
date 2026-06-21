/**
 * Word Tower — "drop feel" overhaul (Phase 1).
 *
 * New additive feel primitives: drop-quality impact intensity (scales screen
 * shake / impact FX), cascading per-brick descent (a placed word settles under
 * its own weight bottom→top), tower micro-jitter (nervous energy below the main
 * sway gate), and crane cable stretch-and-snap. All PURE + deterministic; none
 * may leak into the WYSIWYG placement verdict.
 */
import { describe, it, expect } from 'vitest';
import { dropQualityIntensity, type PlacementQuality } from '../cranePlacement';
import {
  brickLiftFrac,
  SWIVEL_DESCENT_STAGGER,
  swivelDescent,
  swivelBrickFrame,
} from '../swivelDrop';
import { swayJitterDeg, SWAY_JITTER_MAX_DEG, SWAY_START_INSTABILITY } from '../towerSway';
import { cableStretchAt } from '../cranePendulum';

describe('dropQualityIntensity', () => {
  const order: PlacementQuality[] = ['perfect', 'good', 'sloppy', 'miss'];

  it('is monotonic increasing perfect→miss', () => {
    const vals = order.map(dropQualityIntensity);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });

  it('stays in [0,1] and gives a perfect drop a small but non-zero jolt', () => {
    for (const q of order) {
      const v = dropQualityIntensity(q);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(dropQualityIntensity('perfect')).toBeGreaterThan(0); // perfect FEELS good
    expect(dropQualityIntensity('miss')).toBeCloseTo(1, 5); // a miss slams hardest
  });
});

describe('brickLiftFrac (cascading descent)', () => {
  it('with a single brick reproduces the uniform descent (back-compat)', () => {
    for (const k of [0, 0.25, 0.5, 0.75, 1]) {
      expect(brickLiftFrac(k, 0, 1, SWIVEL_DESCENT_STAGGER)).toBeCloseTo(1 - swivelDescent(k), 6);
    }
  });

  it('every brick is flush (lift 0) at k=1 and fully lifted at k=0', () => {
    for (let i = 0; i < 5; i++) {
      expect(brickLiftFrac(1, i, 5, SWIVEL_DESCENT_STAGGER)).toBeCloseTo(0, 6);
      expect(brickLiftFrac(0, i, 5, SWIVEL_DESCENT_STAGGER)).toBeCloseTo(1, 6);
    }
  });

  it('higher bricks lag — they are still more lifted mid-animation (wave)', () => {
    const bottom = brickLiftFrac(0.5, 0, 5, SWIVEL_DESCENT_STAGGER);
    const top = brickLiftFrac(0.5, 4, 5, SWIVEL_DESCENT_STAGGER);
    expect(top).toBeGreaterThan(bottom);
  });

  it('with stagger 0 there is no cascade (all bricks identical)', () => {
    const a = brickLiftFrac(0.5, 0, 5, 0);
    const b = brickLiftFrac(0.5, 4, 5, 0);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('swivelBrickFrame still lands flush with cascade params', () => {
  it('top brick lands exactly on its rest slot at k=1 even when staggered', () => {
    const rest = { x: 100, y: 40 };
    const f = swivelBrickFrame(rest, 100, 200, 14, 30, 1, 3, 5, SWIVEL_DESCENT_STAGGER);
    expect(f.x).toBeCloseTo(rest.x, 4);
    expect(f.y).toBeCloseTo(rest.y, 4);
    expect(f.angleDeg).toBeCloseTo(0, 4);
  });
});

describe('swayJitterDeg (micro-instability)', () => {
  it('a perfectly steady tower is truly still (0 jitter at instability 0)', () => {
    for (const t of [0, 100, 250, 500]) {
      expect(swayJitterDeg(t, 0)).toBeCloseTo(0, 6);
    }
  });

  it('never exceeds the jitter cap', () => {
    for (let t = 0; t < 2000; t += 37) {
      expect(Math.abs(swayJitterDeg(t, 1))).toBeLessThanOrEqual(SWAY_JITTER_MAX_DEG + 1e-9);
    }
  });

  it('adds nervous energy BELOW the main sway gate (between 0 and sway-start)', () => {
    const lowInstability = SWAY_START_INSTABILITY * 0.5;
    let sawNonZero = false;
    for (let t = 0; t < 1000; t += 23) {
      if (Math.abs(swayJitterDeg(t, lowInstability)) > 1e-3) sawNonZero = true;
    }
    expect(sawNonZero).toBe(true);
  });
});

describe('cableStretchAt (crane weight)', () => {
  it('starts taut and returns to rest (0 at k=0 and k=1)', () => {
    expect(cableStretchAt(0, 1)).toBeCloseTo(0, 6);
    expect(cableStretchAt(1, 1)).toBeCloseTo(0, 4);
  });

  it('yanks the cable mid-fall (a positive peak in between)', () => {
    let peak = 0;
    for (let k = 0; k <= 1; k += 0.05) peak = Math.max(peak, cableStretchAt(k, 1));
    expect(peak).toBeGreaterThan(0);
  });

  it('scales with intensity (a heavier/faster drop stretches more)', () => {
    const light = cableStretchAt(0.3, 0.3);
    const heavy = cableStretchAt(0.3, 1);
    expect(heavy).toBeGreaterThan(light);
  });
});
