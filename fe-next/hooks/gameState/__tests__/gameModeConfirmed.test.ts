/**
 * Test: gameModeConfirmed flag prevents classic-mode flash in PlayerInGameView/HostInGameView.
 *
 * The host socket handler sets tableData (React useState) and gameMode (Zustand) in
 * separate calls, causing two render cycles. The first render sees gameMode='classic'
 * (initialState default) even when the actual mode is blast/wheel-rush/word-hunt.
 * gameModeConfirmed starts false and only becomes true once the server confirms the mode,
 * so components can render null on the first frame instead of flashing classic.
 */
import { useGameStore } from '../store';

describe('gameModeConfirmed', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('is false in initialState', () => {
    expect(useGameStore.getState().gameModeConfirmed).toBe(false);
  });

  it('becomes true after setGameMode', () => {
    useGameStore.getState().setGameMode('blast');
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
  });

  it('becomes true after setGameMode with classic', () => {
    useGameStore.getState().setGameMode('classic');
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
  });

  it('becomes true after batchStartGame without explicit gameMode', () => {
    useGameStore.getState().batchStartGame({ gameActive: true });
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
  });

  it('becomes true after batchStartGame with explicit gameMode', () => {
    useGameStore.getState().batchStartGame({ gameMode: 'blast', gameActive: true });
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
  });

  it('resets to false after resetAll', () => {
    useGameStore.getState().setGameMode('blast');
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
    useGameStore.getState().resetAll();
    expect(useGameStore.getState().gameModeConfirmed).toBe(false);
  });

  it('remains true after resetForNewRound (mode is still known between rounds)', () => {
    useGameStore.getState().setGameMode('classic');
    useGameStore.getState().resetForNewRound();
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
  });
});
