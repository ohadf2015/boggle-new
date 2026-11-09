/**
 * The one destination a player reaches when onboarding ends.
 *
 * FTUE used to hand new players to `/practice/classic?play=1`. Over 90 days on
 * prod, 299 people started practice and 151 of them (50.5%) never played a real
 * game — for half its intake the practice hub was where the funnel stopped, not
 * a warm-up. So onboarding now ends inside the actual engine.
 *
 * The first game is one coached Quick Play classic round, started straight
 * from the link (no wheel tap): a known word planted on the board, the clock
 * held until the first word, a hint if they stall. `coach=1` is ignored for a
 * device that has already finished a quick round (QuickPlayHub).
 *
 * One function, because OnboardingFlow reaches "onboarding done" from three
 * different handlers — style-complete, quick-start, and the Play Now skip. Three
 * paths each composing their own destination is exactly the Class 3 drift the
 * file's own comments warn about.
 */

export function firstGameRoute(language: string): string {
  return `/${language}/quick-play?mode=classic&coach=1`;
}
