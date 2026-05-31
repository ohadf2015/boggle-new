/**
 * Blast per-player boards — independence tests.
 *
 * Bug: blast MP used ONE shared board (game.blastModeState.grid/tileStates).
 * When player A cleared tiles, the shared board mutated and was broadcast to
 * everyone, so B's board changed too. Boards must be PER-PLAYER: same starting
 * board (same seed), evolving independently.
 *
 * These use the REAL board state (no mocks) so they actually prove independence,
 * unlike the heavily-mocked handler tests.
 */
import { describe, it, expect } from 'vitest';
import { initBlastModeState, getOrInitPlayerBoard } from '../blastModeManager';

const GRID = [
  ['A', 'B', 'C'],
  ['D', 'E', 'F'],
  ['G', 'H', 'I'],
];

describe('blastModeManager — per-player boards', () => {
  it('both players start with an identical board (same seed)', () => {
    const state = initBlastModeState(GRID, ['alice', 'bob'], 1, 12345);
    const a = getOrInitPlayerBoard(state, 'alice');
    const b = getOrInitPlayerBoard(state, 'bob');

    expect(a.grid).toEqual(b.grid);
    expect(a.tileStates).toEqual(b.tileStates);
  });

  it("mutating alice's board does NOT change bob's board (independence)", () => {
    const state = initBlastModeState(GRID, ['alice', 'bob'], 1, 12345);
    const a = getOrInitPlayerBoard(state, 'alice');
    const bBefore = JSON.stringify(getOrInitPlayerBoard(state, 'bob').tileStates);

    // Simulate alice clearing a tile + shrinking her grid
    a.tileStates[0][0].isCleared = true;
    a.grid[0][0] = 'Z';
    a.totalMoves += 1;

    const bAfter = JSON.stringify(getOrInitPlayerBoard(state, 'bob').tileStates);
    expect(bAfter).toBe(bBefore); // bob untouched
    expect(getOrInitPlayerBoard(state, 'bob').grid[0][0]).toBe('A'); // not 'Z'
  });

  it('returns a stable board reference per player across calls', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 7);
    const first = getOrInitPlayerBoard(state, 'alice');
    first.totalMoves = 5;
    const second = getOrInitPlayerBoard(state, 'alice');
    expect(second.totalMoves).toBe(5); // same evolving board, not re-initialized
  });

  it('lazily initializes a board for a late-joining player from the shared template', () => {
    const state = initBlastModeState(GRID, ['alice'], 1, 999);
    const late = getOrInitPlayerBoard(state, 'carol'); // not in initial players
    expect(late.grid).toEqual(GRID);
    expect(late.tileStates.length).toBe(GRID.length);
  });
});
