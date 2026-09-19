'use client';

/** Dictionary check for adventure runs: local cache hit first, server check on miss (same path as classic solo). */
import { useCallback } from 'react';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import type { Language } from '@/types';

export function useWordChecker(language: string) {
  const { checkWord, isLoaded } = useDictionaryCache(language as Language);
  return useCallback(
    async (word: string) => {
      if (isLoaded && checkWord(word)) return true;
      try {
        const res = await fetch('/api/dictionary/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, language }),
        });
        return res.ok ? Boolean((await res.json()).isValid) : false;
      } catch {
        return false;
      }
    },
    [checkWord, isLoaded, language],
  );
}
