'use client';

import { useCallback, useEffect, useState } from 'react';
import { goldenWordKey } from '@/utils/dailyChallenge/wordWheelGolden';
import { trackGrowthEvent } from '@/utils/growthTracking';

/**
 * The day's golden word as the client knows it: a key from the server that a
 * found word can be checked against (the word itself is never sent). Returns
 * a predicate; false for every word while the key loads, on a day without a
 * golden word, in practice, or when the lookup fails.
 */
export function useWheelGoldenWord(puzzleDate: string | null | undefined, language: string, enabled: boolean): (word: string) => boolean {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    setKey(null);
    if (!enabled || !puzzleDate) return undefined;
    let cancelled = false;
    void fetch(`/api/daily-challenge/word-wheel/golden/${puzzleDate}/${language}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { key?: unknown } | null) => {
        if (!cancelled && typeof body?.key === 'string') setKey(body.key);
      })
      .catch(() => { /* no golden word shown, nothing else breaks */ });
    return () => { cancelled = true; };
  }, [enabled, puzzleDate, language]);

  return useCallback(
    (word: string) => !!key && !!puzzleDate && goldenWordKey(word, puzzleDate, language) === key,
    [key, puzzleDate, language],
  );
}

/** `golden_word_found`, once per day and language on this device. */
export function reportGoldenWordFound(puzzleDate: string, language: string, source: 'in_game' | 'results'): void {
  const storageKey = `lc:wheel-golden-found:${puzzleDate}:${language}`;
  try {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
  } catch {
    // storage off: still report once per mount
  }
  trackGrowthEvent('golden_word_found', { date: puzzleDate, language, source });
}
