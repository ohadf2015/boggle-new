/**
 * Centralised "camera feel" knobs for the WordCraft auto-zoom shell.
 *
 * The board auto-zooms to follow the active word. Players reported the effect
 * felt "heavy" — three things stacked on every word-build: a motion blur, a
 * dark vignette, and an aggressive zoom level. These constants keep the feel
 * tuned (and tested) in one place instead of as magic numbers scattered in JSX.
 */
export const ZOOM_FEEL = {
  minScale: 1,
  /**
   * Hard ceiling on zoom. This is the dominant "heaviness" lever: most words
   * are 1–3 tiles and saturate the clamp, so lowering this gentles *every*
   * auto-zoom, not just long words. Was 2.0; 1.6 keeps the board readable
   * without the board lunging at the player.
   */
  maxScale: 1.6,
  /**
   * Target fraction of the viewport the focused word should fill after zooming
   * (scale = autoFit / boxFrac). It's the numerator, so LOWER = gentler zoom.
   * Was 0.55; 0.5 eases the unclamped (longer-word) cases too.
   */
  autoFit: 0.5,
  /** Camera-move duration for the transform tween (ms). */
  transitionMs: 300,
  /** Easing for the camera move — a soft standard ease, not a dramatic curve. */
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /**
   * Vignette darkness (alpha) at the board edge while zoomed. Was 0.78, which
   * darkened the whole board frame; lighter keeps focus without the heavy
   * depth-of-field dim.
   */
  vignetteOpacity: 0.4,
  /**
   * Motion-blur radius (px) applied during the camera move. 0 = no blur. The
   * blur was the single biggest "cinematic heaviness" tell, so it is removed.
   */
  motionBlurPx: 0,
} as const;

/**
 * Auto-zoom scale for a focus box that spans `boxFrac` (0..1) of the board's
 * larger dimension. Shared by the zoom shell and its tests so the "how hard
 * does it zoom" curve is verified by behaviour, not by eyeballing constants.
 */
export function computeAutoZoomScale(boxFrac: number): number {
  if (boxFrac <= 0) return ZOOM_FEEL.maxScale;
  const raw = ZOOM_FEEL.autoFit / boxFrac;
  return Math.max(ZOOM_FEEL.minScale, Math.min(ZOOM_FEEL.maxScale, raw));
}

/**
 * Compute the CSS `filter` for the board layer during a zoom transition.
 * Returns `'none'` unless a positive motion blur is configured AND we're
 * mid-transition with motion allowed and no live gesture in progress.
 */
export function boardFilter(opts: {
  reducedMotion: boolean;
  isTransitioning: boolean;
  gestureActive: boolean;
}): string {
  if (ZOOM_FEEL.motionBlurPx <= 0) return 'none';
  if (opts.reducedMotion || !opts.isTransitioning || opts.gestureActive) return 'none';
  return `blur(${ZOOM_FEEL.motionBlurPx}px)`;
}
