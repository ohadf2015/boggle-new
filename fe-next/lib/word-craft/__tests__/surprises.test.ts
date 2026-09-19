import { describe, it, expect } from 'vitest';
import { createBoard, placeTiles, type Board } from '../board';
import { applyClaims, countClaimed } from '../territory';
import {
  SURPRISE_KINDS,
  rollSurpriseKind,
  spawnSurprise,
  openSurprise,
  surprisesCovered,
  surpriseValue,
  SURPRISE_MOVE_VALUE,
  type SurpriseBox,
} from '../surprises';
import type { PlacedTile } from '../types';

const t = (row: number, col: number, letter = 'A'): PlacedTile => ({
  row,
  col,
  letter,
  value: 1,
  isBlank: false,
  rackTileId: `t${row}-${col}`,
});

function boardWith(tiles: PlacedTile[], owner: 'player' | 'bot' = 'player'): Board {
  const b = createBoard(11);
  placeTiles(b, tiles);
  return applyClaims(b, tiles, [], owner);
}

describe('rollSurpriseKind', () => {
  it('Given the same seed + turn, Then the roll is identical (duel boards must agree)', () => {
    expect(rollSurpriseKind(42, 3)).toBe(rollSurpriseKind(42, 3));
  });

  it('Given many turns, Then every reward kind shows up (it is actually variable)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(rollSurpriseKind(7, i));
    expect(Array.from(seen).sort()).toEqual(SURPRISE_KINDS.slice().sort());
  });
});

describe('spawnSurprise', () => {
  it('Given an empty board, Then nothing spawns (no word to build off yet)', () => {
    expect(spawnSurprise(createBoard(11), [], 1, 0)).toBeNull();
  });

  it('Given tiles on the board, Then a box lands on an empty cell within reach (1-2 cells) of a tile', () => {
    const board = boardWith([t(5, 4), t(5, 5), t(5, 6)]);
    for (let turn = 0; turn < 30; turn++) {
      const box = spawnSurprise(board, [], 9, turn);
      expect(box).not.toBeNull();
      const { row, col } = box!;
      expect(board.cells[row][col].tile).toBeNull();
      const near = [t(5, 4), t(5, 5), t(5, 6)].some(
        (p) => Math.max(Math.abs(p.row - row), Math.abs(p.col - col)) <= 2,
      );
      expect(near).toBe(true);
    }
  });

  it('Given an existing box, Then a new one never stacks on it', () => {
    const board = boardWith([t(5, 5)]);
    const first = spawnSurprise(board, [], 3, 1)!;
    for (let turn = 0; turn < 30; turn++) {
      const next = spawnSurprise(board, [first], 3, turn);
      expect(next && next.row === first.row && next.col === first.col).toBeFalsy();
    }
  });
});

describe('surprisesCovered', () => {
  it('Given a placement on a box, Then that box is returned', () => {
    const box: SurpriseBox = { row: 4, col: 4, kind: 'paint' };
    expect(surprisesCovered([box], [t(4, 4)])).toEqual([box]);
    expect(surprisesCovered([box], [t(4, 5)])).toEqual([]);
  });
});

describe('openSurprise', () => {
  it('paint: claims the empty ring around the box for the opener', () => {
    const board = boardWith([t(5, 5)]);
    const res = openSurprise(board, { row: 5, col: 5, kind: 'paint' }, 'player');
    // 8 neighbours, all empty → all painted
    expect(res.cells).toHaveLength(8);
    expect(countClaimed(res.board, 'player')).toBe(1 + 8);
    expect(res.clue).toBe(false);
  });

  it('mega: paints a radius-2 square', () => {
    const board = boardWith([t(5, 5)]);
    const res = openSurprise(board, { row: 5, col: 5, kind: 'mega' }, 'bot');
    expect(res.cells).toHaveLength(24);
  });

  it('steal: flips the nearest rival tiles (up to 3) to the opener', () => {
    const b0 = boardWith([t(5, 5)], 'player');
    placeTiles(b0, [t(1, 1), t(1, 2), t(9, 9), t(8, 8)]);
    const board = applyClaims(b0, [t(1, 1), t(1, 2), t(9, 9), t(8, 8)], [], 'bot');
    const res = openSurprise(board, { row: 7, col: 7, kind: 'steal' }, 'player');
    expect(res.cells).toHaveLength(3);
    expect(res.board.cells[8][8].claim).toBe('player');
    expect(res.board.cells[9][9].claim).toBe('player');
  });

  it('steal with no rival tiles falls back to a paint splash (never a dud)', () => {
    const board = boardWith([t(5, 5)]);
    const res = openSurprise(board, { row: 5, col: 5, kind: 'steal' }, 'player');
    expect(res.kind).toBe('paint');
    expect(res.cells.length).toBeGreaterThan(0);
  });

  it('clue: the player earns a clue; the bot gets a paint splash instead', () => {
    const board = boardWith([t(5, 5)]);
    expect(openSurprise(board, { row: 5, col: 5, kind: 'clue' }, 'player').clue).toBe(true);
    const bot = openSurprise(board, { row: 5, col: 5, kind: 'clue' }, 'bot');
    expect(bot.clue).toBe(false);
    expect(bot.kind).toBe('paint');
  });

  it('never paints over tiles the opener does not own via paint (tiles are only flipped by steal)', () => {
    const b0 = boardWith([t(5, 5)], 'player');
    placeTiles(b0, [t(5, 6)]);
    const board = applyClaims(b0, [t(5, 6)], [], 'bot');
    const res = openSurprise(board, { row: 5, col: 5, kind: 'paint' }, 'player');
    expect(res.board.cells[5][6].claim).toBe('bot');
  });

  it('does not mutate the input board', () => {
    const board = boardWith([t(5, 5)]);
    openSurprise(board, { row: 5, col: 5, kind: 'paint' }, 'player');
    expect(countClaimed(board, 'player')).toBe(1);
  });
});

describe('surpriseValue (move-ranking bonus so the clue and bot chase boxes)', () => {
  it('Given a move covering one box, Then it is worth a flat bonus; none → 0', () => {
    const boxes: SurpriseBox[] = [{ row: 4, col: 4, kind: 'paint' }];
    expect(surpriseValue(boxes, [t(4, 4), t(4, 5)])).toBe(SURPRISE_MOVE_VALUE);
    expect(surpriseValue(boxes, [t(3, 3)])).toBe(0);
  });
});
