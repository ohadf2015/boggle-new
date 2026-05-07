/**
 * gemLetters — per-language rare-letter detection used by the Blast HUD
 * mascot's "oh!" reaction.
 *
 * Letter rarity is locale-specific: Q is rare in EN/SV but only mid-tier in
 * ES; Hebrew's rare letters are entirely different. The sets below are picked
 * from each language's Scrabble (or equivalent) high-value tile tier so
 * "gem letter" maps to the same player feeling — "I used a hard letter" —
 * regardless of locale.
 *
 * Sources behind each set:
 *   EN — Scrabble high-tier: Q,Z=10pts ; X,J=8pts
 *   ES — Spanish Scrabble: K,W,X,Y=8 ; Z=10 (Q is mid-tier, NOT a gem)
 *   SV — Swedish Scrabble high-tier: C,Q,X,Z=10
 *   HE — Hebrew rare letters + final forms
 *   JA — uncommon hiragana (pragmatic pick — JA has no Scrabble standard)
 */

import type { Language } from '@/shared/types/game';

export const GEM_LETTERS: Record<Language, Set<string>> = {
  en: new Set(['Q', 'Z', 'X', 'J']),
  es: new Set(['K', 'W', 'X', 'Y', 'Z']),
  sv: new Set(['C', 'Q', 'X', 'Z']),
  he: new Set([
    // Rare base forms
    'ז', 'ע', 'צ', 'ק', 'ט',
    // Final forms (rare by placement)
    'ך', 'ץ', 'ף', 'ן', 'ם',
  ]),
  ja: new Set(['む', 'ぬ', 'よ', 'や', 'ゆ']),
  // FR — French Scrabble 10-pt tier: K,W,X,Y,Z
  fr: new Set(['K', 'W', 'X', 'Y', 'Z']),
  // DE — German Scrabble 10-pt tier: Q,X,Y + Ö
  de: new Set(['Q', 'X', 'Y', 'Ö']),
};

export function isGemLetter(letter: string, language: Language): boolean {
  const set = GEM_LETTERS[language];
  if (!set) return false;
  return set.has(letter.toUpperCase()) || set.has(letter);
}

/** Returns true if any letter in `word` is a gem letter for the given language. */
export function hasGemLetter(word: string, language: Language): boolean {
  for (const ch of word) {
    if (isGemLetter(ch, language)) return true;
  }
  return false;
}
