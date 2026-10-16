import { describe, it, expect } from 'vitest';
import { boardSeedWord } from '../wordNormalization';
import { buildLessonVocabulary } from '@/backend/utils/lessonVocabulary';
import type { Language } from '@/shared/types';

const COMBINING_MARK = /\p{M}/u;

describe('boardSeedWord', () => {
  it('GIVEN a vowelled Hebrew lesson word WHEN seeding a board THEN only base letters remain, finals folded', () => {
    expect(boardSeedWord('לֶחֶם', 'he')).toBe('לחמ');
    expect(boardSeedWord('תַּפּוּחַ', 'he')).toBe('תפוח');
  });

  it('GIVEN cantillation, shin dots and a presentation-form letter WHEN seeding THEN no mark survives', () => {
    const seeded = boardSeedWord('שָׁלוֹם֑ שׁמש', 'he');
    expect(COMBINING_MARK.test(seeded)).toBe(false);
    expect([...seeded].every((ch) => /[א-ת]/.test(ch))).toBe(true);
  });

  it('GIVEN decomposed accents WHEN seeding Spanish/Swedish THEN letters are composed, never a lone mark', () => {
    expect(boardSeedWord('jardín', 'es')).toBe('JARDÍN');
    expect(boardSeedWord('trädgård', 'sv')).toBe('TRÄDGÅRD');
  });

  it('GIVEN decomposed kana WHEN seeding Japanese THEN the voiced kana is one tile', () => {
    expect([...boardSeedWord('がき', 'ja')]).toEqual(['が', 'き']);
  });

  it('GIVEN Russian ё WHEN seeding THEN it folds to the Е tile the board deals', () => {
    expect(boardSeedWord('ёж', 'ru')).toBe('ЕЖ');
  });

  it('GIVEN any lesson word WHEN seeded THEN it keys to the same lesson-vocabulary entry as the raw word', () => {
    const cases: Array<[string, Language]> = [['לֶחֶם', 'he'], ['jardín', 'es'], ['ёж', 'ru'], ['がき', 'ja'], ['Water', 'en']];
    for (const [raw, lang] of cases) {
      expect([...buildLessonVocabulary([boardSeedWord(raw, lang)], lang)]).toEqual([...buildLessonVocabulary([raw], lang)]);
    }
  });
});
