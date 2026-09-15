/**
 * TDD RED: the Word Forge (produce) tiles in the student practice picker.
 *
 * Produce practice is the only tile family that asks the student to WRITE the
 * lesson word rather than pick it, so it gets its own row in the picker instead
 * of hiding as a setting inside the existing vocabulary tiles — a student who
 * cannot see it will never choose it.
 *
 * Two constraints shape how it registers, and both are already established by
 * the Word Tower tile:
 *
 *  - `practice_type` is a DB CHECK constraint. There is no 'produce' value in
 *    it, so these tiles record as `vocab_focus` — the closest allowed semantics
 *    — and route by `variant`, exactly as Word Tower records as `solo_board`.
 *  - Readiness is per-cue: a lesson with definitions but no synonyms can run the
 *    definition forge and not the synonym one. Promising a tile that then has no
 *    questions is the badge lying.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { buildPracticeTiles, PRODUCE_TILE_PREFIX } from '../practicePicker';

const CELL: VocabularyWord = {
  word: 'cell',
  definition: 'a small room in a prison',
  synonyms: ['chamber'],
  canIntegrate: true,
};

const BARE: VocabularyWord = { word: 'bare', canIntegrate: true };

const produceTiles = (words: VocabularyWord[]) =>
  buildPracticeTiles(words, { language: 'en' }).filter((tile) =>
    tile.id.startsWith(PRODUCE_TILE_PREFIX)
  );

const produceTile = (words: VocabularyWord[], focus: string) =>
  produceTiles(words).find((tile) => tile.id === `${PRODUCE_TILE_PREFIX}${focus}`);

describe('produce practice tiles', () => {
  it('offers a tile for every produce cue', () => {
    expect(produceTiles([CELL]).length).toBeGreaterThan(0);
  });

  it('records against vocab_focus, the practice type the database allows', () => {
    expect(produceTile([CELL], 'definition')?.mode).toBe('vocab_focus');
  });

  it('routes by variant so it never opens the multiple-choice drill', () => {
    // Without this the tile would land on VocabFocusPractice — four buttons —
    // and the one mode that asks students to produce a word would silently be
    // the same recognition drill as everything else.
    expect(produceTile([CELL], 'definition')?.variant).toBe('produce');
  });

  it('is ready when the lesson carries the field that cue needs', () => {
    const tile = produceTile([CELL], 'definition');
    expect(tile?.ready).toBe(true);
    expect(tile?.count).toBe(1);
    expect(tile?.countKind).toBe('questions');
  });

  it('is ready on a ONE-word lesson, which multiple choice cannot run', () => {
    // The multiple-choice tiles need four words to fill four options. Producing
    // a word needs no distractors, so this tile unlocks far earlier — the point
    // a teacher with a short list actually notices.
    expect(produceTile([CELL], 'definition')?.ready).toBe(true);
  });

  it('locks a cue the lesson has no data for', () => {
    const tile = produceTile([BARE], 'definition');
    expect(tile?.ready).toBe(false);
    expect(tile?.lockedKey).toBeTruthy();
  });

  it('carries the produce focus so the stage knows which cue to build', () => {
    expect(produceTile([CELL], 'synonym')?.focus).toBe('synonym');
  });
});
