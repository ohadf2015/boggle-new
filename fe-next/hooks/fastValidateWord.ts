/**
 * fastValidateWord — client-side word validation with in-memory fast-path.
 *
 * Returns true without a network round-trip when the word is in the
 * prewarmed in-memory dictionary for the language. On memory-miss (or
 * cold dict), falls back to POST /api/validate-word so community-validated
 * words still resolve.
 *
 * Network failure mode intentionally permissive (length >= 3) so a hiccup
 * during single-player doesn't brick the game.
 */

import type { Language } from '@/shared/types/game';
import { hasWordInMemoryCache } from './useDictionaryCache';
import { getOfflineStore } from '@/lib/offline';
import { validateOffline } from '@/lib/offline/dict';

export async function tryValidateOffline(word: string, language: Language): Promise<boolean> {
  try {
    const store = await getOfflineStore();
    return await validateOffline(store, word, language);
  } catch {
    return false;
  }
}

export async function fastValidateWord(word: string, language: Language): Promise<boolean> {
  const inMemory = hasWordInMemoryCache(word, language);
  if (inMemory === true) return true;

  // Same word list as memory, so only worth booting the offline store when memory is cold or we are offline.
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  if (!(inMemory === false && online) && await tryValidateOffline(word, language)) return true;

  try {
    const res = await fetch('/api/validate-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language }),
    });
    if (!res.ok) return word.length >= 3;
    const data = await res.json();
    return data.isValid === true;
  } catch {
    return word.length >= 3;
  }
}
