import type { Board } from './board';
import type { PlacedTile } from './types';
import { HEBREW_REGULAR_TO_FINAL } from '@/shared/utils/wordNormalization';

/**
 * Hebrew sofit display. The bag holds *regular* forms; this module produces the
 * rendered glyph without ever mutating the underlying tile letter — dict lookup,
 * scoring, and serialization stay on the regular form and only the visible
 * glyph swaps. Map shared with all other modes via shared/utils.
 */
const REGULAR_TO_SOFIT = HEBREW_REGULAR_TO_FINAL;

function isHebrewLetter(ch: string): boolean {
  if (!ch || ch.length === 0) return false;
  const code = ch.charCodeAt(0);
  return code >= 0x05d0 && code <= 0x05ea;
}

/** Treat a board cell as "occupied" if either an already-placed tile or a pending placement sits there. */
function isOccupied(
  board: Board,
  pending: PlacedTile[] | undefined,
  row: number,
  col: number,
): boolean {
  if (row < 0 || col < 0) return false;
  if (row >= board.cells.length || col >= board.cells.length) return false;
  if (board.cells[row]?.[col]?.tile) return true;
  if (pending && pending.some((p) => p.row === row && p.col === col)) return true;
  return false;
}

export interface HebrewDisplayContext {
  board: Board;
  pending?: PlacedTile[];
  row: number;
  col: number;
  letter: string;
  /** When the active locale is not 'he' we short-circuit and return letter unchanged. */
  locale: string;
}

/**
 * Returns the glyph that should be visually rendered for a tile at
 * (row, col). For non-Hebrew locales this is the identity function.
 *
 * Sofit rule: a Hebrew letter that has a final form swaps to that form
 * when no other tile sits immediately to its right (horizontal-end) or
 * immediately below it (vertical-end). The check is per-direction so
 * a tile that sits mid-row but at column-end of its vertical word still
 * gets the sofit treatment for the vertical axis. We choose the
 * "stronger" end: if either axis would treat this as end-of-word, render
 * sofit. (In practice WordCraft pieces only count one axis at a time
 * since words are linear, so this is conservative-correct.)
 */
export function hebrewDisplayLetter(ctx: HebrewDisplayContext): string {
  if (ctx.locale !== 'he') return ctx.letter;
  if (!isHebrewLetter(ctx.letter)) return ctx.letter;
  const sofit = REGULAR_TO_SOFIT[ctx.letter];
  if (!sofit) return ctx.letter;

  // End-of-word horizontally: nothing immediately to the right *and*
  // there's at least one tile to the left (otherwise this is a one-tile
  // start; not yet a word).
  const hasRight = isOccupied(ctx.board, ctx.pending, ctx.row, ctx.col + 1);
  const hasLeft = isOccupied(ctx.board, ctx.pending, ctx.row, ctx.col - 1);
  const isHorizontalEnd = !hasRight && hasLeft;

  // End-of-word vertically: nothing immediately below *and* a tile above.
  const hasBelow = isOccupied(ctx.board, ctx.pending, ctx.row + 1, ctx.col);
  const hasAbove = isOccupied(ctx.board, ctx.pending, ctx.row - 1, ctx.col);
  const isVerticalEnd = !hasBelow && hasAbove;

  return isHorizontalEnd || isVerticalEnd ? sofit : ctx.letter;
}
