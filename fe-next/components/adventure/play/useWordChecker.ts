'use client';

/** Dictionary check for adventure runs: local cache first, server on a cold cache. `null` = could not check. */
import { useCallback } from 'react';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { resolveWordVerdict } from '@/lib/dictionary/checkWordRemote';
import type { Language } from '@/types';

export function useWordChecker(language: string) {
  const { checkWord, isLoaded } = useDictionaryCache(language as Language);
  return useCallback(
    async (word: string): Promise<boolean | null> => {
      // A loaded cache holds the WHOLE language, so it is authoritative both ways.
      if (isLoaded) return checkWord(word);
      const verdict = await resolveWordVerdict(word, language);
      return verdict === 'unknown' ? null : verdict === 'valid';
    },
    [checkWord, isLoaded, language],
  );
}
