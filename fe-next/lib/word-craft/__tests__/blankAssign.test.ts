import { describe, it, expect } from 'vitest';
import {
  JOKER_GLYPH,
  displayTileLetter,
  assignBlankLetter,
  isUnassignedBlank,
  hasUnassignedBlank,
} from '../blankAssign';
import type { PlacedTile } from '../types';

function blankPlacement(letter = '_'): PlacedTile {
  return { row: 7, col: 7, letter, value: 0, isBlank: true, rackTileId: 'b1' };
}

describe('displayTileLetter', () => {
  it('returns the letter for a normal tile', () => {
    expect(displayTileLetter({ letter: 'A', isBlank: false })).toBe('A');
  });

  it('returns the joker glyph (never a dot) for an unassigned blank', () => {
    expect(displayTileLetter({ letter: '_', isBlank: true })).toBe(JOKER_GLYPH);
    expect(displayTileLetter({ letter: '_', isBlank: true })).not.toBe('·');
  });

  it('returns the chosen letter for an assigned blank', () => {
    expect(displayTileLetter({ letter: 'Q', isBlank: true })).toBe('Q');
  });
});

describe('assignBlankLetter', () => {
  it('sets the chosen letter, keeps isBlank, and zeroes the value', () => {
    const assigned = assignBlankLetter(blankPlacement(), 'Q');
    expect(assigned.letter).toBe('Q');
    expect(assigned.isBlank).toBe(true);
    expect(assigned.value).toBe(0);
  });

  it('preserves coordinates and rack id', () => {
    const assigned = assignBlankLetter(blankPlacement(), 'E');
    expect(assigned.row).toBe(7);
    expect(assigned.col).toBe(7);
    expect(assigned.rackTileId).toBe('b1');
  });

  it('does not mutate the input placement', () => {
    const original = blankPlacement();
    assignBlankLetter(original, 'Z');
    expect(original.letter).toBe('_');
  });
});

describe('isUnassignedBlank / hasUnassignedBlank', () => {
  it('flags a blank still carrying the underscore', () => {
    expect(isUnassignedBlank(blankPlacement('_'))).toBe(true);
  });

  it('does not flag an assigned blank or a normal tile', () => {
    expect(isUnassignedBlank(blankPlacement('K'))).toBe(false);
    expect(isUnassignedBlank({ row: 0, col: 0, letter: 'A', value: 1, isBlank: false, rackTileId: 't' })).toBe(false);
  });

  it('hasUnassignedBlank scans the pending set', () => {
    expect(hasUnassignedBlank([blankPlacement('K')])).toBe(false);
    expect(hasUnassignedBlank([blankPlacement('K'), blankPlacement('_')])).toBe(true);
  });
});
