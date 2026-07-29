/**
 * Word Forge — shared letter-value table tests.
 *
 * Regression guard for the Hebrew "0 points" bug: scoring.ts and runeEngine.ts
 * each kept their own English-only A–Z point map, so every Hebrew word scored
 * 0 base points. This shared module is the single source both consume.
 */
import { describe, it, expect } from 'vitest';
import {
  getLetterPoints,
  getBasePoints,
  VOWELS,
  RARE_LETTERS,
} from '../letterValues';

describe('letterValues — English (unchanged behaviour)', () => {
  it('keeps Scrabble-inspired English values', () => {
    expect(getLetterPoints('A')).toBe(1);
    expect(getLetterPoints('Q')).toBe(10);
    expect(getLetterPoints('z')).toBe(10); // case-insensitive
  });

  it('sums English word base points', () => {
    // C(3)+A(1)+T(1)
    expect(getBasePoints('CAT')).toBe(5);
  });
});

describe('letterValues — Hebrew (the bug)', () => {
  it('gives Hebrew base letters real point values (not 0)', () => {
    expect(getLetterPoints('א')).toBe(1);
    expect(getLetterPoints('ש')).toBe(2);
    expect(getLetterPoints('ז')).toBe(6);
  });

  it('folds Hebrew sofit (final) forms onto their base value', () => {
    // ם → מ (2), ן → נ (3), ך → כ (4), ף → פ (5), ץ → צ (6)
    expect(getLetterPoints('ם')).toBe(getLetterPoints('מ'));
    expect(getLetterPoints('ן')).toBe(getLetterPoints('נ'));
    expect(getLetterPoints('ך')).toBe(getLetterPoints('כ'));
    expect(getLetterPoints('ף')).toBe(getLetterPoints('פ'));
    expect(getLetterPoints('ץ')).toBe(getLetterPoints('צ'));
  });

  it('scores a real Hebrew word above zero', () => {
    // שלום (base form שלומ on the board): ש2 + ל2 + ו1 + מ2 = 7
    expect(getBasePoints('שלומ')).toBe(7);
    expect(getBasePoints('שלום')).toBe(7); // sofit form folds the same
  });
});

describe('letterValues — vowel / rare classification', () => {
  it('treats Hebrew matres lectionis as vowels', () => {
    for (const v of ['א', 'ה', 'ו', 'י']) {
      expect(VOWELS.has(v)).toBe(true);
    }
    expect(VOWELS.has('A')).toBe(true);
    expect(VOWELS.has('ש')).toBe(false);
  });

  it('treats high-value Hebrew letters as rare', () => {
    expect(RARE_LETTERS.has('ז')).toBe(true); // 6 pts
    expect(RARE_LETTERS.has('ק')).toBe(true); // 6 pts
    expect(RARE_LETTERS.has('א')).toBe(false); // common
    expect(RARE_LETTERS.has('Q')).toBe(true); // English preserved
  });
});
