/**
 * The Word Tower tile in the student practice picker.
 *
 * Word Tower is the "many games" half of "one word list, many games": the same
 * lesson list becomes the letters on a Word Tower wheel. It is the one tile
 * whose readiness depends on the SHAPE of the words (length, letter overlap,
 * language) rather than just how many there are, so it gets its own coverage.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { buildPracticeTiles, WORD_TOWER_TILE_ID } from '../practicePicker';

const w = (word: string): VocabularyWord => ({ word, canIntegrate: true });

const tileOf = (words: VocabularyWord[], language = 'en') =>
  buildPracticeTiles(words, { language }).find((tile) => tile.id === WORD_TOWER_TILE_ID);

const IGHT_LESSON = ['light', 'night', 'sight', 'bright'].map(w);

describe('word tower practice tile', () => {
  it('is on the board for an English lesson with enough seedable words', () => {
    const tile = tileOf(IGHT_LESSON);
    expect(tile).toBeDefined();
    expect(tile?.ready).toBe(true);
  });

  it('records against solo_board, the practice type the database allows', () => {
    // There is no 'word_tower' value in the practice_type CHECK constraint, and
    // a letter-pool word builder is the closest existing semantics.
    expect(tileOf(IGHT_LESSON)?.mode).toBe('solo_board');
  });

  it('routes by variant so it never opens the plain solo board', () => {
    expect(tileOf(IGHT_LESSON)?.variant).toBe('word_tower');
  });

  it('counts the words the wheel can actually seed, not the whole lesson', () => {
    const tile = tileOf([...IGHT_LESSON, w('cat'), w('extraordinary')]);
    // 'cat' is too short to be worth a floor and 'extraordinary' is longer than
    // the wheel — promising 6 words and dealing 4 is the badge lying.
    expect(tile?.count).toBe(4);
    expect(tile?.countKind).toBe('words');
  });

  it('locks when the lesson has too few seedable words', () => {
    const tile = tileOf([w('light'), w('night'), w('sight')]);
    expect(tile?.ready).toBe(false);
    expect(tile?.lockedKey).toBeTruthy();
  });

  it('locks for a language with no Word Tower wheel', () => {
    const tile = tileOf(['светит', 'ночной', 'зрение', 'яркий'].map(w), 'ru');
    expect(tile?.ready).toBe(false);
  });

  it('shows no play count, because solo_board sessions are not split by variant', () => {
    // Mirrors the vocabulary-skill tiles: reporting the solo board's own plays
    // here would double-count them.
    const tiles = buildPracticeTiles(IGHT_LESSON, {
      language: 'en',
      sessions: {
        flashcard_sessions: 0,
        solo_board_sessions: 7,
        warmup_sessions: 0,
        word_list_views: 0,
        matching_sessions: 0,
        spelling_sessions: 0,
        blitz_sessions: 0,
      },
    });
    expect(tiles.find((tile) => tile.id === WORD_TOWER_TILE_ID)?.sessions).toBe(0);
    expect(tiles.find((tile) => tile.id === 'solo_board')?.sessions).toBe(7);
  });

  it('leaves every other tile untouched', () => {
    const tiles = buildPracticeTiles(IGHT_LESSON, { language: 'en' });
    const ids = tiles.map((tile) => tile.id);
    expect(ids).toContain('solo_board');
    expect(ids).toContain('word_list');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
