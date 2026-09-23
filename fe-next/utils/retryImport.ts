import logger from '@/utils/logger';
import { clearCachesAndReload } from '@/lib/deploy/staleDeployReload';

/**
 * Hardens a dynamic `import()` against transient chunk-load failures.
 *
 * Why: code-split chunks (e.g. the homepage FTUE `OnboardingFlow`) are fetched
 * lazily. A flaky network — or, classically, a stale chunk hash after a new
 * deploy while the tab was open — makes the `import()` reject with a
 * `ChunkLoadError`. With `next/dynamic` that leaves the `loading` fallback on
 * screen forever: a full-screen backdrop with no content. Users reported it as
 * "black backdrop, no popup" on the homepage.
 *
 * Strategy: retry the import a few times with backoff (covers a momentary
 * blip), and if a chunk error still persists, force a single guarded reload to
 * pull the fresh asset manifest (covers the post-deploy stale-hash case). The
 * reload guard prevents an infinite reload loop.
 */

const RELOAD_GUARD_KEY = 'chunk_reload_at';
const RELOAD_GUARD_WINDOW_MS = 10_000;

function isChunkLoadError(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  const message = (err as { message?: string } | null)?.message ?? '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk \S+ failed/i.test(message) ||
    /Loading CSS chunk/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}


/** Allow at most one reload per window so a permanently-broken chunk can't loop. */
function shouldReloadOnce(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
    if (Number.isFinite(last) && Date.now() - last < RELOAD_GUARD_WINDOW_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    return true;
  } catch {
    // sessionStorage unavailable (private mode / SSR) — don't risk a reload loop.
    return false;
  }
}

export const IMPORT_HANG_ERROR_NAME = 'ImportHangError';

export interface RetryImportOptions {
  /** Number of retries after the first attempt (default 2). */
  retries?: number;
  /** Initial backoff in ms; doubles each retry (default 300). */
  interval?: number;
  /** Injectable reload hook (defaults to cache-clear + reload). For tests. */
  reload?: () => void | Promise<void>;
  /**
   * If the import (including retries) has not settled after this many ms,
   * reject with ImportHangError. Opt-in — a hanging `import()` never hits
   * `.catch()`, so retry/reload never run and next/dynamic freezes on
   * `loading`. Do NOT auto-reload on hang: the guard window equals a typical
   * timeout and would loop. Leave recovery to an error boundary.
   */
  timeoutMs?: number;
}

/**
 * Wrap a dynamic-import factory so it retries on failure. The returned function
 * is drop-in compatible with `next/dynamic(factory, ...)` and `React.lazy`.
 */
export function retryImport<T>(
  factory: () => Promise<T>,
  options: RetryImportOptions = {},
): () => Promise<T> {
  const retries = options.retries ?? 2;
  const interval = options.interval ?? 300;
  const reload =
    options.reload ??
    (() => {
      if (typeof window !== 'undefined') {
        // Clear caches and unregister SWs before reload so the fresh build
        // is fetched, not the stale chunk from cache. error.tsx does this too.
        clearCachesAndReload().catch((err) => {
          logger.error('clearCachesAndReload failed, falling back to bare reload', err);
          window.location.reload();
        });
      }
    });

  return () => {
    const work = new Promise<T>((resolve, reject) => {
      const attempt = (remaining: number, delay: number): void => {
        factory()
          .then(resolve)
          .catch((err: unknown) => {
            if (remaining > 0) {
              setTimeout(() => attempt(remaining - 1, delay * 2), delay);
              return;
            }
            // Retries exhausted. A stale-chunk error is unrecoverable in place;
            // reload once to fetch the new manifest. Otherwise surface the error.
            if (isChunkLoadError(err) && shouldReloadOnce()) {
              logger.warn('retryImport: chunk load failed after retries, reloading', err);
              reload();
              return; // page reloads — leave the promise pending.
            }
            reject(err);
          });
      };
      attempt(retries, interval);
    });

    const timeoutMs = options.timeoutMs;
    if (!timeoutMs || timeoutMs <= 0) return work;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        const err = new Error(`Import hung after ${timeoutMs}ms`);
        err.name = IMPORT_HANG_ERROR_NAME;
        logger.warn('retryImport: import hung, surfacing to error boundary', err);
        reject(err);
      }, timeoutMs);
      work.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  };
}
