/**
 * Which `/[locale]/...` routes are *active gameplay* screens (a player is
 * playing, as opposed to menus, lobbies, results, or marketing).
 *
 * Used to (a) decide when to surface the one-time "you're playing in <lang>"
 * notice, and could back any other gameplay-scoped behaviour. Kept pure +
 * locale-agnostic so it unit-tests trivially and runs anywhere.
 */
import { locales } from './i18n';

const LOCALE_SET = new Set<string>(locales);

/** First path segment of each game mode (after an optional locale prefix). */
const GAMEPLAY_SEGMENTS = new Set<string>([
  'singleplayer',
  'multiplayer',
  'blast',
  'word-craft',
  'word-wheel',
  'crossword',
  'adventure',
  'connections',
  'brain',
  'practice',
  'daily', // daily challenge hub + word-wheel/word-hunt live under here
  'party',
  'word-tower',
  'sealed-bid',
]);

/**
 * True when `pathname` points at a gameplay screen. Strips an optional leading
 * locale segment, then checks the next segment against the known game modes
 * (exact segment match — `singleplayer-stats` does NOT count as `singleplayer`).
 */
export function isGameplayPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  // Drop a leading locale segment if present (`/en/blast` -> `blast`).
  const first = LOCALE_SET.has(segments[0]) ? segments[1] : segments[0];
  if (!first) return false;
  return GAMEPLAY_SEGMENTS.has(first);
}
