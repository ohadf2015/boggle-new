import type { PlacedTile } from './types';
import { BLANK_LETTER } from './tileBag';

/**
 * Glyph shown for a blank/joker tile that has not yet been assigned a letter.
 * Deliberately NOT the old middle-dot ('·') — players read the dot as a bug or
 * a literal '.' in their word. '?' reads as "wildcard" and avoids colliding with
 * the board's center star ('★').
 */
export const JOKER_GLYPH = '?';

/**
 * What to render inside a tile. A normal tile shows its letter. A blank shows
 * the letter the player assigned to it, or the joker glyph while unassigned.
 */
export function displayTileLetter(tile: { letter: string; isBlank: boolean }): string {
  if (tile.letter === BLANK_LETTER) return JOKER_GLYPH;
  return tile.letter;
}

/**
 * Lock a chosen letter onto a placed blank. The tile stays a blank (so it keeps
 * scoring zero), but now carries a real letter so the move validator can build
 * and check the word. Pure — returns a new placement.
 */
export function assignBlankLetter(placement: PlacedTile, letter: string): PlacedTile {
  return { ...placement, letter, value: 0, isBlank: true };
}

/** A blank that still carries the underscore — needs a letter before it can play. */
export function isUnassignedBlank(p: PlacedTile): boolean {
  return p.isBlank && p.letter === BLANK_LETTER;
}

/** Submit guard: true while any pending blank has no chosen letter yet. */
export function hasUnassignedBlank(pending: PlacedTile[]): boolean {
  return pending.some(isUnassignedBlank);
}
