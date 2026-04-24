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

export async function fastValidateWord(word: string, language: Language): Promise<boolean> {
  if (hasWordInMemoryCache(word, language) === true) return true;

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
