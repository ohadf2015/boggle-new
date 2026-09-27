import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState, type WordCraftState } from '../useWordCraftGame';
import type { PlacedTile } from '../types';

function makePlaced(row: number, col: number, letter: string, value: number, id: string): PlacedTile {
  return { row, col, letter, value, isBlank: false, rackTileId: id };
}

function seedClaimedTile(state: WordCraftState, row: number, col: number, letter: string, value: number, by: 'player' | 'bot'): WordCraftState {
  const cells = state.board.cells.map((r) => r.map((c) => ({ ...c })));
  cells[row][col].tile = { row, col, letter, value, isBlank: false, rackTileId: `seed-${row},${col}` };
  cells[row][col].claim = by;
  return { ...state, board: { cells, size: state.board.size } };
}

describe('wordCraftReducer territory', () => {
  it('adds capture bonus to player score on COMMIT_PLAYER when crossing bot-claimed cell', () => {
    let state = buildInitialState({ seed: 1, locale: 'en', boardSize: 15, territoryEnabled: true });
    state = seedClaimedTile(state, 7, 7, 'T', 1, 'bot');

    const placements: PlacedTile[] = [
      makePlaced(7, 6, 'C', 3, 'p-c'),
      makePlaced(7, 8, 'A', 1, 'p-a'),
    ];

    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER',
      placements,
      score: 10,
      words: ['CTA'],
      wordCells: [[{ row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }]],
    });

    // base 10 + capture bonus 1 (T value)
    expect(next.player.score).toBe(11);
    expect(next.board.cells[7][7].claim).toBe('player');
    expect(next.board.cells[7][6].claim).toBe('player');
    expect(next.lastCapture?.cells).toEqual([{ row: 7, col: 7 }]);
    expect(next.lastCapture?.bonus).toBe(1);
  });

  it('disables territory effects when territoryEnabled=false', () => {
    let state = buildInitialState({ seed: 1, locale: 'en', boardSize: 15, territoryEnabled: false });
    state = seedClaimedTile(state, 7, 7, 'T', 1, 'bot');

    const placements: PlacedTile[] = [
      makePlaced(7, 6, 'C', 3, 'p-c'),
      makePlaced(7, 8, 'A', 1, 'p-a'),
    ];

    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER',
      placements,
      score: 10,
      words: ['CTA'],
      wordCells: [[{ row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }]],
    });

    expect(next.player.score).toBe(10);
    expect(next.board.cells[7][7].claim).toBe('bot');
    expect(next.lastCapture).toBeNull();
  });

  it('claims newly-placed cells for the placer', () => {
    const state = buildInitialState({ seed: 1, locale: 'en', boardSize: 15, territoryEnabled: true });
    const placements: PlacedTile[] = [
      makePlaced(7, 7, 'C', 3, 'p-c'),
      makePlaced(7, 8, 'A', 1, 'p-a'),
    ];
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER',
      placements,
      score: 6,
      words: ['CA'],
      wordCells: [[{ row: 7, col: 7 }, { row: 7, col: 8 }]],
    });
    expect(next.board.cells[7][7].claim).toBe('player');
    expect(next.board.cells[7][8].claim).toBe('player');
  });
});
