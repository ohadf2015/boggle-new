import { describe, expect, it } from 'vitest';
import {
  isAllowedTileSet,
  normalizeHebrewFinalForms,
  validateWordConstraint,
} from '../engine/wordConstraintEngine';
import {
  isAnagramOf,
  isRiddleSolved,
  judgeCipherAttempt,
  sortedLetters,
} from '../engine/cipherEngine';
import {
  correctPrefixLength,
  isCorrectOrder,
} from '../engine/logicSequenceEngine';
import type {
  CipherRiddle,
  LogicSequenceRiddle,
  WordConstraintRiddle,
} from '../types';

const wcRiddle: WordConstraintRiddle = {
  engine: 'word-constraint',
  tiles: [
    { id: 't1', letter: 'א' },
    { id: 't2', letter: 'ש' },
  ],
  minLength: 2,
  targetWords: ['אש'],
};

describe('wordConstraintEngine', () => {
  it('normalizes HE final forms', () => {
    expect(normalizeHebrewFinalForms('שלום')).toBe('שלומ');
    expect(normalizeHebrewFinalForms('מים')).toBe('מימ');
    expect(normalizeHebrewFinalForms('אש')).toBe('אש');
  });

  it('validates correct target word', () => {
    const r = validateWordConstraint('אש', wcRiddle);
    expect(r.ok).toBe(true);
  });

  it('rejects too-short candidates', () => {
    const r = validateWordConstraint('א', wcRiddle);
    expect(r.ok).toBe(false);
  });

  it('rejects words not in target list', () => {
    const r = validateWordConstraint('שא', wcRiddle);
    expect(r.ok).toBe(false);
  });

  it('treats final-form variants as equivalent', () => {
    const r: WordConstraintRiddle = {
      engine: 'word-constraint',
      tiles: [
        { id: 'm', letter: 'מ' },
        { id: 'i', letter: 'י' },
        { id: 'mf', letter: 'ם' },
      ],
      minLength: 3,
      targetWords: ['מים'],
    };
    expect(validateWordConstraint('מים', r).ok).toBe(true);
    expect(validateWordConstraint('מימ', r).ok).toBe(true);
  });

  it('checks tile pool budget', () => {
    expect(isAllowedTileSet('אש', wcRiddle)).toBe(true);
    expect(isAllowedTileSet('אא', wcRiddle)).toBe(false);
    expect(isAllowedTileSet('אשש', wcRiddle)).toBe(false);
  });
});

const cipher: CipherRiddle = {
  engine: 'cipher',
  jars: [
    { id: 'j-sugar', scrambled: 'רכוס', answer: 'סוכר' },
    { id: 'j-flour', scrambled: 'חמק', answer: 'קמח' },
    { id: 'j-red', scrambled: 'חתפ', answer: 'פתח', isRedHerring: true },
  ],
};

describe('cipherEngine', () => {
  it('sortedLetters is order-invariant', () => {
    expect(sortedLetters('רכוס')).toBe(sortedLetters('סוכר'));
  });

  it('isAnagramOf detects valid anagrams', () => {
    expect(isAnagramOf('סוכר', 'רכוס')).toBe(true);
    expect(isAnagramOf('שלום', 'רכוס')).toBe(false);
  });

  it('judgeCipherAttempt accepts the right answer', () => {
    const result = judgeCipherAttempt(cipher.jars[0], 'סוכר');
    expect(result.ok).toBe(true);
  });

  it('judgeCipherAttempt rejects red herring', () => {
    const result = judgeCipherAttempt(cipher.jars[2], 'פתח');
    if (result.ok) throw new Error('expected red-herring rejection');
    expect(result.reason).toBe('red-herring');
  });

  it('judgeCipherAttempt distinguishes wrong-word (valid anagram, wrong target) from no-match', () => {
    // bread jar: scrambled='חמל', answer='לחם'. 'מלח' (salt) is also a valid anagram of those letters.
    const breadJar = { id: 'j-bread', scrambled: 'חמל', answer: 'לחם' };
    const valid = judgeCipherAttempt(breadJar, 'מלח');
    if (valid.ok) throw new Error('expected reject');
    expect(valid.reason).toBe('wrong-word');
    const garbage = judgeCipherAttempt(breadJar, 'אבג');
    if (garbage.ok) throw new Error('expected reject');
    expect(garbage.reason).toBe('no-match');
  });

  it('isRiddleSolved requires all non-herring jars', () => {
    const set1 = new Set(['j-sugar']);
    expect(isRiddleSolved(cipher, set1)).toBe(false);
    const set2 = new Set(['j-sugar', 'j-flour']);
    expect(isRiddleSolved(cipher, set2)).toBe(true);
  });
});

const logic: LogicSequenceRiddle = {
  engine: 'logic-sequence',
  steps: [
    { id: 'a', label: { he: 'מרתיחים' } },
    { id: 'b', label: { he: 'לשים' } },
    { id: 'c', label: { he: 'אופים' } },
  ],
  correctOrder: ['a', 'b', 'c'],
  hintRhyme: { he: '' },
};

describe('logicSequenceEngine', () => {
  it('isCorrectOrder accepts the exact sequence', () => {
    expect(isCorrectOrder(logic, ['a', 'b', 'c'])).toBe(true);
  });

  it('isCorrectOrder rejects wrong order', () => {
    expect(isCorrectOrder(logic, ['a', 'c', 'b'])).toBe(false);
    expect(isCorrectOrder(logic, ['a', 'b'])).toBe(false);
  });

  it('correctPrefixLength counts leading correct picks', () => {
    expect(correctPrefixLength(logic, ['a', 'b', 'x'])).toBe(2);
    expect(correctPrefixLength(logic, ['x', 'a', 'b'])).toBe(0);
    expect(correctPrefixLength(logic, ['a', 'b', 'c'])).toBe(3);
  });
});
