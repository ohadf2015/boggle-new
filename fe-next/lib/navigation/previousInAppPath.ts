/**
 * A tiny client-side history of in-app routes, for "go back where I came from"
 * exits — the multiplayer entry's home button (`mpExit('back-from-entry')`).
 *
 * `document.referrer` only reflects the initial document load: after any SPA
 * hop (home → daily → multiplayer) it still names the first page, or nothing,
 * so Back from the MP entry dumped players on the homepage. NavigationProvider
 * records every route change here instead.
 *
 * Only NON-multiplayer routes become "previous": joining a room or reloading
 * inside /multiplayer must not overwrite the page the player came from (Back
 * would loop into MP). A language switch re-localizes the way back, so Back
 * keeps the language the player just picked.
 *
 * Module state, not React state: it is read imperatively at exit time and must
 * survive MP screens remounting. `resetInAppPathHistory` is for tests.
 */
import { isInAppPreviousPath } from '@/lib/multiplayer/exitDestination';

const LOCALE_PREFIX = /^\/([a-z]{2})(?=[/?#]|$)/;

let current: string | null = null;
let previous: string | null = null;

function isRecordable(path: string): boolean {
  return !!path && path.startsWith('/') && !path.startsWith('//');
}

function relocalize(path: string, like: string): string {
  const locale = like.match(LOCALE_PREFIX)?.[1];
  if (!locale || !LOCALE_PREFIX.test(path)) return path;
  return path.replace(LOCALE_PREFIX, `/${locale}`);
}

/** Record the route now on screen (pathname + search). Idempotent per route. */
export function recordInAppPath(path: string): void {
  if (!isRecordable(path) || path === current) return;
  if (isInAppPreviousPath(current)) previous = current;
  else if (previous) previous = relocalize(previous, path);
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
