/**
 * Per-student differentiation: which tiers of a lesson a student practises.
 *
 * A teacher tags each word `support` / `core` / `challenge` (absent = core) and
 * each student carries ONE level on their membership row. The live board is
 * shared, so the level cannot change the grid — it changes which words the
 * student is asked to practise on their own, and what scaffolding they get.
 */
import { describe, it, expect } from 'vitest';
import { wordsForLevel, levelLabelKey, LEVEL_ORDER, isVocabularyLevel } from '../differentiation';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const words: VocabularyWord[] = [
  { word: 'cat', canIntegrate: true, level: 'support' },
  { word: 'river', canIntegrate: true }, // absent → core
  { word: 'planet', canIntegrate: true, level: 'core' },
  { word: 'ubiquitous', canIntegrate: false, level: 'challenge' },
];

describe('wordsForLevel', () => {
  it('support: keeps support + core (absent counts as core), drops challenge', () => {
    expect(wordsForLevel(words, 'support').map((w) => w.word)).toEqual(['cat', 'river', 'planet']);
  });

  it('core: same set as support — core is the default, support is scaffolding not a smaller list', () => {
    expect(wordsForLevel(words, 'core').map((w) => w.word)).toEqual(['cat', 'river', 'planet']);
  });

  it('challenge: everything, in original order', () => {
    expect(wordsForLevel(words, 'challenge').map((w) => w.word)).toEqual(['cat', 'river', 'planet', 'ubiquitous']);
  });

  it('treats an undefined/garbage level as core (never hides a whole lesson)', () => {
    expect(wordsForLevel(words, undefined).map((w) => w.word)).toEqual(['cat', 'river', 'planet']);
    expect(wordsForLevel(words, 'bogus' as never).map((w) => w.word)).toEqual(['cat', 'river', 'planet']);
  });

  it('never returns an empty list when the lesson has only challenge words — falls back to all', () => {
    const onlyChallenge: VocabularyWord[] = [{ word: 'ubiquitous', canIntegrate: true, level: 'challenge' }];
    expect(wordsForLevel(onlyChallenge, 'support')).toEqual(onlyChallenge);
  });

  it('returns the same reference for challenge / empty input (cheap, memo-friendly)', () => {
    expect(wordsForLevel(words, 'challenge')).toBe(words);
    const empty: VocabularyWord[] = [];
    expect(wordsForLevel(empty, 'support')).toBe(empty);
  });
});

describe('levelLabelKey', () => {
  it('maps each level to a teacher.levels.* i18n key', () => {
    expect(levelLabelKey('support')).toBe('teacher.levels.support');
    expect(levelLabelKey('core')).toBe('teacher.levels.core');
    expect(levelLabelKey('challenge')).toBe('teacher.levels.challenge');
  });
});

describe('LEVEL_ORDER / isVocabularyLevel', () => {
  it('orders support → core → challenge for segmented controls', () => {
    expect(LEVEL_ORDER).toEqual(['support', 'core', 'challenge']);
  });
  it('guards unknown strings', () => {
    expect(isVocabularyLevel('core')).toBe(true);
    expect(isVocabularyLevel('hard')).toBe(false);
    expect(isVocabularyLevel(null)).toBe(false);
  });
});
