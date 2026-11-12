/**
 * Stale-deploy / CDN-missing chunk recovery.
 *
 * After a deploy, the server only keeps the CURRENT build's hashed
 * `_next/static/chunks/*` files. A tab that was opened against the PREVIOUS
 * build — or a document kept by the offline-shell `stale-while-revalidate`
 * window — still references the old hashes, so the next lazy `next/dynamic`
 * import (or route navigation) requests a chunk that no longer exists → 404.
 *
 * History (#893 boot guard, #935 retryImport, #979 CDN cache-bust): those paths
 * hard-reload once WITHOUT a version gate and stamp `_lc_chunk` so the browser
 * HTTP cache cannot reuse the previous HTML. Chunk 2703 stayed hot on
 * lexiclash.live after #979 (t_9cc3561f) because:
 *  1. `navigator.serviceWorker.unregister()` does NOT drop control of the
 *     current client until unload — the dying SW still intercepts the recovery
 *     navigation and can serve a stale precached shell (ignoring the bust param).
 *  2. `global-error.tsx` + `ErrorBoundaries.tsx` still bare-`location.reload()`'d,
 *     re-entering the offline-shell SWR hole #979 fixed elsewhere.
 *
 * Policy now:
 *  - A confirmed chunk/module load failure always gets ONE guarded,
 *    cache-busting hard navigation (content-hashed asset 404s are unrecoverable
 *    in place).
 *  - Version mismatch remains a sufficient signal, but is no longer required.
 *  - Recovery activates any waiting SW (`SKIP_WAITING`), purges Cache Storage,
 *    unregisters, then navigates with `_lc_chunk`. The SW itself treats that
 *    param as network-only (no stale shell fallback).
 */

/** Shared sessionStorage guard (value = the build id that was reloaded) so every
 *  post-hydration recovery path cooperates on one reload per build per tab.
 *  The boot guard uses its own key for pre-hydration. */
export const CHUNK_RECOVERY_GUARD_KEY = 'chunk_error_refresh';

/** Query param stamped onto the recovery navigation so the browser cannot
 *  re-serve the previous document from HTTP cache. Stripped on the next clean
 *  mount so URLs stay tidy. The SW must treat this as network-only. */
export const CHUNK_RELOAD_PARAM = '_lc_chunk';

/** Search and AI crawlers. Kept in step with the regex in utils/chunkBootGuard.ts. */
export const CRAWLER_UA_PATTERN = /bot[/]|crawler|spider|slurp|google-inspectiontool/i;

/** True for crawler user agents, which must never get a recovery navigation. */
export function isCrawlerUserAgent(ua: string | undefined | null): boolean {
  return CRAWLER_UA_PATTERN.test(ua || '');
}

/** Message type the page posts to a waiting worker so it calls skipWaiting(). */
export const SW_SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' as const };

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
 * Best-effort: poke registrations for an update and tell any waiting worker to
 * activate immediately. Unregister alone does not drop control of the current
 * client (t_9cc3561f) — activating a fresh build-stamped SW first lets
 * `activate` purge old Cache Storage names before we navigate.
 */
export async function activateWaitingServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (reg) => {
      try {
        await reg.update();
      } catch {
        /* update check can fail offline — continue */
      }
      const waiting = reg.waiting;
      if (waiting) {
        try {
          waiting.postMessage(SW_SKIP_WAITING_MESSAGE);
        } catch {
          /* postMessage can throw on a dead worker */
        }
      }
    }),
  );
}

/**
 * Browser-only: activate waiting SW → clear LexiClash caches → unregister
 * service workers → hard-navigate with a cache-busting query param.
 *
 * Unregister does not release the current client; the SW fetch handler must
 * treat `_lc_chunk` navigations as network-only so a dying controller cannot
 * re-serve a precached shell. No-ops outside the browser.
 */
export async function clearCachesAndReload(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await activateWaitingServiceWorkers();
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
  // Crawlers render once and never come back to a "fixed" tab; a recovery
  // navigation only turns their render into a JS redirect. Leave them be.
  if (isCrawlerUserAgent(typeof navigator === 'undefined' ? '' : navigator.userAgent)) return;
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

/** Survives the reload itself (unlike module state), so a storage-blocked browser still stops after one. Same mark as utils/chunkBootGuard.ts. */
export const CHUNK_RELOAD_WINDOW_MARK = '__lc_cbr1';

/** Event asking the "new version" banner to show its Refresh instead of reloading the page. */
export const STALE_DEPLOY_UPDATE_EVENT = 'lexiclash:update-ready';

/** Window flag ChunkErrorRecovery sets once mounted; the boot script then leaves chunk failures to it. */
export const CHUNK_RECOVERY_READY_FLAG = '__lcChunkRecoveryReady';

/** The build this page runs; null when unknown, which callers treat as "already reloaded". */
export function currentBuildId(): string | null {
  return process.env.NEXT_PUBLIC_BUILD_TIME || null;
}

/** A failed import while offline is a connection problem, not a stale deploy. */
export function isBrowserOffline(): boolean {
  try {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  } catch {
    return false;
  }
}

const WINDOW_MARK_PATTERN = new RegExp(`${CHUNK_RELOAD_WINDOW_MARK}(@[^;]*;)?`, 'g');

function windowMarkFor(buildId: string): string {
  return `${CHUNK_RELOAD_WINDOW_MARK}@${buildId};`;
}

function readWindowName(): string {
  try {
    return String(window.name || '');
  } catch {
    return '';
  }
}

/**
 * True once a recovery reload ran in this tab for the build the page runs now: sessionStorage or the
 * window.name mark (both keyed by build), or the cache-bust param of the reload that loaded this page.
 * A reload for an older build does not count, so a later deploy gets its own one reload.
 */
export function chunkReloadAlreadyHappened(): boolean {
  if (typeof window === 'undefined') return false;
  const buildId = currentBuildId();
  if (!buildId) return true;
  try {
    if (sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY) === buildId) return true;
  } catch {
    /* storage blocked: the two markers below still hold */
  }
  if (readWindowName().includes(windowMarkFor(buildId))) return true;
  try {
    return new URLSearchParams(window.location.search).has(CHUNK_RELOAD_PARAM);
  } catch {
    return false;
  }
}

function markChunkReload(buildId: string): void {
  try {
    sessionStorage.setItem(CHUNK_RECOVERY_GUARD_KEY, buildId);
  } catch {
    /* storage blocked */
  }
  try {
    window.name = readWindowName().replace(WINDOW_MARK_PATTERN, '') + windowMarkFor(buildId);
  } catch {
    /* window.name unwritable */
  }
}

/**
 * Claims this build's one recovery reload. Returns true iff the caller should
 * now invoke clearCachesAndReload. Never claims when the build id is unknown.
 */
export function claimChunkRecoveryGuard(): boolean {
  if (typeof window === 'undefined') return false;
  if (chunkReloadAlreadyHappened()) return false;
  const buildId = currentBuildId();
  if (!buildId) return false;
  markChunkReload(buildId);
  return true;
}

/** Only for a manual Refresh the user pressed: the next failure may then auto-reload once more. */
export function clearChunkRecoveryGuard(): void {
  if (typeof window === 'undefined') return;
  try {
    window.name = readWindowName().replace(WINDOW_MARK_PATTERN, '');
  } catch {
    /* window.name unwritable */
  }
  try {
    sessionStorage.removeItem(CHUNK_RECOVERY_GUARD_KEY);
  } catch {
    /* ignore */
  }
}
