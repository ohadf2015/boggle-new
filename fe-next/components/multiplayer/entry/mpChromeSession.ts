/**
 * "This tab is in a multiplayer session" marker on <html>, for CSS.
 *
 * With ENTRY_HIDES_GLOBAL_CHROME the global header never shows on
 * /multiplayer, but AutoHideHeader keeps its CLS flow spacer (a 60–124px band)
 * whenever `isInGame` flipped without a user tap — a cold load. The MP entry
 * marks the document when it mounts; `entryChrome.css` hides the spacer while
 * the mark is present, so no MP phase (MpScreen or not: countdown overlay, TV
 * views) shows the band. NavigationProvider clears it once the route leaves
 * /multiplayer.
 */
import { isInAppPreviousPath } from '@/lib/multiplayer/exitDestination';

export const MP_SESSION_ATTR = 'data-mp-session';

export function markMpChromeSession(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root.hasAttribute(MP_SESSION_ATTR)) root.setAttribute(MP_SESSION_ATTR, '');
}

/**
 * The same mark as an inline script for the SSR stream, so it lands while the
 * document is still parsing — before hydration can remount the page tree and
 * drop the entry's SSR marker for a frame (see EntryScreen).
 */
export const MP_SESSION_MARK_SCRIPT = `document.documentElement.setAttribute('${MP_SESSION_ATTR}','')`;

/** Called on every route change: any non-multiplayer route ends the session. */
export function syncMpChromeSession(path: string): void {
  if (typeof document === 'undefined') return;
  // isInAppPreviousPath is true exactly for in-app, NON-multiplayer paths.
  if (isInAppPreviousPath(path)) document.documentElement.removeAttribute(MP_SESSION_ATTR);
}
