/**
 * Cold-start route restoration policy (pure).
 *
 * The Android app loads JS from a remote URL (capacitor.config server.url), so
 * when Android evicts the backgrounded process the WebView reloads from scratch
 * and the user lands on the locale home — losing their place. In-game state
 * (React + Socket.IO) is ephemeral and CANNOT be rebuilt from a URL, so we only
 * auto-restore *stateless* hub/account screens that fetch fresh data on mount.
 * Everything else (gameplay, auth, transient flows, unknown routes) is left to
 * land on home — a safe default-deny.
 */

export const LAST_ROUTE_KEY = 'lexiclash_last_route';

/** Don't resurrect a route the user abandoned long ago — feels random, not helpful. */
export const ROUTE_RESTORE_WINDOW_MS = 30 * 60 * 1000; // 30 min

const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

/**
 * Stateless hub/account/social screens that are safe to auto-restore. Curated
 * allowlist (default-deny): adding a route here is a deliberate "this page holds
 * no unsaved in-memory state" assertion. Gameplay routes are intentionally absent.
 */
const RESTORABLE_PREFIXES = [
  '/profile',
  '/account',
  '/friends',
  '/leaderboard',
  '/settings',
  '/shop',
  '/store',
  '/referrals',
  '/achievements',
  '/community',
  '/social',
] as const;

export function stripLocale(pathname: string): string {
  const segment = pathname.split('/')[1];
  if ((SUPPORTED_LOCALES as readonly string[]).includes(segment)) {
    return pathname.slice(`/${segment}`.length) || '/';
  }
  return pathname;
}

/** A route is restorable only if it (or its parent) is on the allowlist. */
export function isRestorableRoute(strippedPath: string): boolean {
  if (strippedPath === '/') return false; // home is the default; nothing to restore
  return RESTORABLE_PREFIXES.some(
    (prefix) => strippedPath === prefix || strippedPath.startsWith(`${prefix}/`)
  );
}

export interface SavedRoute {
  path: string;
  ts: number;
}

/** Parse a persisted SavedRoute, tolerating any malformed/legacy payload. */
export function parseSavedRoute(raw: string | null): SavedRoute | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as SavedRoute).path === 'string' &&
      typeof (parsed as SavedRoute).ts === 'number'
    ) {
      return { path: (parsed as SavedRoute).path, ts: (parsed as SavedRoute).ts };
    }
  } catch {
    /* malformed JSON — treat as nothing saved */
  }
  return null;
}

/**
 * Decide where a cold-start should land. Returns the saved path to restore to,
 * or null to stay put (i.e. on home). Restores only when we actually booted to
 * the locale home, the saved route is fresh, and it is an allowlisted screen.
 */
export function resolveColdStartTarget(params: {
  currentPath: string;
  saved: SavedRoute | null;
  now: number;
  windowMs?: number;
}): string | null {
  const { currentPath, saved, now, windowMs = ROUTE_RESTORE_WINDOW_MS } = params;
  if (!saved) return null;
  // Clock guards: stale (older than the window) or impossibly future timestamps.
  if (now - saved.ts > windowMs) return null;
  if (saved.ts > now) return null;
  // Only intervene when the launch actually dropped the user on home.
  if (stripLocale(currentPath) !== '/') return null;
  if (saved.path === currentPath) return null;
  if (!isRestorableRoute(stripLocale(saved.path))) return null;
  return saved.path;
}
