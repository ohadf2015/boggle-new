/**
 * Stale-deploy / CDN-missing chunk recovery.
 *
 * After a deploy, the server only keeps the CURRENT build's hashed
 * `_next/static/chunks/*` files. A tab that was opened against the PREVIOUS
 * build — or a document kept by the offline-shell `stale-while-revalidate`
 * window — still references the old hashes, so the next lazy `next/dynamic`
 * import (or route navigation) requests a chunk that no longer exists → 404.
 *
 * History (#893 boot guard, #935 retryImport): those paths hard-reload once
 * WITHOUT a version gate. ChunkErrorRecovery historically only reloaded when
 * `/api/version` proved a build mismatch, so CDN / SWR / flaky-network chunk
 * 404s on an otherwise "current" build fell through as a silent no-op
 * (PostHog ChunkLoadError chunk 2703 / 14850 still hot after those PRs).
 *
 * Policy now:
 *  - A confirmed chunk/module load failure always gets ONE guarded,
 *    cache-busting hard navigation (content-hashed asset 404s are unrecoverable
 *    in place).
 *  - Version mismatch remains a sufficient signal, but is no longer required.
 *  - Bare `location.reload()` is avoided: it can re-serve the same stale HTML
 *    from the browser HTTP cache inside the SWR window. We navigate to the
 *    same path with a one-shot `_lc_chunk` query param instead.
 */

/** Shared sessionStorage guard so every recovery path (error boundaries + the
 *  global listener + boot guard) cooperates on a single one-reload-per-session
 *  backstop. Boot guard uses a separate key for pre-hydration; post-hydration
 *  paths share this one. */
export const CHUNK_RECOVERY_GUARD_KEY = 'chunk_error_refresh';

/** Query param stamped onto the recovery navigation so the browser cannot
 *  re-serve the previous document from HTTP cache. Stripped on the next clean
 *  mount so URLs stay tidy. */
export const CHUNK_RELOAD_PARAM = '_lc_chunk';

/**
 * Heuristic: does this error name/message look like a failed chunk/module load?
 * Mirrors the matcher in `app/[locale]/error.tsx` so behaviour stays consistent.
 */
export function isChunkLoadError(name: string | undefined, message: string | undefined): boolean {
  const n = (name || '').toLowerCase();
  const m = (message || '').toLowerCase();

  if (n === 'chunkloaderror') return true;

  // Turbopack CommonJS/ESM transpile failure surfaces as this ReferenceError.
  if (n === 'referenceerror' && m.includes('module is not defined')) return true;

  return (
    m.includes('loading chunk') ||
    m.includes('failed to load chunk') ||
    m.includes('loading css chunk') ||
    m.includes('dynamically imported module') ||
    m.includes('_next/static/chunks') ||
    // 'failed to fetch' alone is too broad — require chunk/module context.
    (m.includes('failed to fetch') &&
      (m.includes('module') ||
        m.includes('chunk') ||
        m.includes('_next/') ||
        m.includes('dynamically imported')))
  );
}

/**
 * Pure decision core for the VERSION-GATED path (e.g. VersionChecker toast).
 * Reload only when the build is provably stale.
 */
export function shouldReloadForStaleDeploy(args: {
  clientBuildTime: string | undefined;
  serverBuildTime: string | undefined;
  alreadyReloaded: boolean;
}): boolean {
  const { clientBuildTime, serverBuildTime, alreadyReloaded } = args;
  if (alreadyReloaded) return false;
  if (!clientBuildTime || !serverBuildTime) return false; // uncertain → don't reload
  return clientBuildTime !== serverBuildTime;
}

/**
 * Pure decision core for CHUNK ASSET failures.
 * A hashed `/_next/static` 404 cannot be healed in place — one guarded reload
 * is always warranted, whether or not `/api/version` agrees the build is stale.
 */
export function shouldReloadForMissingChunk(args: { alreadyReloaded: boolean }): boolean {
  return !args.alreadyReloaded;
}

export interface RecoveryDeps {
  /** This bundle's build time, baked at build via NEXT_PUBLIC_BUILD_TIME. */
  clientBuildTime: string | undefined;
  /** Fetch the live server build time; must reject/throw on any failure. */
  fetchServerBuildTime: () => Promise<string | undefined>;
  /** Whether a recovery reload has already fired this session. */
  getGuard: () => boolean;
  /** Mark that a recovery reload is firing. */
  setGuard: () => void;
  /** Clear caches + service worker, then hard-navigate (cache-bust). */
  clearCachesAndReload: () => Promise<void> | void;
  /**
   * When true (default for ChunkErrorRecovery), reload on any chunk failure
   * once — do not require a version mismatch. Set false to keep the legacy
   * version-gated behaviour (VersionChecker-style).
   */
  forceOnChunkFailure?: boolean;
}

/**
 * Orchestrates a guarded recovery reload.
 * Returns true iff a reload was triggered.
 *
 * Default (`forceOnChunkFailure: true`): one cache-busting reload on any call
 * that reaches here from a chunk-shaped failure. Version fetch is best-effort
 * telemetry only — a mismatch still reloads, but a match / miss no longer
 * blocks recovery.
 *
 * Legacy (`forceOnChunkFailure: false`): reload only when the build is
 * provably stale.
 */
export async function recoverFromStaleChunk(deps: RecoveryDeps): Promise<boolean> {
  if (deps.getGuard()) return false;

  const force = deps.forceOnChunkFailure !== false;

  if (force) {
    if (!shouldReloadForMissingChunk({ alreadyReloaded: false })) return false;
    deps.setGuard();
    await deps.clearCachesAndReload();
    return true;
  }

  let serverBuildTime: string | undefined;
  try {
    serverBuildTime = await deps.fetchServerBuildTime();
  } catch {
    return false; // fail-safe: never reload when the version check is unavailable
  }

  if (
    !shouldReloadForStaleDeploy({
      clientBuildTime: deps.clientBuildTime,
      serverBuildTime,
      alreadyReloaded: false,
    })
  ) {
    return false;
  }

  deps.setGuard();
  await deps.clearCachesAndReload();
  return true;
}

/**
 * Browser-only: clear LexiClash caches + unregister service workers, then
 * hard-navigate with a cache-busting query param so the browser cannot re-serve
 * the previous HTML from the offline-shell SWR window. No-ops outside the browser.
 */
export async function clearCachesAndReload(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch {
    // Best-effort cleanup — navigate regardless so we still get fresh HTML.
  }
  hardNavigateCacheBust();
}

/** Stamp `_lc_chunk=<ts>` and replace so HTTP cache cannot reuse the document. */
export function hardNavigateCacheBust(now: () => number = Date.now): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(CHUNK_RELOAD_PARAM, String(now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Drop the recovery cache-bust param from the address bar after a successful
 * boot so shared links stay clean. Safe to call on every mount.
 */
export function stripChunkReloadParam(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(CHUNK_RELOAD_PARAM)) return;
    url.searchParams.delete(CHUNK_RELOAD_PARAM);
    const next = url.pathname + (url.search ? url.search : '') + url.hash;
    window.history.replaceState(window.history.state, '', next);
  } catch {
    /* history API unavailable — leave the param; harmless */
  }
}
