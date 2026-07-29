'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { Language } from '@/shared/types/game';
import { prewarmDictionary } from '@/hooks/useDictionaryCache';
import { warmDictionaryCache } from '@/lib/offline/warmDictionary';

interface Props {
  lang: Language;
}

// Locale landing roots ("/en", "/he/", ...). A first-time visitor here pays
// 2.8MB for a dictionary they may never use — it was the single largest
// transfer on the landing page. Game routes keep the eager warm.
const LANDING_RE = /^\/[a-z]{2}(\/)?$/i;

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

export default function DictionaryPrewarmer({ lang }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (shouldSkipWarm(pathname)) return;

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
      warmDictionaryCache(lang).catch(() => {
        // Silent — best-effort offline warm.
      });
    };
    warm(); // returning visitors: SW already controls the page

    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    let onControllerChange: (() => void) | undefined;
    if (sw) {
      sw.ready.then(warm).catch(() => {});
      if (!sw.controller) {
        onControllerChange = () => warm();
        sw.addEventListener('controllerchange', onControllerChange);
      }
    }

    return () => {
      if (sw && onControllerChange) sw.removeEventListener('controllerchange', onControllerChange);
    };
  }, [lang, pathname]);

  return null;
}
