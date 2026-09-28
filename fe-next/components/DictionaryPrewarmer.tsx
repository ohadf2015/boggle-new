'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { Language } from '@/shared/types/game';
import { prewarmDictionary } from '@/hooks/useDictionaryCache';
import { warmDictionaryCache } from '@/lib/offline/warmDictionary';
import { isHeavyGamePath } from '@/lib/perf/heavyGamePath';

interface Props {
  lang: Language;
}

// Locale landing roots ("/", "/en", "/he/", ...). A first-time visitor here pays
// ~700KB (gz) for a dictionary they may never use — it was the single largest
// transfer on the landing page. The bare "/" matters: www.lexiclash.live/ is
// served as the landing (server-side locale rewrite keeps the browser URL at
// "/", so usePathname() returns "/"), and without it the warm fired on every
// first-time landing visit. Game routes keep the eager warm.
const LANDING_RE = /^\/([a-z]{2})?\/?$/i;

function shouldSkipWarm(pathname: string | null): boolean {
  // Respect Save-Data / slow connections everywhere.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') return true;

  if (!LANDING_RE.test(pathname || '')) return false; // game routes: keep warming

  // On the landing page, only warm when the SW already holds the dictionary
  // (cache hit, no network) or the user has played before (likely to play again).
  try {
    return !localStorage.getItem('lc_sw_cached');
  } catch {
    return true;
  }
}

const GAME_WARM_IDLE_MS = 3500;

function scheduleAfterFirstPaint(fn: () => void): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(() => fn(), { timeout: GAME_WARM_IDLE_MS });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(fn, GAME_WARM_IDLE_MS);
  return () => window.clearTimeout(t);
}

export default function DictionaryPrewarmer({ lang }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (shouldSkipWarm(pathname)) return;

    let cancelled = false;
    let onControllerChange: (() => void) | undefined;
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;

    const run = () => {
      if (cancelled) return;

      // 1) Warm the in-memory/IndexedDB Set via the worker (perf: skips the
      //    ~100-300ms parse on first word submit). Fire-and-forget, off-thread.
      prewarmDictionary(lang).catch(() => {
        // Silent — mount must never break on a flaky dict fetch.
      });

      // 2) Guarantee the dictionary is in the SERVICE-WORKER cache so words
      //    validate on a flight. The worker path above stores in IndexedDB but
      //    does not reliably populate SW Cache Storage; this main-thread fetch is
      //    SW-intercepted + SWR-cached (guarded to run once per locale via the
      //    isCached check inside warmDictionaryCache).
      //
      //    Timing matters: a freshly-installed SW does NOT control the page that
      //    registered it until it activates + clients.claim(). A warm fetch fired
      //    now (first visit) would race ahead of SW control and skip the cache.
      //    So we also re-run on `ready` and `controllerchange` — by then the SW
      //    intercepts the fetch and caches it, well before the user goes offline.
      const warm = () => {
        if (cancelled) return;
        warmDictionaryCache(lang).catch(() => {
          // Silent — best-effort offline warm.
        });
      };
      warm(); // returning visitors: SW already controls the page

      if (sw) {
        sw.ready.then(warm).catch(() => {});
        if (!sw.controller) {
          onControllerChange = () => warm();
          sw.addEventListener('controllerchange', onControllerChange);
        }
      }
    };

    // /singleplayer PSI: this 704KB fetch was inside the LCP window. The game
    // hook (useDictionaryCache) only mounts on phase==='playing', so deferring
    // the layout prewarm does not delay first-word validation until Play.
    const cancelIdle = isHeavyGamePath(pathname) ? scheduleAfterFirstPaint(run) : (run(), () => {});

    return () => {
      cancelled = true;
      cancelIdle();
      if (sw && onControllerChange) sw.removeEventListener('controllerchange', onControllerChange);
    };
  }, [lang, pathname]);

  return null;
}
