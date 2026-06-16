'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { Locale } from './types';
import { LOCALE_CONFIGS } from './locale-config';
import { prewarmDictionary, hasWordInMemoryCache } from '@/hooks/useDictionaryCache';
import type { Language } from '@/shared/types/game';

/**
 * Async dictionary fallback for free-form word play in Blast V2.
 *
 * The engine's `validateSelection` predicate is synchronous, but the only
 * reliable cross-locale dictionary lives behind the `/api/dictionary/check`
 * endpoint. We can't await an HTTP round-trip inside the reducer.
 *
 * Workflow:
 *   1. Player drags letters → reducer rejects with `reason: 'unknown'` AND
 *      stashes the rejected cells in `state.lastRejectedCells`.
 *   2. BlastGame calls `verify(candidate)` here — async, HTTP-backed.
 *   3. On a `true` result, BlastGame dispatches `onForceBonus(cells, word)`
 *      which credits the word retroactively and clears the tiles.
 *
 * Cache is per-locale and keyed by the normalized candidate. A negative hit
 * is cached too so a player rage-spamming the same nonsense word doesn't
 * hammer the server.
 */
export function useBlastDictionary(locale: Locale) {
  // Cache hits per (locale, normalized word). `true` = confirmed valid,
  // `false` = confirmed not in dictionary. Map<string, Promise<boolean>> for
  // in-flight de-duplication.
  const cacheRef = useRef<Map<string, boolean | Promise<boolean>>>(new Map());
  const config = LOCALE_CONFIGS[locale];

  // Warm the shared offline dictionary once per mount. It fetches
  // /api/dictionary-words (cached offline-first by the service worker) into an
  // in-memory Set, so a later connection drop can still validate bonus words.
  useEffect(() => {
    void prewarmDictionary(locale as Language);
  }, [locale]);

  const verify = useCallback(
    async (word: string): Promise<boolean> => {
      if (!word) return false;
      const norm = config.normalize(word);
      if (!norm) return false;
      const cached = cacheRef.current.get(norm);
      if (typeof cached === 'boolean') return cached;
      if (cached instanceof Promise) return cached;

      // Offline-first: a warmed in-memory dictionary hit avoids the network
      // entirely. `null` = dict not warmed; `false` = not in base dict (but a
      // community-validated word may still resolve via the server).
      if (hasWordInMemoryCache(norm, locale as Language) === true) {
        cacheRef.current.set(norm, true);
        return true;
      }
      // With no connection the server check can't run. Reject WITHOUT caching a
      // hard false, so reconnecting re-checks the server for community words.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return false;
      }

      const inflight = (async () => {
        try {
          const res = await fetch('/api/dictionary/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: norm, language: locale }),
          });
          if (!res.ok) {
            cacheRef.current.set(norm, false);
            return false;
          }
          const data = (await res.json()) as { isValid?: boolean };
          const ok = !!data.isValid;
          cacheRef.current.set(norm, ok);
          return ok;
        } catch {
          cacheRef.current.delete(norm);
          return false;
        }
      })();
      cacheRef.current.set(norm, inflight);
      return inflight;
    },
    [locale, config],
  );

  // Synchronous predicate for the engine's inline bonus-word check. A warmed
  // offline-dict hit validates the bonus word INSTANTLY — no async round-trip,
  // no "reject then retroactively credit" flicker. Cold/miss returns false and
  // the async `verify` path still covers community words + cache warm-up.
  const checkSync = useCallback(
    (word: string): boolean => {
      if (!word) return false;
      const norm = config.normalize(word);
      if (!norm) return false;
      return hasWordInMemoryCache(norm, locale as Language) === true;
    },
    [locale, config],
  );

  return { verify, checkSync };
}
