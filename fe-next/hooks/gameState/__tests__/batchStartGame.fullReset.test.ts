/**
 * Test: batchStartGame performs a full reset before applying overrides.
 * Ensures no stale state bleeds between game rounds across all game modes.
 */
import { useGameStore } from '../store';

describe('batchStartGame full state reset', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('resets blast fields when starting a new game after a Blast game', () => {
    const store = useGameStore;

    // Simulate stale Blast state from a previous game
    store.setState({
      blastComboSync: { comboType: 'lightning', username: 'player1', id: 'abc' },
      blastOpponentActivity: [{ id: '1', username: 'opponent', type: 'word', word: 'hello', score: 50 }],
      blastPlayerStats: { player1: { score: 500, words: 10 } as any },
      blastTotalTileBonus: 150,
      blastTotalTilesCleared: 42,
      blastBoardUpdate: { grid: [['A']], tileStates: [[0 as any]], clearedBy: 'x', word: 'test', clearedCount: 1, totalMoves: 5 },
      blastBoardClears: 3,
    });

    // Start a new Classic game
    store.getState().batchStartGame({
      letterGrid: [['A', 'B'], ['C', 'D']],
      remainingTime: 120,
      gameMode: 'classic',
      gameActive: true,
    });

    const state = store.getState();
    expect(state.blastComboSync).toBeNull();
    expect(state.blastOpponentActivity).toEqual([]);
    expect(state.blastPlayerStats).toEqual({});
    expect(state.blastTotalTileBonus).toBe(0);
    expect(state.blastTotalTilesCleared).toBe(0);
    expect(state.blastBoardUpdate).toBeNull();
    expect(state.blastBoardClears).toBe(0);
  });

  it('resets UI and combo state when starting a new game', () => {
    const store = useGameStore;

    // Simulate stale UI/combo state
    store.setState({
      waitingForResults: true,
      highlightedCells: [{ row: 0, col: 1 }],
      shufflingGrid: [['X', 'Y'], ['Z', 'W']],
      combo: { level: 5, lastWordTime: Date.now(), shieldsUsed: 2 },
      leaderboard: [{ username: 'player1', score: 100 } as any],
      totalBoardWords: 50,
    });

    store.getState().batchStartGame({
      letterGrid: [['A', 'B'], ['C', 'D']],
      remainingTime: 60,
      gameMode: 'classic',
      gameActive: true,
    });

    const state = store.getState();
    expect(state.waitingForResults).toBe(false);
    expect(state.highlightedCells).toEqual([]);
    expect(state.shufflingGrid).toBeNull();
    expect(state.combo).toEqual({ level: 0, lastWordTime: null, shieldsUsed: 0 });
    expect(state.leaderboard).toEqual([]);
    expect(state.totalBoardWords).toBeNull();
  });

  it('preserves explicitly provided overrides after full reset', () => {
    const store = useGameStore;

    store.getState().batchStartGame({
      letterGrid: [['X', 'Y'], ['Z', 'W']],
      remainingTime: 90,
      gameLanguage: 'en',
      minWordLength: 3,
      gameMode: 'blast',
      blastTileOverlay: [{ row: 0, col: 0, type: 'bomb' } as any],
      blastSeed: 12345,
      gameActive: true,
      showStartAnimation: true,
    });

    const state = store.getState();
    expect(state.letterGrid).toEqual([['X', 'Y'], ['Z', 'W']]);
    expect(state.remainingTime).toBe(90);
    expect(state.gameDuration).toBe(90);
    expect(state.gameLanguage).toBe('en');
    expect(state.minWordLength).toBe(3);
    expect(state.gameMode).toBe('blast');
    expect(state.blastTileOverlay).toEqual([{ row: 0, col: 0, type: 'bomb' }]);
    expect(state.blastSeed).toBe(12345);
    expect(state.gameActive).toBe(true);
    expect(state.showStartAnimation).toBe(true);
  });
});

describe('resetForNewRound completeness', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('resets wordHuntTargetFoundBy', () => {
    const store = useGameStore;

    store.setState({ wordHuntTargetFoundBy: 'player2' });
    store.getState().resetForNewRound();

    expect(store.getState().wordHuntTargetFoundBy).toBeNull();
  });
});
