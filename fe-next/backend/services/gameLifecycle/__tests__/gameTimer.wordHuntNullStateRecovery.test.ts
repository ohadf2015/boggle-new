/**
 * Test: Game timer self-heals a word-hunt round whose wordHuntState is NULL.
 *
 * Edge case: a round-start path forgets to init wordHuntState, so the per-tick
 * drain branch is skipped — no life drain, no elimination, no round-end. The
 * board freezes forever (players can still submit words but the game never
 * concludes). Fix: after N consecutive NULL-state ticks, force-end the round
 * idempotently so players keep their accumulated word scores instead of a
 * permanently frozen screen. A late init before the threshold cancels recovery.
 *
 * TDD RED — mirrors gameTimer.wordHuntDrain.test.ts harness.
 */

vi.mock('../../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  updateGame: vi.fn(),
}));

vi.mock('../../../modules/communityWordManager', () => ({
  resetGameAIValidationCount: vi.fn(),
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:HUNT01'),
}));

vi.mock('../../../utils/timerManager', () => ({ default: {
  clearGameTimer: vi.fn(),
  setGameTimer: vi.fn(),
}, clearGameTimer: vi.fn(), setGameTimer: vi.fn() }));

vi.mock('../botGame', () => ({
  startBotsForGame: vi.fn(),
}));

vi.mock('../gameEnd', () => ({
  endGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../modules/wordHuntManager', () => ({
  drainLife: vi.fn(),
  areAllPlayersEliminated: vi.fn(),
}));

import { vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { clearGameTimer } from '../../../utils/timerManager';
import { drainLife, areAllPlayersEliminated } from '../../../modules/wordHuntManager';
import { endGame } from '../gameEnd';
import { startGameTimer } from '../gameTimer';

const mockGetGame = getGame as Mock;
const mockClearGameTimer = clearGameTimer as Mock;
const mockDrainLife = drainLife as Mock;
const mockAreAllPlayersEliminated = areAllPlayersEliminated as Mock;
const mockEndGame = endGame as Mock;

const nullStateGame = {
  gameState: 'in-progress',
  gameMode: 'word-hunt',
  wordHuntState: null,
  letterGrid: [['A']],
  language: 'en',
  gameSessionId: 'sess-1',
};

describe('gameTimer word-hunt NULL-state self-heal', () => {
  let mockIo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIo = {};
    mockAreAllPlayersEliminated.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    mockEndGame.mockResolvedValue(undefined);
  });

  it('does NOT end the game on a single NULL-state tick (transient guard)', () => {
    mockGetGame.mockReturnValue(nullStateGame);

    startGameTimer(mockIo, 'HUNT01', 60);
    vi.advanceTimersByTime(1000); // one tick

    expect(mockEndGame).not.toHaveBeenCalled();
  });

  it('force-ends the round after 3 consecutive NULL-state ticks', () => {
    mockGetGame.mockReturnValue(nullStateGame);

    startGameTimer(mockIo, 'HUNT01', 60);
    vi.advanceTimersByTime(3000); // three ticks

    expect(mockClearGameTimer).toHaveBeenCalledWith('HUNT01');
    expect(mockEndGame).toHaveBeenCalledWith(mockIo, 'HUNT01');
  });

  it('cancels recovery when wordHuntState appears before the threshold', () => {
    const healthyHuntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 100 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    };
    mockDrainLife.mockReturnValue({ updatedLives: { alice: 98 }, newlyEliminated: [] });

    // startGameTimer + tick 1 issue 3 getGame calls (init, tick-1 broadcast,
    // tick-1 drain) — keep those NULL, then state is initialised (late init).
    let calls = 0;
    mockGetGame.mockImplementation(() => {
      calls += 1;
      return calls <= 3 ? nullStateGame : { ...nullStateGame, wordHuntState: healthyHuntState };
    });

    startGameTimer(mockIo, 'HUNT01', 60);
    vi.advanceTimersByTime(5000); // five ticks — only the first was NULL

    expect(mockEndGame).not.toHaveBeenCalled();
    expect(mockDrainLife).toHaveBeenCalled();
  });

  it('does not force-end a non-word-hunt game that lacks wordHuntState', () => {
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'classic',
      letterGrid: [['A']],
      language: 'en',
      gameSessionId: 'sess-1',
    });

    startGameTimer(mockIo, 'CLASSIC01', 60);
    vi.advanceTimersByTime(5000);

    expect(mockEndGame).not.toHaveBeenCalled();
  });
});
