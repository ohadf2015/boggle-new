/**
 * Stale-build auto-reload (t_64ecd326).
 *
 * Problem: a long-lived tab (kiosk PC, forgotten browser window) keeps the
 * bundle it booted with. Deploy-time fixes never reach it — one Windows
 * Chrome 152 tab polled rpc/get_friend_threads every 30s for 13h AFTER #1458
 * paused hidden-tab polling, because its bundle predated the fix. The same
 * staleness causes the recurring "Loading chunk N failed" $exceptions: with
 * ~20 deploys/day the old bundle's hashed chunks vanish quickly.
 *
 * Existing paths do NOT cover this:
 *  - VersionChecker only SHOWS a manual refresh toast; a forgotten tab never
 *    clicks it.
 *  - staleDeployReload.ts recovers AFTER a chunk error already happened.
 *
 * Policy here (distinct from both):
 *  - Check /api/version every 10 min while visible + on visibilitychange→visible.
 *  - Reload automatically ONLY when: build provably stale, tab open > 30 min,
 *    tab VISIBLE, and no game in progress. In-game → defer until the round
 *    ends or the next navigation.
 *  - Never reload while hidden; never more than once per 30 min
 *    (sessionStorage loop guard — sessionStorage because it is per-tab, and a
 *    reload loop is a per-tab failure).
 */

/** sessionStorage key for the loop guard; value is the epoch ms of the last
 *  auto-reload. Timestamped (not boolean) so the guard self-expires. */
export const STALE_BUILD_RELOAD_GUARD_KEY = 'lc_stale_build_reload_at';

/** How often the hook polls /api/version while the tab is visible. */
export const STALE_BUILD_CHECK_INTERVAL_MS = 10 * 60 * 1000;

/** A tab younger than this is a fresh load by definition — it cannot be
 *  meaningfully stale, and reloading it risks bouncing a user who just
 *  arrived (e.g. mid rolling deploy where HTML and bundle disagree briefly). */
export const STALE_BUILD_MIN_TAB_OPEN_MS = 30 * 60 * 1000;

/** Loop guard: at most one auto-reload per tab per 30 min. */
export const STALE_BUILD_RELOAD_MIN_INTERVAL_MS = 30 * 60 * 1000;

export interface BuildIdentity {
  commit: string | undefined;
  buildTime: string | undefined;
}

/** The identity this bundle was compiled with. Commit comes from
 *  NEXT_PUBLIC_SENTRY_RELEASE (next.config.mjs bakes the Railway/Vercel git
 *  SHA into it at build); buildTime from NEXT_PUBLIC_BUILD_TIME. */
export function clientBuildIdentity(env: NodeJS.ProcessEnv = process.env): BuildIdentity {
  return {
    commit: env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    buildTime: env.NEXT_PUBLIC_BUILD_TIME || undefined,
  };
}

/**
 * Is the running bundle provably older than what the server now serves?
 * Commit comparison wins (exact); buildTime is the fallback for environments
 * where the SHA never reached the build env. 'unknown' commit / missing
 * values → NOT stale (fail-safe: never reload on uncertainty).
 */
export function isBuildStale(args: {
  clientCommit: string | undefined;
  serverCommit: string | undefined;
  clientBuildTime: string | undefined;
  serverBuildTime: string | undefined;
}): boolean {
  const { clientCommit, serverCommit, clientBuildTime, serverBuildTime } = args;
  if (clientCommit && serverCommit && serverCommit !== 'unknown') {
    return clientCommit !== serverCommit;
  }
  if (clientBuildTime && serverBuildTime) {
    return clientBuildTime !== serverBuildTime;
  }
  return false;
}

/** Pure decision: may we auto-reload this tab right now? */
export function shouldAutoReloadStaleBuild(args: {
  stale: boolean;
  visible: boolean;
  isInGame: boolean;
  tabOpenMs: number;
  lastReloadAt: number | null;
  now: number;
  minTabOpenMs?: number;
  minIntervalMs?: number;
}): boolean {
  const {
    stale,
    visible,
    isInGame,
    tabOpenMs,
    lastReloadAt,
    now,
    minTabOpenMs = STALE_BUILD_MIN_TAB_OPEN_MS,
    minIntervalMs = STALE_BUILD_RELOAD_MIN_INTERVAL_MS,
  } = args;
  if (!stale) return false;
  if (!visible) return false; // never reload a hidden tab
  if (isInGame) return false; // never interrupt a live round
  if (tabOpenMs < minTabOpenMs) return false; // fresh tabs are not the problem
  if (lastReloadAt != null && now - lastReloadAt < minIntervalMs) return false;
  return true;
}

/** Milliseconds this tab has been open (page load → now). */
export function tabOpenMs(now: () => number = Date.now): number {
  if (typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number') {
    return now() - performance.timeOrigin;
  }
  return 0; // cannot prove age → treat as fresh (fail-safe)
}

/** Read the loop-guard timestamp; null when never fired / storage unavailable. */
export function getStaleBuildReloadGuard(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STALE_BUILD_RELOAD_GUARD_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

/**
 * Claim the reload slot. Returns true iff this call won (guard absent or
 * expired) — the caller MUST then actually reload. Reuses the check inline so
 * claim+decision can never race a second mount of the hook in the same tab.
 */
export function claimStaleBuildReload(
  now: number = Date.now(),
  minIntervalMs: number = STALE_BUILD_RELOAD_MIN_INTERVAL_MS,
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const last = getStaleBuildReloadGuard();
    if (last != null && now - last < minIntervalMs) return false;
    sessionStorage.setItem(STALE_BUILD_RELOAD_GUARD_KEY, String(now));
    return true;
  } catch {
    // sessionStorage unavailable (private mode): allow the reload — the
    // hardNavigateCacheBust param and SW handoff are the outer backstop.
    return true;
  }
}
