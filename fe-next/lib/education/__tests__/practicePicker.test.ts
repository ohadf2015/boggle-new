/**
 * practicePicker — the pure model behind the student's "one word list, many
 * games" tile grid. Every practice type the lesson can drive, each with a
 * readiness flag and a count the student can trust before tapping.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { buildFocusQuestions, VOCAB_FOCUSES } from '../vocabFocus';
import {
  buildPracticeTiles,
  readyTiles,
  BASE_PRACTICE_MODES,
  PICKER_SEED,
} from '../practicePicker';

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({
  word,
  canIntegrate: true,
  ...extra,
});

const richLesson: VocabularyWord[] = [
  w('happy', {
    definition: 'feeling joy',
    synonyms: ['glad'],
    antonyms: ['sad'],
    example: 'The ___ dog wagged its tail.',
    meanings: ['feeling joy', 'pleased with something'],
    morphology: { suffix: 'y' },
  }),
  w('brave', {
    definition: 'not afraid',
    synonyms: ['bold'],
    antonyms: ['cowardly'],
    example: 'The ___ knight faced the dragon.',
    meanings: ['not afraid', 'to face something hard'],
    morphology: { root: 'brav', rootMeaning: 'wild' },
  }),
  w('quick', {
    definition: 'moving fast',
    synonyms: ['fast'],
    antonyms: ['slow'],
    example: 'A ___ rabbit ran by.',
    meanings: ['moving fast', 'alive, in old stories'],
    morphology: { root: 'quic', rootMeaning: 'alive' },
  }),
  w('tiny', {
    definition: 'very small',
    synonyms: ['little'],
    antonyms: ['huge'],
    example: 'A ___ ant crawled up.',
    meanings: ['very small', 'not important'],
    morphology: { suffix: 'y' },
  }),
];

describe('buildPracticeTiles', () => {
  it('offers one tile per base practice mode plus one per vocabulary skill', () => {
    const tiles = buildPracticeTiles(richLesson, { language: 'en' });
    expect(tiles).toHaveLength(BASE_PRACTICE_MODES.length + VOCAB_FOCUSES.length);
    expect(new Set(tiles.map((t) => t.id)).size).toBe(tiles.length);
  });

  it('names the skill each tile drills', () => {
    const tiles = buildPracticeTiles(richLesson, { language: 'en' });
    for (const tile of tiles) {
      expect(tile.titleKey).toMatch(/^education\./);
      expect(tile.skillKey).toMatch(/^education\.practicePicker\.skill\./);
    }
  });

  it('reports vocabulary-skill counts straight from the question builder', () => {
    const tiles = buildPracticeTiles(richLesson, { language: 'en' });
    for (const focus of VOCAB_FOCUSES) {
      const tile = tiles.find((t) => t.focus === focus)!;
      const built = buildFocusQuestions(richLesson, focus, { seed: PICKER_SEED, language: 'en' });
      expect(tile.countKind).toBe('questions');
      expect(tile.count).toBe(built.length);
      expect(tile.ready).toBe(built.length > 0);
    }
  });

  it('locks a skill the lesson has no data for and says what to add', () => {
    const bare = [w('a'), w('b'), w('c'), w('d')];
    const tiles = buildPracticeTiles(bare, { language: 'en' });
    const synonym = tiles.find((t) => t.focus === 'synonym')!;
    expect(synonym.ready).toBe(false);
    expect(synonym.count).toBe(0);
    expect(synonym.lockedKey).toBe('education.vocabFocus.unlock.synonym');
  });

  it('counts words for the board / drill modes and keeps them ready', () => {
    const tiles = buildPracticeTiles(richLesson, { language: 'en' });
    const board = tiles.find((t) => t.id === 'solo_board')!;
    expect(board.countKind).toBe('words');
    expect(board.count).toBe(richLesson.length);
    expect(board.ready).toBe(true);
    expect(board.focus).toBeUndefined();
  });

  it('locks every tile for an empty lesson', () => {
    const tiles = buildPracticeTiles([], { language: 'en' });
    expect(tiles.every((t) => t.ready === false)).toBe(true);
    expect(readyTiles(tiles)).toEqual([]);
  });

  it('locks matching until there are enough words to pair up', () => {
    const three = [w('a', { definition: 'x' }), w('b', { definition: 'y' }), w('c', { definition: 'z' })];
    const matching = buildPracticeTiles(three, { language: 'en' }).find((t) => t.id === 'matching')!;
    expect(matching.ready).toBe(false);
    expect(matching.lockedKey).toBe('education.practicePicker.locked.matching');
  });

  it('is deterministic — the same lesson yields the same tiles', () => {
    expect(buildPracticeTiles(richLesson, { language: 'en' })).toEqual(
      buildPracticeTiles(richLesson, { language: 'en' })
    );
  });

  it('carries the student’s finished-session count onto each game tile', () => {
    const tiles = buildPracticeTiles(richLesson, {
      language: 'en',
      sessions: {
        flashcard_sessions: 3,
        solo_board_sessions: 1,
        warmup_sessions: 0,
        word_list_views: 7,
        matching_sessions: 2,
        spelling_sessions: 0,
        blitz_sessions: 5,
      },
    });
    expect(tiles.find((t) => t.id === 'flashcard')!.sessions).toBe(3);
    expect(tiles.find((t) => t.id === 'word_list')!.sessions).toBe(7);
    expect(tiles.find((t) => t.id === 'blitz')!.sessions).toBe(5);
    expect(tiles.find((t) => t.id === 'warmup')!.sessions).toBe(0);
    // Targeted vocabulary sessions are not counted per skill anywhere yet
    expect(tiles.find((t) => t.focus === 'definition')!.sessions).toBe(0);
  });

  it('reports zero sessions when no progress row exists', () => {
    for (const tile of buildPracticeTiles(richLesson, { language: 'en', sessions: null })) {
      expect(tile.sessions).toBe(0);
    }
  });

  it('readyTiles keeps picker order', () => {
    const tiles = buildPracticeTiles(richLesson, { language: 'en' });
    const ready = readyTiles(tiles);
    expect(ready.map((t) => t.id)).toEqual(tiles.filter((t) => t.ready).map((t) => t.id));
  });
});
