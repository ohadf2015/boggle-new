import type { Language } from '@/shared/types';

export type WeirdReason = 'too_short' | 'too_long' | 'repeated_chars' | 'non_letter' | 'no_vowels';

export interface ShapeResult {
  weird: boolean;
  reason?: WeirdReason;
}

const MIN_LEN = 2;
const MAX_LEN = 15;
const MAX_REPEAT_RUN = 3;

const EN_SV_ES_VOWELS = new Set('aeiouáéíóúüäöå');
const VOWEL_CHECK_LANGS = new Set<Language>(['en', 'sv', 'es', 'fr', 'de']);

const NON_LETTER_PATTERNS: Record<Language, RegExp> = {
  en: /[^a-zA-ZÀ-ſ]/,
  sv: /[^a-zA-ZåäöÅÄÖ]/,
  es: /[^a-zA-ZÀ-ſ]/,
  fr: /[^a-zA-ZÀ-ſ]/,
  de: /[^a-zA-ZßẞäöüÄÖÜ]/,
  he: /[^֐-׿]/,
  ja: /[^぀-ゟ゠-ヿ一-鿿]/,
};

export function isWordShapeWeird(word: string, language: Language): ShapeResult {
  if (!word || word.length < MIN_LEN) return { weird: true, reason: 'too_short' };
  if (word.length > MAX_LEN) return { weird: true, reason: 'too_long' };

  const nonLetterRe = NON_LETTER_PATTERNS[language] ?? NON_LETTER_PATTERNS.en;
  if (nonLetterRe.test(word)) return { weird: true, reason: 'non_letter' };

  let runChar = '';
  let runLen = 0;
  for (const c of word) {
    if (c === runChar) {
      runLen++;
      if (runLen > MAX_REPEAT_RUN) return { weird: true, reason: 'repeated_chars' };
    } else {
      runChar = c;
      runLen = 1;
    }
  }

  if (VOWEL_CHECK_LANGS.has(language) && word.length >= 3) {
    const lower = word.toLowerCase();
    let hasVowel = false;
    for (const c of lower) {
      if (EN_SV_ES_VOWELS.has(c)) { hasVowel = true; break; }
    }
    if (!hasVowel) return { weird: true, reason: 'no_vowels' };
  }

  return { weird: false };
}
