import { describe, it, expect } from 'vitest';
import { createBoard, type Board } from '../board';
import type { PlacedTile } from '../types';
import {
  resolveCaptures,
  applyClaims,
  endgameTerritoryBonus,
  countClaimed,
  type Owner,
} from '../territory';

function makePlaced(row: number, col: number, letter: string, value: number, owner?: Owner): PlacedTile {
  return { row, col, letter, value, isBlank: false, rackTileId: `${row},${col}` };
}

function seedBoard(
  size: 7 | 9 | 11 | 13 | 15 = 11,
  tiles: { row: number; col: number; letter: string; value: number; claim: Owner }[] = [],
): Board {
  const board = createBoard(size);
  for (const t of tiles) {
    board.cells[t.row][t.col].tile = {
      row: t.row,
      col: t.col,
      letter: t.letter,
      value: t.value,
      isBlank: false,
      rackTileId: `seed-${t.row},${t.col}`,
    };
    board.cells[t.row][t.col].claim = t.claim;
  }
  return board;
}

describe('territory', () => {
  describe('resolveCaptures', () => {
    it('flips opponent-claimed anchor cells the new word crosses', () => {
      const board = seedBoard(11, [
        { row: 5, col: 5, letter: 'T', value: 1, claim: 'bot' },
      ]);
      const placements: PlacedTile[] = [
        makePlaced(5, 4, 'C', 3),
        makePlaced(5, 6, 'A', 1),
      ];
      const wordCoords = [
        { row: 5, col: 4 },
        { row: 5, col: 5 },
        { row: 5, col: 6 },
      ];
      const result = resolveCaptures(board, placements, [wordCoords], 'player');
      expect(result.capturedCells).toEqual([{ row: 5, col: 5 }]);
      expect(result.bonus).toBe(1);
    });

    it('does not capture own anchor cells', () => {
      const board = seedBoard(11, [
        { row: 5, col: 5, letter: 'T', value: 1, claim: 'player' },
      ]);
      const placements: PlacedTile[] = [
        makePlaced(5, 4, 'C', 3),
        makePlaced(5, 6, 'A', 1),
      ];
      const wordCoords = [
        { row: 5, col: 4 },
        { row: 5, col: 5 },
        { row: 5, col: 6 },
      ];
      const result = resolveCaptures(board, placements, [wordCoords], 'player');
      expect(result.capturedCells).toEqual([]);
      expect(result.bonus).toBe(0);
    });

    it('ignores newly-placed cells (they become claimed via applyClaims, not capture)', () => {
      const board = seedBoard(11);
      const placements: PlacedTile[] = [
        makePlaced(5, 4, 'C', 3),
        makePlaced(5, 5, 'A', 1),
        makePlaced(5, 6, 'T', 1),
      ];
      const wordCoords = placements.map((p) => ({ row: p.row, col: p.col }));
      const result = resolveCaptures(board, placements, [wordCoords], 'player');
      expect(result.capturedCells).toEqual([]);
      expect(result.bonus).toBe(0);
    });

    it('dedupes captures across multiple words (cross-word turn)', () => {
      const board = seedBoard(11, [
        { row: 5, col: 5, letter: 'T', value: 1, claim: 'bot' },
      ]);
      const placements: PlacedTile[] = [
        makePlaced(5, 4, 'C', 3),
        makePlaced(5, 6, 'A', 1),
        makePlaced(4, 5, 'A', 1),
        makePlaced(6, 5, 'B', 3),
      ];
      const mainAcross = [
        { row: 5, col: 4 },
        { row: 5, col: 5 },
        { row: 5, col: 6 },
      ];
      const crossDown = [
        { row: 4, col: 5 },
        { row: 5, col: 5 },
        { row: 6, col: 5 },
      ];
      const result = resolveCaptures(board, placements, [mainAcross, crossDown], 'player');
      expect(result.capturedCells).toHaveLength(1);
      expect(result.capturedCells[0]).toEqual({ row: 5, col: 5 });
      expect(result.bonus).toBe(1);
    });

    it('captures multiple opponent anchors when word crosses several', () => {
      const board = seedBoard(11, [
        { row: 5, col: 5, letter: 'T', value: 1, claim: 'bot' },
        { row: 5, col: 7, letter: 'R', value: 1, claim: 'bot' },
      ]);
      const placements: PlacedTile[] = [
        makePlaced(5, 4, 'C', 3),
        makePlaced(5, 6, 'A', 1),
        makePlaced(5, 8, 'S', 1),
      ];
      const wordCoords = [
        { row: 5, col: 4 },
        { row: 5, col: 5 },
        { row: 5, col: 6 },
        { row: 5, col: 7 },
        { row: 5, col: 8 },
      ];
      const result = resolveCaptures(board, placements, [wordCoords], 'player');
      expect(result.capturedCells).toHaveLength(2);
      expect(result.bonus).toBe(2);
    });

    it('skips unclaimed (null) anchors — they are no-ops', () => {
      const board = seedBoard(11, [
        { row: 5, col: 5, letter: 'T', value: 1, claim: null },
      ]);
      const placements: PlacedTile[] = [
        makePlaced(5, 4, 'C', 3),
        makePlaced(5, 6, 'A', 1),
      ];
      const wordCoords = [
        { row: 5, col: 4 },
        { row: 5, col: 5 },
        { row: 5, col: 6 },
      ];
      const result = resolveCaptures(board, placements, [wordCoords], 'player');
      expect(result.capturedCells).toEqual([]);
      expect(result.bonus).toBe(0);
    });
  });

  describe('applyClaims', () => {
    it('claims newly-placed cells for the placer', () => {
      const board = seedBoard(11);
      const placements: PlacedTile[] = [
        makePlaced(5, 5, 'C', 3),
        makePlaced(5, 6, 'A', 1),
      ];
      const next = applyClaims(board, placements, [], 'player');
      expect(next.cells[5][5].claim).toBe('player');
      expect(next.cells[5][6].claim).toBe('player');
    });

    it('flips captured cells to placer and leaves uninvolved cells alone', () => {
      const board = seedBoard(11, [
        { row: 5, col: 5, letter: 'T', value: 1, claim: 'bot' },
        { row: 0, col: 0, letter: 'X', value: 8, claim: 'bot' },
      ]);
      const placements: PlacedTile[] = [
        makePlaced(5, 4, 'C', 3),
        makePlaced(5, 6, 'A', 1),
      ];
      const captured = [{ row: 5, col: 5 }];
      const next = applyClaims(board, placements, captured, 'player');
      expect(next.cells[5][5].claim).toBe('player');
      expect(next.cells[5][4].claim).toBe('player');
      expect(next.cells[5][6].claim).toBe('player');
      expect(next.cells[0][0].claim).toBe('bot');
    });

    it('returns a new board (immutable)', () => {
      const board = seedBoard(11);
      const placements: PlacedTile[] = [makePlaced(5, 5, 'C', 3)];
      const next = applyClaims(board, placements, [], 'player');
      expect(next).not.toBe(board);
      expect(board.cells[5][5].claim).toBe(undefined);
    });
  });

  describe('countClaimed', () => {
    it('counts cells claimed by the owner', () => {
      const board = seedBoard(11, [
        { row: 0, col: 0, letter: 'A', value: 1, claim: 'player' },
        { row: 1, col: 1, letter: 'B', value: 3, claim: 'player' },
        { row: 2, col: 2, letter: 'C', value: 3, claim: 'bot' },
      ]);
      expect(countClaimed(board, 'player')).toBe(2);
      expect(countClaimed(board, 'bot')).toBe(1);
    });
  });

  describe('endgameTerritoryBonus', () => {
    it('returns 2 points per claimed cell', () => {
      const board = seedBoard(11, [
        { row: 0, col: 0, letter: 'A', value: 1, claim: 'player' },
        { row: 1, col: 1, letter: 'B', value: 3, claim: 'player' },
        { row: 2, col: 2, letter: 'C', value: 3, claim: 'bot' },
        { row: 3, col: 3, letter: 'D', value: 2, claim: 'bot' },
        { row: 4, col: 4, letter: 'E', value: 1, claim: 'bot' },
      ]);
      expect(endgameTerritoryBonus(board, 'player')).toBe(4);
      expect(endgameTerritoryBonus(board, 'bot')).toBe(6);
    });
  });
});
