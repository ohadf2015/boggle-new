import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the solver so requestClue's contract is tested deterministically,
// independent of which letters the seeded rack happens to draw.
vi.mock('../botMove', () => ({
  findBestBotMove: vi.fn(),
}));

import { findBestBotMove } from '../botMove';
import { useWordCraftGame } from '../useWordCraftGame';

const mockedFind = vi.mocked(findBestBotMove);

describe('useWordCraftGame clues', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
    mockedFind.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('requestClue reveals the best word + start cell and spends a clue', () => {
    mockedFind.mockReturnValue({
      placements: [
        { row: 5, col: 4, letter: 'C', value: 3, isBlank: false, rackTileId: 'a' },
        { row: 5, col: 5, letter: 'A', value: 1, isBlank: false, rackTileId: 'b' },
        { row: 5, col: 6, letter: 'T', value: 1, isBlank: false, rackTileId: 'c' },
      ],
      score: 5,
      word: 'CAT',
    });

    const { result } = renderHook(() =>
      useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['CAT']) }),
    );

    expect(result.current.state.cluesRemaining).toBe(2);

    let clue: { word: string; row: number; col: number } | null = null;
    act(() => {
      clue = result.current.requestClue();
    });

    // Opening move: re-anchored so the first tile sits on the centre cell
    // (where auto-centre drops it), direction kept.
    expect(clue).toMatchObject({ word: 'CAT', row: 5, col: 5 });
    // Every cell of the suggestion is returned so the board can mark the path.
    expect(clue).toMatchObject({
      cells: [
        { row: 5, col: 5, letter: 'C' },
        { row: 5, col: 6, letter: 'A' },
        { row: 5, col: 7, letter: 'T' },
      ],
      anchors: [],
    });
    expect(result.current.state.cluesRemaining).toBe(1);
  });

  it('requestClue ranks with board context (territory captures) so the tip fits the live board', () => {
    mockedFind.mockReturnValue(null);
    const { result } = renderHook(() =>
      useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['CAT']), territoryEnabled: true }),
    );
    act(() => { result.current.requestClue(); });
    const opts = mockedFind.mock.calls[0][3];
    expect(typeof opts?.extraScore).toBe('function');
  });

  it('requestClue returns null and spends nothing when no word is playable', () => {
    mockedFind.mockReturnValue(null);
    const { result } = renderHook(() =>
      useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['CAT']) }),
    );

    let clue: unknown;
    act(() => {
      clue = result.current.requestClue();
    });

    expect(clue).toBeNull();
    expect(result.current.state.cluesRemaining).toBe(2);
  });

  it('requestClue returns null without spending when no clues remain', () => {
    mockedFind.mockReturnValue({ placements: [], score: 0, word: 'CAT' });
    const { result } = renderHook(() =>
      useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['CAT']) }),
    );

    act(() => { result.current.requestClue(); });
    act(() => { result.current.requestClue(); });
    expect(result.current.state.cluesRemaining).toBe(0);

    mockedFind.mockClear();
    let clue: unknown = 'x';
    act(() => { clue = result.current.requestClue(); });
    expect(clue).toBeNull();
    expect(mockedFind).not.toHaveBeenCalled();
  });

  it('grantClue adds a clue (rewarded-ad outcome)', () => {
    mockedFind.mockReturnValue({ placements: [], score: 0, word: 'CAT' });
    const { result } = renderHook(() =>
      useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['CAT']) }),
    );
    act(() => { result.current.requestClue(); });
    act(() => { result.current.requestClue(); });
    expect(result.current.state.cluesRemaining).toBe(0);
    act(() => { result.current.grantClue(); });
    expect(result.current.state.cluesRemaining).toBe(1);
  });
});
