import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame';

describe('wordCraftReducer RESET', () => {
  it('replaces state with a fresh game in the new locale + board size', () => {
    const original = buildInitialState({ seed: 1, locale: 'en', boardSize: 15 });
    expect(original.player.rack[0]?.letter).toMatch(/[A-Z_]/);

    const next = wordCraftReducer(original, {
      type: 'RESET',
      seed: 2,
      locale: 'he',
      boardSize: 13,
    });

    // Hebrew rack contains Hebrew letters or the blank glyph.
    expect(next.player.rack.length).toBe(7);
    for (const tile of next.player.rack) {
      // Either Hebrew block character (U+05D0..U+05EA) or blank
      expect(tile.letter === '_' || /[א-ת]/.test(tile.letter)).toBe(true);
    }
    expect(next.board.cells.length).toBe(13);
    expect(next.history.length).toBe(0);
    expect(next.player.score).toBe(0);
  });

  it('clears any in-progress turn state', () => {
    const start = buildInitialState({ seed: 1, locale: 'en', boardSize: 15 });
    const dirty = {
      ...start,
      pendingPlacements: [
        { row: 7, col: 7, letter: 'A', value: 1, isBlank: false, rackTileId: 'x' },
      ],
      lastError: 'some-error',
      heat: 80,
    };

    const next = wordCraftReducer(dirty, {
      type: 'RESET',
      seed: 1,
      locale: 'en',
      boardSize: 15,
    });

    expect(next.pendingPlacements).toEqual([]);
    expect(next.lastError).toBeNull();
    expect(next.heat).toBe(0);
  });
});
