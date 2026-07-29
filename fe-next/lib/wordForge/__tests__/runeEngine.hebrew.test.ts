/**
 * Regression guard: rune letter-classification must work for Hebrew, not just
 * English. Before the shared letterValues module, VOWELS/RARE_LETTERS were
 * English-only and countConsonants used a /[A-Z]/ test, so vowel/consonant/rare
 * runes were dead in Hebrew.
 */
import { describe, it, expect } from 'vitest';
import {
  countVowels,
  countConsonants,
  countRareLetters,
} from '../runeEngine';

describe('runeEngine Hebrew letter classification', () => {
  // שלומ (base form of שלום): ש ל ו מ — one matres-lectionis vowel (ו).
  it('counts Hebrew matres lectionis as vowels', () => {
    expect(countVowels('שלומ')).toBe(1); // ו
  });

  it('counts Hebrew non-vowel letters as consonants (not via /[A-Z]/)', () => {
    expect(countConsonants('שלומ')).toBe(3); // ש ל מ
  });

  it('counts high-value Hebrew letters as rare', () => {
    expect(countRareLetters('קזב')).toBe(2); // ק + ז are rare; ב is not
    expect(countRareLetters('שלומ')).toBe(0);
  });
});
