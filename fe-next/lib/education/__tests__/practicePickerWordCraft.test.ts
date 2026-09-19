/**
 * The Word Craft tile in the student practice picker — the territory board
 * game, with the lesson's words steering the student's letters.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { buildPracticeTiles, WORD_CRAFT_TILE_ID } from '../practicePicker';

const w = (word: string): VocabularyWord => ({ word, canIntegrate: true });
const tileOf = (words: VocabularyWord[], language = 'en') =>
  buildPracticeTiles(words, { language }).find((tile) => tile.id === WORD_CRAFT_TILE_ID);

describe('word craft practice tile', () => {
  it('is ready for a lesson with at least one rack-sized word, and records as solo_board', () => {
    const tile = tileOf(['cat', 'elephant'].map(w));
    expect(tile?.ready).toBe(true);
    expect(tile?.mode).toBe('solo_board');
    expect(tile?.variant).toBe('word_craft');
    // elephant (8) can never fit a 7-tile rack
    expect(tile?.count).toBe(1);
  });

  it('is locked (not hidden) for a language Word Craft has no tiles for', () => {
    const tile = tileOf(['кот', 'дом'].map(w), 'ru');
    expect(tile?.ready).toBe(false);
    expect(tile?.lockedKey).toBe(`education.practicePicker.locked.${WORD_CRAFT_TILE_ID}`);
  });
});
