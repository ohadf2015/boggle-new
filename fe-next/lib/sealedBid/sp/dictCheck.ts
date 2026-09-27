import type { Language } from '@/shared/types/game';
import { hasWordInMemoryCache } from '@/hooks/useDictionaryCache';
import { tryValidateOffline } from '@/hooks/fastValidateWord';

/**
 * Offline-first word check for sealed-bid solo.
 * Memory cache → offline dict store → live /api/dictionary/check.
 * Network failure with no local hit fails closed (word is not valid).
 */
export async function dictCheck(word: string, lang: string): Promise<boolean> {
  const language = lang as Language;
  if (hasWordInMemoryCache(word, language) === true) return true;
  if (await tryValidateOffline(word, language)) return true;

  try {
    const res = await fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language: lang }),
    });
    if (!res.ok) return false;
    const data: { isValid?: boolean } = await res.json();
    return !!data.isValid;
  } catch {
    return false;
  }
}
