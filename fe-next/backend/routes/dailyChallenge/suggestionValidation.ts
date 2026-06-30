/**
 * Pure input validation for POST /api/daily-challenge/suggest-word.
 * Extracted so the boundary logic (language / length / charset) is unit-tested
 * without an Express/Supabase harness. The DB-level checks (rate cap, duplicate)
 * stay in the route.
 */
import { isValidLanguage } from './utils';
import { validateGameWord } from '../../../utils/dailyChallenge/wikipediaWordProcessor';
import type { Language } from '../../../types';

export interface SuggestionValidation {
  ok: boolean;
  error?: 'invalid_language' | 'invalid_length' | 'invalid_word';
  /** trimmed + uppercased word, present only when ok */
  word?: string;
}

export function validateSuggestionInput(language: unknown, word: unknown): SuggestionValidation {
  if (typeof language !== 'string' || !isValidLanguage(language)) {
    return { ok: false, error: 'invalid_language' };
  }
  const raw = typeof word === 'string' ? word.trim() : '';
  const len = [...raw].length;
  const min = language === 'ja' ? 2 : 5;
  const max = language === 'ja' ? 4 : 7;
  if (len < min || len > max) {
    return { ok: false, error: 'invalid_length' };
  }
  if (!validateGameWord(raw, language as Language).valid) {
    return { ok: false, error: 'invalid_word' };
  }
  return { ok: true, word: raw.toUpperCase() };
}
