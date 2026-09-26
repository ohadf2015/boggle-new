/**
 * A tiny client-side history of in-app routes, for "go back where I came from"
 * exits (the multiplayer entry's home button → `mpExit('back-from-entry')`).
 *
 * `document.referrer` only reflects the initial document load: after any SPA
 * hop (home → daily → multiplayer) it still names the first page, or nothing,
 * so Back from the MP entry dumped players on the homepage. NavigationProvider
 * records every route change here instead.
 *
 * Only NON-multiplayer routes are remembered as "previous": a language switch
 * or a room join inside /multiplayer must not overwrite the page the player
 * actually came from (that would make Back a loop into MP).
 *
 * Module state, not React state: it is read imperatively at exit time and must
 * survive the MP screens remounting. `resetInAppPathHistory` is for tests.
 */
import { isInAppPreviousPath } from '@/lib/multiplayer/exitDestination';

let current: string | null = null;
let previous: string | null = null;

function isRecordable(path: string): boolean {
  return !!path && path.startsWith('/') && !path.startsWith('//');
}

/** Record the route now on screen (pathname + search). Idempotent per route. */
export function recordInAppPath(path: string): void {
  if (!isRecordable(path) || path === current) return;
  if (isInAppPreviousPath(current)) previous = current;
  current = path;
}

/** The last non-multiplayer route visited before the current one, if any. */
export function getTrackedPreviousPath(): string | null {
  return previous;
}

export function resetInAppPathHistory(): void {
  current = null;
  previous = null;
}
