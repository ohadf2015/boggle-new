/**
 * Test: blastBoardClearedByLocal flag for MP Blast board-cleared celebration.
 *
 * When a local player (in MP Blast) clears the shared board, `onMPBoardCleared`
 * fires and sets this flag to true. The flag is used to render a special
 * "Board Cleared!" badge on the player results. The flag resets to false on
 * game start (batchStartGame) or resetForNewRound.
 */
import { useGameStore } from '../store';

describe('blastBoardClearedByLocal', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('is false in initialState', () => {
    expect(useGameStore.getState().blastBoardClearedByLocal).toBe(false);
  });

  it('can be set to true', () => {
    useGameStore.getState().setBlastBoardClearedByLocal(true);
    expect(useGameStore.getState().blastBoardClearedByLocal).toBe(true);
  });

  it('can be set to false', () => {
    useGameStore.getState().setBlastBoardClearedByLocal(true);
    useGameStore.getState().setBlastBoardClearedByLocal(false);
    expect(useGameStore.getState().blastBoardClearedByLocal).toBe(false);
  });

  it('accepts a function updater', () => {
    useGameStore.getState().setBlastBoardClearedByLocal(true);
    useGameStore.getState().setBlastBoardClearedByLocal((prev) => !prev);
    expect(useGameStore.getState().blastBoardClearedByLocal).toBe(false);
  });

  it('resets to false after batchStartGame', () => {
    useGameStore.getState().setBlastBoardClearedByLocal(true);
    useGameStore.getState().batchStartGame({ gameActive: true });
    expect(useGameStore.getState().blastBoardClearedByLocal).toBe(false);
  });

  it('resets to false after resetForNewRound', () => {
    useGameStore.getState().setBlastBoardClearedByLocal(true);
    useGameStore.getState().resetForNewRound();
    expect(useGameStore.getState().blastBoardClearedByLocal).toBe(false);
  });

  it('resets to false after resetAll', () => {
    useGameStore.getState().setBlastBoardClearedByLocal(true);
    useGameStore.getState().resetAll();
    expect(useGameStore.getState().blastBoardClearedByLocal).toBe(false);
  });
});
