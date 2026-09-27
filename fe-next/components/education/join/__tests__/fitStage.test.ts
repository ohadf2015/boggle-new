/**
 * `/student/join` must fit — no page scroll — at every size from a 360px phone
 * to a 1440p TV, and grow on big screens instead of sitting tiny in the middle.
 *
 * Measured before: 844x390 had huge cropped code boxes and scrolled; 1280x720
 * and 1366x768 scrolled (a fixed `lg:scale-[1.3]` pushed the content past the
 * fold); 1920x1080 and 2560x1440 showed a 448px column in a sea of arena.
 */
import { describe, it, expect } from 'vitest';
import { fitStage } from '../fitStage';

describe('fitStage — width of the join column and its zoom', () => {
  it('a phone gets the full width (minus gutters) at 1x', () => {
    const s = fitStage({ vw: 375, vh: 667, naturalHeight: 560 });
    expect(s.rail).toBe(false);
    expect(s.width).toBe(375 - 32);
    expect(s.zoom).toBe(1);
  });

  it('a phone on its side goes two-column and never overflows the height', () => {
    const s = fitStage({ vw: 844, vh: 390, naturalHeight: 300 });
    expect(s.rail).toBe(true);
    expect(s.width).toBeLessThanOrEqual(844 - 32);
    expect(s.naturalHeight * s.zoom).toBeLessThanOrEqual(390 - 16);
  });

  it('shrinks to fit a short screen rather than scrolling', () => {
    const s = fitStage({ vw: 1280, vh: 720, naturalHeight: 760 });
    expect(760 * s.zoom).toBeLessThanOrEqual(720 - 32);
    expect(s.zoom).toBeLessThan(1);
  });

  it('grows on a desktop and a TV, bounded by both axes', () => {
    const d = fitStage({ vw: 1920, vh: 1080, naturalHeight: 600 });
    const tv = fitStage({ vw: 2560, vh: 1440, naturalHeight: 600 });
    expect(d.zoom).toBeGreaterThan(1.3);
    expect(tv.zoom).toBeGreaterThan(d.zoom);
    // Grows, but leaves air above and below the column.
    expect(600 * d.zoom).toBeLessThanOrEqual(1080 * 0.8);
    for (const [s, vw, vh] of [[d, 1920, 1080], [tv, 2560, 1440]] as const) {
      expect(s.width * s.zoom).toBeLessThanOrEqual(vw - 32);
      expect(s.naturalHeight * s.zoom).toBeLessThanOrEqual(vh - 32);
    }
  });

  it('before the content is measured, renders at 1x', () => {
    expect(fitStage({ vw: 1920, vh: 1080, naturalHeight: 0 }).zoom).toBe(1);
  });
});
