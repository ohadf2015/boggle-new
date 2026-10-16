import { describe, it, expect } from 'vitest';
import {
  playableLessonWords,
  lessonWordCount,
  sortLessonsForClass,
  boardLanguageOf,
  toggleLessonInOneLanguage,
  activeLanguageOf,
} from '../lessonPickerModel';

const L = (id: string, language: string | undefined, words: string[] = ['cat']) => ({
  id,
  name: id,
  language,
  words: words.map((word) => ({ word })),
});

describe('playableLessonWords', () => {
  it('Given lessons with blanks and duplicates, Then it returns every unique non-blank word', () => {
    const words = playableLessonWords([L('a', 'en', ['cat', ' ', 'dog']), L('b', 'en', ['dog', 'photosynthesis'])]);
    expect(words).toEqual(['cat', 'dog', 'photosynthesis']);
  });

  it('Given a lesson without words, Then it returns nothing', () => {
    expect(playableLessonWords([{ id: 'x', name: 'x', words: undefined as never }])).toEqual([]);
  });

  it('counts one lesson the same way the lobby counts a selection', () => {
    expect(lessonWordCount(L('a', 'en', ['cat', 'cat', 'osmosis', '']))).toBe(2);
  });
});

describe('sortLessonsForClass', () => {
  it('Given a class language, Then that language comes first and order within a language is kept', () => {
    const sorted = sortLessonsForClass([L('he1', 'he'), L('en1', 'en'), L('he2', 'he'), L('en2', 'en')], 'en');
    expect(sorted.map((l) => l.id)).toEqual(['en1', 'en2', 'he1', 'he2']);
  });

  it('Given no class language, Then the original order is kept', () => {
    const sorted = sortLessonsForClass([L('he1', 'he'), L('en1', 'en')], undefined);
    expect(sorted.map((l) => l.id)).toEqual(['he1', 'en1']);
  });
});

describe('boardLanguageOf', () => {
  it('Given nothing selected, Then there is no board language', () => {
    expect(boardLanguageOf([])).toEqual({ language: null, mixed: false });
  });

  it('Given one language, Then that is the board language and it is not mixed', () => {
    expect(boardLanguageOf([L('a', 'he'), L('b', 'he')])).toEqual({ language: 'he', mixed: false });
  });

  it('Given mixed languages, Then the first list wins, the same rule launch uses', () => {
    expect(boardLanguageOf([L('a', 'he'), L('b', 'en')])).toEqual({ language: 'he', mixed: true });
  });
});

describe('toggleLessonInOneLanguage', () => {
  const lessons = [L('en1', 'en'), L('en2', 'en'), L('he1', 'he')];

  it('Given a same-language pick, Then it is added', () => {
    expect(toggleLessonInOneLanguage(lessons, ['en1'], 'en2')).toEqual({ ids: ['en1', 'en2'], switchedTo: null });
  });

  it('Given a selected lesson, Then it is removed', () => {
    expect(toggleLessonInOneLanguage(lessons, ['en1', 'en2'], 'en1')).toEqual({ ids: ['en2'], switchedTo: null });
  });

  it('Given a pick in another language, Then the selection switches to that lesson alone', () => {
    expect(toggleLessonInOneLanguage(lessons, ['en1', 'en2'], 'he1')).toEqual({ ids: ['he1'], switchedTo: 'he' });
  });

  it('Given lessons without a language (old rows), Then they mix freely', () => {
    const legacy = [L('a', undefined), L('b', undefined)];
    expect(toggleLessonInOneLanguage(legacy, ['a'], 'b')).toEqual({ ids: ['a', 'b'], switchedTo: null });
  });
});

describe('activeLanguageOf', () => {
  const lessons = [L('he1', 'he'), L('en1', 'en')];

  it('prefers the selection, then the class, then the first lesson', () => {
    expect(activeLanguageOf(lessons, ['en1'], 'he')).toBe('en');
    expect(activeLanguageOf(lessons, [], 'en')).toBe('en');
    expect(activeLanguageOf(lessons, [], 'ja')).toBe('he');
    expect(activeLanguageOf(lessons, [], undefined)).toBe('he');
  });
});
