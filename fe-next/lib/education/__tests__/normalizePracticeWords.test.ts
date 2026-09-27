import { describe, it, expect } from 'vitest';
import {
  normalizePracticeWords,
  wordsReadyForDrill,
} from '../normalizePracticeWords';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({
  word,
  canIntegrate: true,
  ...extra,
});

describe('normalizePracticeWords', () => {
  it('trims whitespace, drops empty entries, and case-insensitive-dedupes', () => {
    const words = [
      w('  Apple  ', { definition: 'fruit' }),
      w('apple', { definition: 'duplicate' }),
      w('   '),
      w('', { definition: 'ghost' }),
      w('Pear', { definition: 'also fruit' }),
    ];

    const result = normalizePracticeWords(words);

    expect(result.map((entry) => entry.word)).toEqual(['Apple', 'Pear']);
    expect(result[0].definition).toBe('fruit');
  });

  it('keeps the first spelling when two words differ only by case', () => {
    expect(normalizePracticeWords([w('CAT'), w('cat')]).map((entry) => entry.word)).toEqual(['CAT']);
  });
});

describe('wordsReadyForDrill', () => {
  it('keeps only words that have a non-empty definition when that field is required', () => {
    const words = [
      w('apple', { definition: 'a fruit' }),
      w('blank'),
      w('spaces', { definition: '   ' }),
      w('car', { definition: 'a vehicle' }),
    ];

    expect(wordsReadyForDrill(words, 'definition').map((entry) => entry.word)).toEqual([
      'apple',
      'car',
    ]);
  });

  it('keeps only words that have a non-empty example when that field is required', () => {
    const words = [
      w('happy', { example: 'I feel ___ today.' }),
      w('sad'),
      w('glad', { example: '  ' }),
    ];

    expect(wordsReadyForDrill(words, 'example').map((entry) => entry.word)).toEqual(['happy']);
  });
});
