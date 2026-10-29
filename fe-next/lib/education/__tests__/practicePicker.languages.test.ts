import { describe, it, expect } from 'vitest';
import { buildPracticeTiles, byGameFeel, warmupTile, WORD_TOWER_TILE_ID } from '../practicePicker';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const lesson = (words: string[]): VocabularyWord[] =>
  words.map((word, i) => ({ word, definition: `meaning ${i + 1}` }) as VocabularyWord);

const SAMPLES = {
  en: ['garden', 'planet', 'river', 'forest', 'castle', 'window'],
  he: ['שולחן', 'מחברת', 'חלון', 'מדבר', 'עיפרון', 'ספרים'],
  sv: ['trädgård', 'skola', 'björn', 'äpple', 'hjärta', 'fjäril'],
  ja: ['さくら', 'ともだち', 'がっこう', 'くるま', 'たまご', 'ひまわり'],
  es: ['niño', 'jardín', 'montaña', 'canción', 'árbol', 'señora'],
  ru: ['кошка', 'собака', 'школа', 'книга', 'окно', 'берёза'],
} as const;

describe('practice tiles per lesson language', () => {
  for (const [language, words] of Object.entries(SAMPLES)) {
    it(`${language}: every base drill is playable from a real-script list`, () => {
      const tiles = buildPracticeTiles(lesson([...words]), { language });
      for (const id of ['solo_board', 'warmup', 'blitz', 'matching', 'spelling', 'flashcard', 'word_list']) {
        expect(tiles.find((t) => t.id === id)?.ready, id).toBe(true);
      }
    });
  }

  for (const language of ['en', 'he', 'sv', 'es', 'ja', 'ru']) {
    it(`${language}: Word Tower is offered (its wheel has letters and a dictionary)`, () => {
      expect(buildPracticeTiles(lesson([...SAMPLES[language as keyof typeof SAMPLES]]), { language }).some((t) => t.id === WORD_TOWER_TILE_ID)).toBe(true);
    });
  }

  it('ru: Word Tower is ready on a real Cyrillic list', () => {
    const tower = buildPracticeTiles(lesson([...SAMPLES.ru]), { language: 'ru' }).find((t) => t.id === WORD_TOWER_TILE_ID);
    expect(tower?.ready).toBe(true);
    expect(tower?.count).toBe(SAMPLES.ru.length);
  });

  it('fr: Word Tower stays hidden, not shown locked with advice the teacher cannot follow', () => {
    const tiles = buildPracticeTiles(lesson([...SAMPLES.en]), { language: 'fr' });
    expect(tiles.some((t) => t.id === WORD_TOWER_TILE_ID)).toBe(false);
  });
});

describe('game-feel order for the warm-up', () => {
  it('puts the most game-like tiles first and keeps every tile', () => {
    const tiles = buildPracticeTiles(lesson([...SAMPLES.en]), { language: 'en' });
    const ordered = byGameFeel(tiles);
    expect(ordered.slice(0, 3).map((t) => t.id)).toEqual(['blitz', WORD_TOWER_TILE_ID, 'matching']);
    expect(ordered).toHaveLength(tiles.length);
  });

  it('the warm-up tile is the most game-like READY tile', () => {
    const tiles = buildPracticeTiles(lesson([...SAMPLES.ru]), { language: 'ru' });
    expect(warmupTile(tiles)?.id).toBe('blitz');
    const noMeanings = buildPracticeTiles([{ word: 'garden' } as VocabularyWord], { language: 'en' });
    expect(warmupTile(noMeanings)?.id).toBe('solo_board');
    expect(warmupTile([])).toBeNull();
  });
});
