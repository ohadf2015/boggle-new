import { describe, it, expect } from 'vitest';
import { wordcraftBlockReason } from '../wordcraftPlayable';

const LISTS: Record<string, { words: string[]; reason: null | 'language' }> = {
  en: { words: ['cat', 'star', 'river'], reason: null },
  he: { words: ['שלום', 'ספר', 'בית'], reason: null },
  es: { words: ['gato', 'canción', 'árbol'], reason: null },
  sv: { words: ['katt', 'hus', 'båt'], reason: null },
  ja: { words: ['ねこ', 'いぬ', 'さくら'], reason: null },
  ru: { words: ['кот', 'дом', 'лес'], reason: 'language' },
};

describe('wordcraftBlockReason: why the Wordcraft card is off, per lesson language', () => {
  for (const [language, { words, reason }] of Object.entries(LISTS)) {
    it(`Given a short ${language} list, Then the reason is ${reason ?? 'none'}`, () => {
      expect(wordcraftBlockReason(words, { lessonLanguage: language })).toBe(reason);
    });
  }

  it('Given an English list whose every word is longer than the rack, Then the reason is the rack, not the language', () => {
    expect(wordcraftBlockReason(['photosynthesis', 'extraordinary'], { lessonLanguage: 'en' })).toBe('rack');
  });

  it('Given a Japanese list written only in kanji, Then it is blocked by the rack (kana tiles cannot spell kanji)', () => {
    expect(wordcraftBlockReason(['猫', '学校'], { lessonLanguage: 'ja' })).not.toBeNull();
  });

  it('Given a Russian class with no lesson language, Then the class language decides and it is blocked by language', () => {
    expect(wordcraftBlockReason(['кот'], { classroomLanguage: 'ru' })).toBe('language');
  });

  it('Given an empty list, Then it is blocked by the rack (nothing to deal), never by language', () => {
    expect(wordcraftBlockReason([], { lessonLanguage: 'en' })).toBe('rack');
  });
});
