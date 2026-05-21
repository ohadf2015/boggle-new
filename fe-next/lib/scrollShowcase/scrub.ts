/**
 * Pure helpers for the scroll-showcase landing page.
 *
 * Kept framework-free (no DOM, no GSAP) so the scroll→video-time mapping is unit
 * testable. The page wires these into a ScrollTrigger `onUpdate` callback.
 */

/** Clamp a number into the inclusive [0, 1] range. */
export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Map a scroll progress (0..1) onto a video playhead time in seconds.
 *
 * Progress is clamped so seeking never leaves the clip. Returns 0 when the
 * duration is unknown (NaN) or non-positive — i.e. before `loadedmetadata`
 * fires — which keeps the first paint on frame 0 instead of NaN-seeking.
 */
export function scrubVideoTime(progress: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return clamp01(progress) * duration;
}
