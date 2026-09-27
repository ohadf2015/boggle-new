/**
 * Pins the primary next-step CTA to the bottom of a daily-results scrollport,
 * so "finish today's challenge" / "back to the daily hub" stays reachable
 * without scrolling past the whole recap.
 *
 * `sticky`, not `fixed`: every CTA sits inside a Framer `m.div` transform
 * ancestor, and a transformed ancestor turns `fixed` into `absolute` — the
 * Android bug that forced the body-portal in components/views/ResultsPage.tsx.
 * Sticky also survives WordHuntResultsContent mounting twice (once in the
 * `md:hidden` mobile column, once in the `hidden md:block` desktop one), where
 * a fixed bar would render two overlapping copies.
 *
 * Sticky needs a real scrollport above it AND no `overflow: hidden` ancestor
 * in between — an overflow-hidden box becomes the scrollport and, never
 * scrolling itself, silently turns the whole thing into a no-op.
 *
 * The two screens need DIFFERENT bottom offsets because their scrollports end
 * in different places; a single shared value would be wrong on one of them.
 * Both are eyeball starting values — verify on a real phone (and on the native
 * app, where the AdMob banner is a SurfaceView composited over the WebView)
 * before trusting them.
 *
 * Its own module (not a results component) so importing it doesn't drag a
 * heavy results tree into the other mode's bundle.
 */
const BASE = 'sticky z-30';

/**
 * Word Hunt: the scrollport (DailyWordHuntResults) stops short of the viewport
 * bottom — the banner slots sit below it in flow — but the fixed MobileTabBar
 * overlays that edge on mobile. A small lift clears it; desktop hides the tab
 * bar, so it sits flush.
 */
export const STICKY_CTA_WORD_HUNT = `${BASE} bottom-2 md:bottom-0`;

/**
 * Word Wheel: the results scrollport runs to the bottom of the stage, so on
 * mobile the CTA has to clear the ad that overlays the viewport bottom.
 * `--admob-banner-height` is 0 on web and set by the native banner, matching
 * how the MobileTabBar offsets itself on the Word Hunt screen.
 */
export const STICKY_CTA_WORD_WHEEL =
  `${BASE} bottom-[calc(var(--admob-banner-height,0px)+0.5rem)] md:bottom-2`;
