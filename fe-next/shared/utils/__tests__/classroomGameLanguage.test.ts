import { describe, it, expect } from 'vitest';
import { resolveClassroomGameLanguage, wordsMatchLanguage, embeddableLessonWords } from '../classroomGameLanguage';

const COMMON_ENGLISH = ['house', 'water', 'garden', 'bridge'];
const HEBREW = ['שולחן', 'מחברת', 'ספר'];
const RUSSIAN = ['дом', 'вода', 'сад'];
const JAPANESE = ['いぬ', 'ねこ', 'さくら'];
const SWEDISH = ['hus', 'vatten', 'trädgård'];
const SPANISH = ['casa', 'agua', 'jardín'];

describe('resolveClassroomGameLanguage', () => {
  it('GIVEN an English lesson in a Hebrew class WHEN the room is created THEN the round is played in English', () => {
    expect(resolveClassroomGameLanguage({ lessonLanguage: 'en', classroomLanguage: 'he', vocabularyWords: COMMON_ENGLISH })).toBe('en');
  });

  it('GIVEN a Hebrew lesson and an English UI WHEN the room is created THEN the round is played in Hebrew', () => {
    expect(resolveClassroomGameLanguage({ lessonLanguage: 'he', classroomLanguage: 'he', vocabularyWords: HEBREW })).toBe('he');
  });

  it('GIVEN no lesson WHEN the room is created THEN the class language decides, never the teacher UI', () => {
    expect(resolveClassroomGameLanguage({ classroomLanguage: 'he', vocabularyWords: [] })).toBe('he');
    expect(resolveClassroomGameLanguage({ classroomLanguage: 'ru' })).toBe('ru');
  });

  it('GIVEN nothing known WHEN the room is created THEN it falls back to English', () => {
    expect(resolveClassroomGameLanguage({})).toBe('en');
    expect(resolveClassroomGameLanguage({ classroomLanguage: 'klingon' })).toBe('en');
  });

  it.each([
    ['he', HEBREW],
    ['ru', RUSSIAN],
    ['ja', JAPANESE],
    ['en', COMMON_ENGLISH],
  ])('GIVEN %s words mislabeled as another language WHEN resolved THEN the words script wins so they stay findable and valid', (expected, words) => {
    const wrong = expected === 'en' ? 'he' : 'en';
    expect(resolveClassroomGameLanguage({ lessonLanguage: wrong, classroomLanguage: wrong, vocabularyWords: words })).toBe(expected);
  });

  it('GIVEN Latin-script words in a Swedish or Spanish lesson WHEN resolved THEN the lesson language is kept', () => {
    expect(resolveClassroomGameLanguage({ lessonLanguage: 'sv', classroomLanguage: 'he', vocabularyWords: SWEDISH })).toBe('sv');
    expect(resolveClassroomGameLanguage({ lessonLanguage: 'es', classroomLanguage: 'en', vocabularyWords: SPANISH })).toBe('es');
  });

  it('GIVEN Latin words in a Hebrew lesson of a Spanish class WHEN resolved THEN the Latin-script class language is used', () => {
    expect(resolveClassroomGameLanguage({ lessonLanguage: 'he', classroomLanguage: 'es', vocabularyWords: SPANISH })).toBe('es');
  });
});

describe('wordsMatchLanguage', () => {
  it('GIVEN a word in the board alphabet THEN it matches; GIVEN another script THEN it does not', () => {
    expect(wordsMatchLanguage('GARDEN', 'en')).toBe(true);
    expect(wordsMatchLanguage('GARDEN', 'he')).toBe(false);
    expect(wordsMatchLanguage('שולחן', 'he')).toBe(true);
    expect(wordsMatchLanguage('שולחן', 'en')).toBe(false);
    expect(wordsMatchLanguage('ДОМ', 'ru')).toBe(true);
    expect(wordsMatchLanguage('TRÄDGÅRD', 'sv')).toBe(true);
    expect(wordsMatchLanguage('JARDÍN', 'es')).toBe(true);
    expect(wordsMatchLanguage('ねこ', 'ja')).toBe(true);
  });
});

describe('embeddableLessonWords', () => {
  it('GIVEN English lesson words on a Hebrew board WHEN picking words to plant THEN none are planted', () => {
    expect(embeddableLessonWords(['garden', 'bridge'], 'he')).toEqual([]);
  });

  it('GIVEN a mixed list WHEN picking for an English board THEN only the English words are planted, upper-cased', () => {
    expect(embeddableLessonWords(['garden', 'שולחן', 'bridge'], 'en')).toEqual(['GARDEN', 'BRIDGE']);
  });
});
