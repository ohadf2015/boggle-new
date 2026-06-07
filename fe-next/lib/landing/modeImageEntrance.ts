/**
 * Entrance animation for above-the-fold mode imagery (ModeCard + DailyChallengeBanner).
 *
 * These illustrations are the measured LCP element on the homepage. The previous
 * entrance started at `opacity: 0` and faded in via a `whileInView` spring that
 * only runs after hydration — and browsers do not count an opacity:0 element as
 * painted, so LCP could not fire until full JS hydration (~5s p75 on desktop).
 *
 * This entrance keeps the element fully VISIBLE from first paint (no opacity in
 * the keyframes) and provides the brand "pop" purely through a transform
 * (scale + translate), which does NOT block LCP.
 */
export const MODE_IMAGE_ENTRANCE = {
  initial: { scale: 0.85, y: 8 },
  whileInView: { scale: 1, y: 0 },
  viewport: { once: true as const },
} as const;
