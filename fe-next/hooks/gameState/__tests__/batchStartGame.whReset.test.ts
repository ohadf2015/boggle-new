/**
 * Test: batchStartGame always resets Word Hunt state,
 * even when starting a non-WH game (e.g. Classic).
 */
import { useGameStore } from '../store';

describe('batchStartGame Word Hunt state reset', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('resets WH state when starting a Classic game without wordHuntTargetLength', () => {
    const store = useGameStore;

    // Simulate stale WH state from a previous Word Hunt game
    store.setState({
      wordHuntTargetFound: true,
      wordHuntTargetAttempts: [
        { guess: 'hello', feedback: [] },
        { guess: 'world', feedback: [] },
      ],
      wordHuntDiscoveryClues: [
        { position: 0, letter: 'h' },
        { position: 1, letter: 'e' },
      ],
      wordHuntKnownLetters: ['h'],
      wordHuntPlayerLives: { player1: 2 },
    });

    // Start a Classic game (no wordHuntTargetLength provided)
    store.getState().batchStartGame({
      letterGrid: [['A', 'B'], ['C', 'D']],
      remainingTime: 120,
      gameMode: 'classic',
      gameActive: true,
    });

    const state = store.getState();
    expect(state.wordHuntTargetFound).toBe(false);
    expect(state.wordHuntTargetAttempts).toEqual([]);
    expect(state.wordHuntDiscoveryClues).toEqual([]);
    expect(state.wordHuntKnownLetters).toEqual([]);
    expect(state.wordHuntPlayerLives).toEqual({});
  });
});
