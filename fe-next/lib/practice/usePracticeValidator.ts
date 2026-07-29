import { useCallback, useRef } from 'react';
import { tryValidateOffline } from '@/hooks/fastValidateWord';
import type { Language } from '@/shared/types/game';

export interface PracticeValidationResult {
  isValid: boolean;
  source: 'dictionary' | 'optimistic' | 'rejected';
  reason?: string;
}

/**
 * Practice-mode word validator. Wraps /api/validate-word with a session-scoped
 * cache, single retry on 429, and optimistic-accept on 5xx (we're forgiving in
 * practice — never block the player on infra hiccups).
 *
 * Cache: per-hook-instance, lives until the practice screen unmounts. Keyed
 * by `language:word`. No TTL needed — practice sessions are short.
 */
export function usePracticeValidator(language: string) {
  const cacheRef = useRef<Map<string, PracticeValidationResult>>(new Map());

  const check = useCallback(
    async (word: string): Promise<PracticeValidationResult> => {
      const key = `${language}:${word}`;
      const cached = cacheRef.current.get(key);
      if (cached) return cached;

      if (await tryValidateOffline(word, language as Language)) {
        const result: PracticeValidationResult = { isValid: true, source: 'dictionary' };
        cacheRef.current.set(key, result);
        return result;
      }

      const callOnce = () =>
        fetch('/api/validate-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, language }),
        });

      let response: Response;
      try {
        response = (await callOnce()) as Response;
        if (response.status === 429) {
          await new Promise((r) => setTimeout(r, 600));
          response = (await callOnce()) as Response;
        }
      } catch {
        const result: PracticeValidationResult = { isValid: true, source: 'optimistic' };
        cacheRef.current.set(key, result);
        return result;
      }

      if (response.status >= 500) {
        const result: PracticeValidationResult = { isValid: true, source: 'optimistic' };
        cacheRef.current.set(key, result);
        return result;
      }

      let body: { isValid?: boolean; reason?: string } = {};
      try {
        body = await response.json();
      } catch {
        // ignore parse failure — treat as rejection
      }
      const result: PracticeValidationResult = body.isValid
        ? { isValid: true, source: 'dictionary' }
        : { isValid: false, source: 'rejected', reason: body.reason };
      cacheRef.current.set(key, result);
      return result;
    },
    [language],
  );

  return { check };
}
