import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { validateAndScoreMove } from '../moveValidator';
import type { PlacedTile } from '../types';

/**
 * The 2026-05-30 backlog claimed blanks were unusable: rendered as a dot and
 * submitted as literal gaps, so "C_T" was sent to the dictionary and rejected.
 * These tests pin the property that actually matters — the dictionary sees the
 * ASSIGNED letter, and the blank still scores zero.
 */

const VALUES: Record<string, number> = { A: 1, C: 3, T: 1, _: 0 };

const tile = (row: number, col: number, letter: string, isBlank = false): PlacedTile => ({
  row,
  col,
  letter,
  value: isBlank ? 0 : (VALUES[letter] ?? 1),
  isBlank,
  rackTileId: `t-${row}-${col}-${letter}${isBlank ? '-blank' : ''}`,
});

const VALID_WORDS = new Set(['CAT']);
const isValid = (w: string) => VALID_WORDS.has(w.toUpperCase());

describe('validateAndScoreMove — assigned blanks', () => {
  it('validates the word using the letter the player assigned to the blank', () => {
    const board = createBoard();
    // C A T across the centre, where the A is a blank assigned the letter A.
    const r = validateAndScoreMove(
      board,
      [tile(7, 6, 'C'), tile(7, 7, 'A', true), tile(7, 8, 'T')],
      isValid,
    );
    expect(r.ok).toBe(true);
  });

  it('scores the assigned blank as zero, not as the letter it stands for', () => {
    const board = createBoard();
    const withBlank = validateAndScoreMove(
      board,
      [tile(7, 6, 'C'), tile(7, 7, 'A', true), tile(7, 8, 'T')],
      isValid,
    );
    const allNatural = validateAndScoreMove(
      board,
      [tile(7, 6, 'C'), tile(7, 7, 'A'), tile(7, 8, 'T')],
      isValid,
    );
    expect(withBlank.ok).toBe(true);
    expect(allNatural.ok).toBe(true);
    // The blank contributes 0 where a natural A contributes 1, so the blanked
    // word must score strictly less.
    expect(withBlank.score).toBeLessThan(allNatural.score);
  });

  it('still rejects a word that is invalid even with the blank assigned', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [tile(7, 6, 'C'), tile(7, 7, 'X', true), tile(7, 8, 'T')],
      isValid,
    );
    expect(r.ok).toBe(false);
  });
});
