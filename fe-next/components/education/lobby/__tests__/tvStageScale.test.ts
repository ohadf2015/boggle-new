/**
 * teacher-launch stayed phone-scale on a 1920 or 2560 wall: an 880px card in
 * a sea of arena art, unreadable from the back row. The launch stage now
 * scales as a whole on TV-sized screens (CSS zoom on the content column, so
 * every chip, card and button grows together and the layout is unchanged).
 *
 * Contract pinned here:
 *  - laptops (1280x720, 1366x768, 1024x768) are untouched — zoom 1;
 *  - 1920x1080 and 2560x1440 scale up, bigger screen => never smaller;
 *  - a wide-but-short window does not scale (it would push GO LIVE off);
 *  - each tier's class is a WHOLE literal that encodes the same numbers
 *    (Tailwind v4 only emits what it sees verbatim).
 */
import { describe, it, expect } from 'vitest';
import { TV_STAGE_ZOOM_TIERS, TV_STAGE_ZOOM_CLASS, tvStageZoom } from '../tvStageScale';

describe('tvStageZoom', () => {
  it('leaves phones, tablets and laptops alone', () => {
    for (const [w, h] of [[375, 667], [844, 390], [768, 1024], [1024, 768], [1280, 720], [1366, 768], [1440, 900]]) {
      expect(tvStageZoom(w, h)).toBe(1);
    }
  });

  it('scales a 1080p wall and scales a 1440p wall more', () => {
    const hd = tvStageZoom(1920, 1080);
    const qhd = tvStageZoom(2560, 1440);
    expect(hd).toBeGreaterThanOrEqual(1.2);
    expect(qhd).toBeGreaterThan(hd);
  });

  it('never scales a wide-but-short window', () => {
    expect(tvStageZoom(2560, 800)).toBe(1);
  });

  it('keeps every tier class a literal that matches its numbers', () => {
    for (const tier of TV_STAGE_ZOOM_TIERS) {
      expect(tier.className).toBe(
        `[@media(min-width:${tier.minWidth}px)_and_(min-height:${tier.minHeight}px)]:[zoom:${tier.zoom}]`
      );
      expect(TV_STAGE_ZOOM_CLASS).toContain(tier.className);
    }
  });
});
