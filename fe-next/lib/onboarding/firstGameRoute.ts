/**
 * The one destination a player reaches when onboarding ends.
 *
 * FTUE used to hand new players to `/practice/classic?play=1`. Over 90 days on
 * prod, 299 people started practice and 151 of them (50.5%) never played a real
 * game — for half its intake the practice hub was where the funnel stopped, not
 * a warm-up. So onboarding now ends inside the actual engine.
 *
 * `/singleplayer?autoStart=bots` already existed for this exact job: it
 * auto-starts a real solo-vs-bot round using the first-win config, and once the
 * player has one bot game behind them the SAME url redirects to multiplayer
 * Quick Play (the returning-player gate in useSinglePlayerConfig). No new
 * surface, no tutorial detour, and the graduation the practice chain was
 * imitating is already built into the destination.
 *
 * One function, because OnboardingFlow reaches "onboarding done" from three
 * different handlers — style-complete, quick-start, and the Play Now skip. Three
 * paths each composing their own destination is exactly the Class 3 drift the
 * file's own comments warn about.
 */

export function firstGameRoute(language: string): string {
  return `/${language}/singleplayer?autoStart=bots`;
}
