import { describe, it, expect } from 'vitest';
import { MODE_IMAGE_ENTRANCE } from '../modeImageEntrance';

/**
 * Regression guard for the homepage LCP bug (2026-06-07).
 *
 * The mode-card / daily-banner illustration is the measured LCP element on the
 * homepage. It used to start at `opacity: 0` and be revealed by a framer-motion
 * `whileInView` spring — which only runs AFTER hydration. Browsers don't count
 * an opacity:0 element as painted, so LCP couldn't fire until full JS hydration
 * (~5s p75). The entrance MUST keep the element visible from first paint.
 */
describe('MODE_IMAGE_ENTRANCE', () => {
  it('never hides the LCP element via opacity (visible from first paint)', () => {
    // GIVEN the shared entrance config used for above-the-fold mode imagery
    // THEN the initial (SSR / pre-hydration) state must NOT be transparent
    const initialOpacity = (MODE_IMAGE_ENTRANCE.initial as { opacity?: number }).opacity;
    expect(initialOpacity === undefined || initialOpacity > 0).toBe(true);
  });

  it('does not animate opacity at all (no fade reveal that blocks LCP)', () => {
    // The whileInView target must not introduce an opacity transition from 0.
    const initial = MODE_IMAGE_ENTRANCE.initial as { opacity?: number };
    const inView = MODE_IMAGE_ENTRANCE.whileInView as { opacity?: number };
    // If opacity is animated, both ends must be fully opaque.
    if (initial.opacity !== undefined || inView.opacity !== undefined) {
      expect(initial.opacity ?? 1).toBe(1);
      expect(inView.opacity ?? 1).toBe(1);
    }
  });

  it('still provides a pop entrance (scale/translate) for delight', () => {
    // We keep the brand pop — just not via opacity. Some transform must move.
    const initial = MODE_IMAGE_ENTRANCE.initial as { scale?: number; y?: number };
    const movedScale = initial.scale !== undefined && initial.scale !== 1;
    const movedY = initial.y !== undefined && initial.y !== 0;
    expect(movedScale || movedY).toBe(true);
  });
});
