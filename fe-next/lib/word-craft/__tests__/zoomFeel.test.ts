import { describe, it, expect } from 'vitest';
import { ZOOM_FEEL, boardFilter, computeAutoZoomScale } from '../zoomFeel';

/** Old (heavy) curve, kept here purely as a regression baseline to compare against. */
function oldAutoZoomScale(boxFrac: number): number {
  const OLD_AUTO_FIT = 0.55;
  const OLD_MAX = 2.0;
  if (boxFrac <= 0) return OLD_MAX;
  return Math.max(1, Math.min(OLD_MAX, OLD_AUTO_FIT / boxFrac));
}

/**
 * "Camera feel" knobs for the WordCraft auto-zoom.
 *
 * Player complaint: "the zoom effect should be lighter and not so heavy."
 * The heaviness came from three things layered on every word-build:
 *   - a blur(3px) motion-blur during the camera move,
 *   - a 0.78-opacity vignette darkening the board edges,
 *   - an aggressive AUTO_FIT (0.55) that zoomed the word to fill most of the
 *     viewport.
 * These tests lock the lighter values so a future tweak can't silently regress
 * back to the heavy cinematic feel.
 */

describe('zoomFeel — lighter camera', () => {
  it('removes the motion blur entirely (the biggest "heavy" tell)', () => {
    expect(ZOOM_FEEL.motionBlurPx).toBe(0);
  });

  it('boardFilter never applies blur, even mid-transition', () => {
    expect(boardFilter({ reducedMotion: false, isTransitioning: true, gestureActive: false })).toBe('none');
    expect(boardFilter({ reducedMotion: false, isTransitioning: false, gestureActive: false })).toBe('none');
    expect(boardFilter({ reducedMotion: true, isTransitioning: true, gestureActive: false })).toBe('none');
  });

  it('zooms LESS than the old curve for every realistic focus box (behaviour, not vibes)', () => {
    // Sweep focus-box spans from 1 tile to most of a 15-board: the new scale
    // must be at or below the old heavy curve at every point, and strictly
    // below for the common short-word case where the old clamp pinned 2.0×.
    const board = 15;
    for (let span = 1; span <= 10; span++) {
      const boxFrac = span / board;
      expect(computeAutoZoomScale(boxFrac)).toBeLessThanOrEqual(oldAutoZoomScale(boxFrac));
    }
    // Common 1–3 tile case: old curve clamped at 2.0×, new is gentler.
    expect(computeAutoZoomScale(2 / board)).toBeLessThan(oldAutoZoomScale(2 / board));
  });

  it('lowers the hard zoom ceiling (the common-case lever)', () => {
    // Most words are 1–3 tiles and saturate the clamp, so the ceiling is what
    // the player feels most. Was 2.0.
    expect(ZOOM_FEEL.maxScale).toBeLessThanOrEqual(1.6);
    expect(ZOOM_FEEL.maxScale).toBeGreaterThan(1);
  });

  it('softens the vignette so it does not darken the board so heavily', () => {
    // Was 0.78.
    expect(ZOOM_FEEL.vignetteOpacity).toBeLessThanOrEqual(0.5);
  });

  it('keeps zoom clamped to a sane range', () => {
    expect(ZOOM_FEEL.minScale).toBe(1);
    expect(computeAutoZoomScale(0)).toBe(ZOOM_FEEL.maxScale); // degenerate box → ceiling
    expect(computeAutoZoomScale(1)).toBe(ZOOM_FEEL.minScale); // box fills board → no zoom
  });
});
