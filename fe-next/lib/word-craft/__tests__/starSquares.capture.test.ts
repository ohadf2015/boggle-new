import { describe, expect, it } from 'vitest';
import { starCells, modifierRingCenters } from '../modifiers';
import { resolveCaptures } from '../territory';
import { createBoard } from '../board';
import type { PlacedTile } from '../types';

const SIZE = 7;
const SEED = 11;

function boardWithRivalAround(row: number, col: number) {
  const board = createBoard(SIZE, { premiums: false });
  for (const [r, c] of [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]) {
    board.cells[r][c].tile = { row: r, col: c, letter: 'B', value: 3, isBlank: false, rackTileId: `b-${r}-${c}` };
    board.cells[r][c].claim = 'bot';
  }
  return board;
}

describe('star squares capture, end to end', () => {
  const star = starCells(SEED, SIZE)[0];
  const tile = (row: number, col: number): PlacedTile => ({ row, col, letter: 'A', value: 1, isBlank: false, rackTileId: `p-${row}-${col}` });

  it('landing on a star takes every rival cell in the ring', () => {
    const board = boardWithRivalAround(star.row, star.col);
    const placements = [tile(star.row, star.col)];
    const centers = modifierRingCenters('star_squares', SEED, SIZE, placements);
    const r = resolveCaptures(board, placements, [[{ row: star.row, col: star.col }]], 'player', { ringCenters: centers });
    expect(r.capturedCells).toHaveLength(4);
    expect(r.bonus).toBe(12);
  });

  it('the same move off a star captures nothing', () => {
    const board = boardWithRivalAround(star.row, star.col);
    const placements = [tile(star.row, star.col)];
    const centers = modifierRingCenters('none', SEED, SIZE, placements);
    const r = resolveCaptures(board, placements, [[{ row: star.row, col: star.col }]], 'player', { ringCenters: centers });
    expect(r.capturedCells).toHaveLength(0);
  });

  it('works for the bot seat too (symmetric)', () => {
    const board = createBoard(SIZE, { premiums: false });
    for (const [r, c] of [[star.row - 1, star.col], [star.row, star.col + 1]]) {
      board.cells[r][c].tile = { row: r, col: c, letter: 'B', value: 3, isBlank: false, rackTileId: `p-${r}-${c}` };
      board.cells[r][c].claim = 'player';
    }
    const placements = [tile(star.row, star.col)];
    const centers = modifierRingCenters('star_squares', SEED, SIZE, placements);
    const r = resolveCaptures(board, placements, [[{ row: star.row, col: star.col }]], 'bot', { ringCenters: centers });
    expect(r.capturedCells).toHaveLength(2);
  });
});
