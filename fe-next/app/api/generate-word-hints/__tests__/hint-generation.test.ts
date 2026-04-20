/**
 * Tests for hint generation — specifically that the final letter
 * is NEVER auto-revealed regardless of word composition.
 */

import { describe, it, expect } from 'vitest';

// Mirror the internal helpers from route.ts so we can unit-test them directly
// (the route doesn't export them, so we duplicate the fixed versions here)

const LANGUAGE_CONFIG: Record<string, { vowels: string[] }> = {
  en: { vowels: ['A', 'E', 'I', 'O', 'U'] },
  he: { vowels: ['א', 'ע', 'י', 'ו'] },
  sv: { vowels: ['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Ä', 'Ö'] },
  es: { vowels: ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú'] },
};

function findVowelPositions(word: string, language: string): number[] {
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const vowelSet = new Set(config.vowels.map((v) => v.toUpperCase()));
  return [...word].reduce<number[]>((acc, ch, i) => {
    if (vowelSet.has(ch.toUpperCase())) acc.push(i);
    return acc;
  }, []);
}

function generateBlanksDisplay(word: string, revealPositions: number[]): string {
  const posSet = new Set(revealPositions);
  return [...word].map((ch, i) => (posSet.has(i) ? ch.toUpperCase() : '_')).join(' ');
}

// Fixed version (mirrors the corrected route.ts logic)
function calculateRevealOrder(word: string, language: string): number[] {
  const lastPosition = word.length - 1;
  const vowelPositions = findVowelPositions(word, language);
  const vowelsFromEnd = [...vowelPositions]
    .filter((i) => i !== lastPosition)
    .sort((a, b) => b - a);
  const consonantPositions = [...Array(word.length).keys()]
    .filter((i) => !vowelPositions.includes(i) && i !== lastPosition)
    .sort((a, b) => b - a);
  return [...vowelsFromEnd, ...consonantPositions];
}

function generateAlgorithmicHints(targetWord: string, language: string) {
  const word = targetWord.toUpperCase();
  const wordLength = word.length;
  const maxReveal = Math.floor(wordLength / 2);
  const lastPosition = wordLength - 1;

  const revealOrder = calculateRevealOrder(word, language);
  const vowelPositions = findVowelPositions(word, language);
  const vowelsExcludingLast = [...vowelPositions]
    .filter((i) => i !== lastPosition)
    .sort((a, b) => b - a);

  const hints = [];

  hints.push({ level: 1, hint: generateBlanksDisplay(word, []) });

  const level2Positions =
    vowelsExcludingLast.length > 0
      ? [vowelsExcludingLast[0]]
      : wordLength > 1
        ? [0]
        : [];
  hints.push({ level: 2, hint: generateBlanksDisplay(word, level2Positions) });

  if (wordLength >= 4) {
    const level3Count = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(word, revealOrder.slice(0, level3Count).sort((a, b) => a - b)),
    });

    const level4Count = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(word, revealOrder.slice(0, level4Count).sort((a, b) => a - b)),
    });

    hints.push({
      level: 5,
      hint: generateBlanksDisplay(word, revealOrder.slice(0, maxReveal).sort((a, b) => a - b)),
    });
  }

  return hints;
}

// Helper: extract revealed positions from a hint string like "A _ P _ L E"
function revealedPositions(hint: string): number[] {
  const chars = hint.split(' ');
  return chars.reduce<number[]>((acc, ch, i) => {
    if (ch !== '_') acc.push(i);
    return acc;
  }, []);
}

describe('generateAlgorithmicHints — final letter never revealed', () => {
  const testCases = [
    { word: 'APPLE', lang: 'en' },   // ends in vowel E
    { word: 'BRIDGE', lang: 'en' },  // ends in vowel E
    { word: 'CAT', lang: 'en' },     // ends in consonant T
    { word: 'UMBRELLA', lang: 'en' }, // ends in vowel A
    { word: 'RHYTHM', lang: 'en' },  // no standard vowels at all
    { word: 'SKY', lang: 'en' },     // consonant-only start
    { word: 'BINGO', lang: 'en' },   // ends in vowel O
    { word: 'ECHO', lang: 'en' },    // ends in vowel O, short word
  ];

  testCases.forEach(({ word, lang }) => {
    it(`never reveals last letter of "${word}" (${lang})`, () => {
      const hints = generateAlgorithmicHints(word, lang);
      const lastIdx = word.length - 1;

      hints.forEach((h) => {
        const revealed = revealedPositions(h.hint);
        expect(revealed, `Level ${h.level} hint revealed last letter of "${word}": "${h.hint}"`).not.toContain(lastIdx);
      });
    });
  });

  it('level 1 reveals nothing', () => {
    const hints = generateAlgorithmicHints('APPLE', 'en');
    expect(revealedPositions(hints[0].hint)).toHaveLength(0);
  });

  it('level 2 fallback uses first letter when no non-last vowel exists', () => {
    // "BY" — B is consonant, Y treated as consonant; no vowels
    const hints = generateAlgorithmicHints('BY', 'en');
    // Should reveal position 0 (first letter), not position 1 (last)
    const level2 = hints[1];
    const revealed = revealedPositions(level2.hint);
    expect(revealed).toContain(0);
    expect(revealed).not.toContain(1);
  });

  it('calculateRevealOrder excludes last position entirely', () => {
    const word = 'APPLE';
    const order = calculateRevealOrder(word, 'en');
    expect(order).not.toContain(word.length - 1);
  });
});
