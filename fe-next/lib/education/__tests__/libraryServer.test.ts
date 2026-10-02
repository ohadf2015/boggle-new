import { describe, it, expect } from 'vitest';
import { moderateForPublish, publicRowsToItems, curriculumRowsToItems } from '../libraryServer';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  teacher_id: 't1',
  name: 'Fruits',
  description: null,
  language: 'en',
  words: [{ word: 'apple', canIntegrate: true }, { word: 'kiwi', canIntegrate: true }],
  author_name: 'Ms Fisher',
  grade_band: 'g35',
  topic: 'science',
  published_at: '2026-10-01T00:00:00Z',
  created_at: '2026-09-30T00:00:00Z',
  remixed_from_title: null,
  remixed_from_author: null,
  vocabulary_lesson_stats: { copy_count: 4, play_count: 9 },
  ...over,
});

describe('moderateForPublish', () => {
  it('passes a clean list', () => {
    expect(moderateForPublish({ name: 'Fruits', description: 'Yum', words: [{ word: 'apple' }] })).toEqual([]);
  });

  it('catches English profanity the multilingual blocklist misses', () => {
    expect(moderateForPublish({ name: 'Fruits', description: 'what a bastard', words: [{ word: 'apple' }] })).toEqual([
      'description',
    ]);
  });

  it('catches a blocked non-English word', () => {
    expect(moderateForPublish({ name: 'Lista', description: null, words: [{ word: 'mierda' }] })).toEqual(['words']);
  });
});

describe('publicRowsToItems', () => {
  it('maps a public row to a teacher-made library item with counts and credit', () => {
    const [item] = publicRowsToItems([row()], new Set(), 't9');
    expect(item).toMatchObject({
      id: 'l1',
      source: 'teacher',
      name: 'Fruits',
      wordCount: 2,
      authorName: 'Ms Fisher',
      gradeBand: 'g35',
      topic: 'science',
      copyCount: 4,
      playCount: 9,
      isMine: false,
    });
  });

  it('drops flagged lists, profane lists and empty lists', () => {
    const items = publicRowsToItems(
      [row({ id: 'flagged' }), row({ id: 'bad', name: 'shit' }), row({ id: 'empty', words: [] }), row({ id: 'ok' })],
      new Set(['flagged']),
      null,
    );
    expect(items.map((i) => i.id)).toEqual(['ok']);
  });

  it('hides counts when the stats table is absent and marks my own list', () => {
    const [item] = publicRowsToItems([row({ vocabulary_lesson_stats: undefined })], new Set(), 't1');
    expect(item.copyCount).toBeNull();
    expect(item.playCount).toBeNull();
    expect(item.isMine).toBe(true);
  });

  it('reads stats when PostgREST returns them as an array', () => {
    const [item] = publicRowsToItems([row({ vocabulary_lesson_stats: [{ copy_count: 1, play_count: 2 }] })], new Set(), null);
    expect(item.copyCount).toBe(1);
  });
});

describe('curriculumRowsToItems', () => {
  it('maps curriculum lists to verified items with a grade band and topic', () => {
    const [item] = curriculumRowsToItems([
      { id: 'c1', name: 'Grade 4 science', description: 'x', language: 'en', grade_level: 'grade_4', subject: 'science', words: [{ word: 'cell' }], word_count: 1 },
    ]);
    expect(item).toMatchObject({ id: 'curriculum:c1', source: 'verified', gradeBand: 'g35', topic: 'science', wordCount: 1, authorName: null });
  });

  it('keeps the example, level and practice fields so a copied list can drive context and tiered practice', () => {
    const [item] = curriculumRowsToItems([
      {
        id: 'c2', name: 'Weather', description: null, language: 'en', grade_level: 'grade_3', subject: 'science', word_count: 1,
        words: [{ word: 'storm', definition: 'Strong wind with rain or snow', example: 'The storm knocked down a tree.', level: 'challenge', synonyms: ['tempest'], antonyms: [], canIntegrate: true }],
      },
    ]);
    expect(item.words[0]).toEqual({
      word: 'storm',
      canIntegrate: true,
      definition: 'Strong wind with rain or snow',
      example: 'The storm knocked down a tree.',
      level: 'challenge',
      synonyms: ['tempest'],
    });
  });

  it('drops an unknown level instead of passing junk into differentiation', () => {
    const [item] = curriculumRowsToItems([
      { id: 'c3', name: 'x', description: null, language: 'en', grade_level: 'grade_3', subject: 'general', words: [{ word: 'cat', level: 'expert' } as never] },
    ]);
    expect(item.words[0]).toEqual({ word: 'cat', canIntegrate: true });
  });
});
