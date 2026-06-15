/**
 * Stale-deploy chunk recovery.
 *
 * After a deploy, the server only keeps the CURRENT build's hashed
 * `_next/static/chunks/*` files. A tab that was opened against the PREVIOUS
 * build still references the old hashes, so the next lazy `next/dynamic` import
 * (or route navigation) requests a chunk that no longer exists → 404. Depending
 * on which surface fails the user sees a blank screen, a stuck loader, or a
 * spurious 404 page — the "sometimes 404 when entering Word Hunt" report.
 *
 * React error boundaries (`error.tsx` / `global-error.tsx`) only catch failures
 * that throw during render; they miss prefetch failures, asset `onerror` events,
 * and `next/dynamic` import rejections (which surface as unhandled rejections).
 * This module is surface-agnostic: a global listener feeds any chunk-shaped
 * failure here, and we hard-reload ONLY when the client build is provably stale
 * (its build time differs from the live server build time). A genuine error on
 * an up-to-date build is left alone, so we never reload-loop a real 404.
 */

/** Shared sessionStorage guard so every recovery path (error boundaries + the
 *  global listener) cooperates on a single one-reload-per-session backstop. */
export const CHUNK_RECOVERY_GUARD_KEY = 'chunk_error_refresh';

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
 * Pure decision core. Reload only when the build is provably stale.
 * Fails safe (returns false) whenever staleness can't be established.
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

export interface RecoveryDeps {
  /** This bundle's build time, baked at build via NEXT_PUBLIC_BUILD_TIME. */
  clientBuildTime: string | undefined;
  /** Fetch the live server build time; must reject/throw on any failure. */
  fetchServerBuildTime: () => Promise<string | undefined>;
  /** Whether a recovery reload has already fired this session. */
  getGuard: () => boolean;
  /** Mark that a recovery reload is firing. */
  setGuard: () => void;
  /** Clear caches + service worker, then hard-reload. */
  clearCachesAndReload: () => Promise<void> | void;
}

/**
 * Orchestrates a guarded, version-gated recovery reload.
 * Returns true iff a reload was triggered.
 */
export async function recoverFromStaleChunk(deps: RecoveryDeps): Promise<boolean> {
  if (deps.getGuard()) return false;

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
 * hard-reload to pull the fresh build manifest. No-ops outside the browser.
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
    // Best-effort cleanup — reload regardless so we still get fresh HTML.
  }
  window.location.reload();
}
