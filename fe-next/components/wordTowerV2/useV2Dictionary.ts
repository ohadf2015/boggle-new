'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import { trackGrowthEvent } from '@/utils/growthTracking';

/**
 * The wheel's dictionary for the current language, with a visible failure
 * state and an in-place retry. The retry used to be a full page reload: on
 * Hebrew (~5MB, never cached) that was 20-25s of blank screen per tap and the
 * load often failed again (PostHog inbox 01a15a17).
 */
export function useV2Dictionary(language: string) {
  const dictRef = useRef<Set<string> | null>(null);
  const [dictReady, setDictReady] = useState(false);
  const [dictError, setDictError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const attemptRef = useRef(0);

  useEffect(() => {
    attemptRef.current = 0;
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    setDictError(false);
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    loadWordCraftDictionary(language as Parameters<typeof loadWordCraftDictionary>[0])
      .then((set) => {
        if (cancelled) return;
        dictRef.current = set;
        setDictReady(true);
      })
      .catch((err: unknown) => {
        // Without this the wheel stays dead with no explanation.
        if (cancelled) return;
        setDictReady(false);
        setDictError(true);
        trackGrowthEvent('wt2_dict_load_failed', {
          locale: language,
          attempt,
          reason: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [language, loadKey]);

  const retry = useCallback(() => setLoadKey((k) => k + 1), []);

  return { dictRef, dictReady, dictError, retry };
}
