/**
 * Test: hostSelectedGameMode persists the host's intended game mode
 * across rounds, separately from the resolved gameMode.
 *
 * Bug: In multiplayer, when host selects "random" mode, the server resolves
 * it (e.g., to 'blast') and overwrites the store's `gameMode` field.
 * On the next round, the ResultsPage defaults to the resolved mode instead
 * of preserving the host's "random" intent — so subsequent rounds stay on
 * the rolled mode instead of re-rolling.
 *
 * Fix: A separate `hostSelectedGameMode` field tracks the host's intent,
 * preserved across `batchStartGame` and `resetForNewRound` so "random"
 * survives round transitions.
 */
import { useGameStore } from '../store';

describe('hostSelectedGameMode (host intent persistence)', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('defaults to "random" on a fresh store', () => {
    expect(useGameStore.getState().hostSelectedGameMode).toBe('random');
  });

  it('updates via setHostSelectedGameMode action', () => {
    const store = useGameStore;
    store.getState().setHostSelectedGameMode('classic');
    expect(store.getState().hostSelectedGameMode).toBe('classic');

    store.getState().setHostSelectedGameMode('random');
    expect(store.getState().hostSelectedGameMode).toBe('random');
  });

  it('survives batchStartGame even when resolved gameMode differs', () => {
    const store = useGameStore;

    // Host picks "random" in lobby
    store.getState().setHostSelectedGameMode('random');

    // Server resolves random → blast and broadcasts gameStarting
    store.getState().batchStartGame({
      letterGrid: [['A', 'B'], ['C', 'D']],
      remainingTime: 120,
      gameMode: 'blast',
      gameActive: true,
    });

    const state = store.getState();
    expect(state.gameMode).toBe('blast'); // resolved mode applied
    expect(state.hostSelectedGameMode).toBe('random'); // intent preserved
  });

  it('survives resetForNewRound', () => {
    const store = useGameStore;

    store.getState().setHostSelectedGameMode('random');
    store.getState().resetForNewRound();

    expect(store.getState().hostSelectedGameMode).toBe('random');
  });

  it('is reset to default by resetAll', () => {
    const store = useGameStore;

    store.getState().setHostSelectedGameMode('classic');
    store.getState().resetAll();

    expect(store.getState().hostSelectedGameMode).toBe('random');
  });
});
