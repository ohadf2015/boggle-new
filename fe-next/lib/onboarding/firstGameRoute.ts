/**
 * The one destination a player reaches when onboarding ends.
 *
 * FTUE used to hand new players to `/practice/classic?play=1`. Over 90 days on
 * prod, 299 people started practice and 151 of them (50.5%) never played a real
 * game — for half its intake the practice hub was where the funnel stopped, not
 * a warm-up. So onboarding now ends inside the actual engine.
 *
 * The first 60 seconds are one Quick Play classic round, started straight from
 * the link (no wheel tap).
 *
 * One function, because OnboardingFlow reaches "onboarding done" from three
 * different handlers — style-complete, quick-start, and the Play Now skip. Three
 * paths each composing their own destination is exactly the Class 3 drift the
 * file's own comments warn about.
 */

export function firstGameRoute(language: string): string {
  return `/${language}/quick-play?mode=classic`;
}
