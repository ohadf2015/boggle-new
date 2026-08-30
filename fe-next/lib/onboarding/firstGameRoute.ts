/**
 * The one destination a player reaches when onboarding ends.
 *
 * FTUE used to hand new players to `/practice/classic?play=1` (90d data: 50.5% of 299 starters
 * never played a real game — dead-end funnel). Then `/singleplayer?autoStart=bots` (auto-starts
 * a bot game, graduates to multiplayer after first win).
 *
 * Now all players (new and returning) land in `/quick-play` — the solo arcade wheel mode picker.
 * Quick Play ships public and is the default mode for all players as of 2026-08-27.
 *
 * One function, because OnboardingFlow reaches "onboarding done" from three different
 * handlers — style-complete, quick-start, and the Play Now skip. Three paths each composing
 * their own destination is exactly the Class 3 drift the file's comments warn about.
 */

import type { QuickMode } from '@/components/quick-play/types';

/**
 * The mode a first-timer is dropped into. Classic is the picker's own "start
 * here" hero: trace a word through a letter grid is the one mechanic that needs
 * no explanation, and the other three are variations a player reads faster once
 * they've played it once.
 *
 * Typed as QuickMode so deleting or renaming a mode breaks the build here rather
 * than silently routing newcomers at a mode that no longer exists.
 */
export const FIRST_GAME_MODE: QuickMode = 'classic';

export function firstGameRoute(language: string): string {
  // autoStart, not a bare /quick-play: landing on the picker asks a newcomer to
  // choose between four unfamiliar mechanics before they have played a word.
  // The picker is still one tap away from the results screen for game two.
  return `/${language}/quick-play?autoStart=${FIRST_GAME_MODE}`;
}
