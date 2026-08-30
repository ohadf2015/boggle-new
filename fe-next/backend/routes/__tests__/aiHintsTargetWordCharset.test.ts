/**
 * Guard: the hint-request schema must accept every language its own `language`
 * enum advertises.
 *
 * Sentry `[HintGenerator] API error: 400 … Invalid string: must match pattern`
 * on `/ru/daily/word-hunt`: the enum accepts 'ru', but the targetWord pattern
 * listed Latin + Hebrew + Kana + CJK + Latin-1 Supplement and no Cyrillic, so
 * every Russian hint request 400'd.
 */
import { describe, it, expect } from 'vitest';
import { generateHintsSchema } from '../aiHintsCore';

const SAMPLES: Array<[string, string]> = [
  ['en', 'PUZZLE'],
  ['he', 'מילון'],
  ['ru', 'СЛОВО'],
  ['ja', 'ことば'],
  ['es', 'MAÑANA'],
  ['sv', 'SPRÅK'],
  ['fr', 'ÉCOLE'],
  ['de', 'STRAßE'],
];

describe('generateHintsSchema targetWord charset', () => {
  it.each(SAMPLES)('accepts a %s target word', (language, targetWord) => {
    expect(generateHintsSchema.safeParse({ targetWord, language }).success).toBe(true);
  });

  it('still rejects digits, whitespace and punctuation', () => {
    for (const targetWord of ['WORD1', 'TWO WORDS', 'semi;colon']) {
      expect(generateHintsSchema.safeParse({ targetWord, language: 'en' }).success).toBe(false);
    }
  });
});
