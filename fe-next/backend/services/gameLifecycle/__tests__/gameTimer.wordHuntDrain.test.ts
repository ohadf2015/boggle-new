/**
 * Test: Game timer calls drainLife for word-hunt mode games
 *
 * TDD RED phase — verifies life drain is wired into timer tick
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

import { vi, type Mock, type MockInstance } from 'vitest';
import { getGame, updateGame } from '../../../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../../../utils/socketHelpers';
import { clearGameTimer } from '../../../utils/timerManager';
import { drainLife, areAllPlayersEliminated } from '../../../modules/wordHuntManager';
import { endGame } from '../gameEnd';
import { startGameTimer } from '../gameTimer';

const mockGetGame = getGame as Mock;
const mockUpdateGame = updateGame as Mock;
const mockBroadcastToRoom = broadcastToRoom as Mock;
const mockDrainLife = drainLife as Mock;
const mockAreAllPlayersEliminated = areAllPlayersEliminated as Mock;
const mockClearGameTimer = clearGameTimer as Mock;
const mockEndGame = endGame as Mock;

describe('gameTimer word hunt life drain', () => {
  let mockIo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIo = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call drainLife on each tick for word-hunt games', () => {
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 100, bob: 100 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    };

    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'word-hunt',
      wordHuntState: huntState,
      letterGrid: [['A']],
      language: 'en',
      gameSessionId: 'sess-1',
    });

    mockDrainLife.mockReturnValue({
      updatedLives: { alice: 98, bob: 98 },
      newlyEliminated: [],
    });

    startGameTimer(mockIo, 'HUNT01', 60);

    // Advance one tick
    vi.advanceTimersByTime(1000);

    expect(mockDrainLife).toHaveBeenCalledWith(huntState, expect.any(Number));
  });

  it('should broadcast wordHuntLifeUpdate after drain', () => {
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 100, bob: 100 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    };

    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'word-hunt',
      wordHuntState: huntState,
      letterGrid: [['A']],
      language: 'en',
      gameSessionId: 'sess-1',
    });

    mockDrainLife.mockReturnValue({
      updatedLives: { alice: 98, bob: 98 },
      newlyEliminated: [],
    });

    startGameTimer(mockIo, 'HUNT01', 60);
    vi.advanceTimersByTime(1000);

    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      mockIo,
      'room:HUNT01',
      'wordHuntLifeUpdate',
      { playerLives: { alice: 98, bob: 98 }, eliminatedPlayers: [] },
    );
  });

  it('should broadcast wordHuntEliminated when player hits 0', () => {
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 100, bob: 2 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    };

    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'word-hunt',
      wordHuntState: huntState,
      letterGrid: [['A']],
      language: 'en',
      gameSessionId: 'sess-1',
    });

    mockDrainLife.mockReturnValue({
      updatedLives: { alice: 98, bob: 0 },
      newlyEliminated: ['bob'],
    });

    startGameTimer(mockIo, 'HUNT01', 60);
    vi.advanceTimersByTime(1000);

    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      mockIo,
      'room:HUNT01',
      'wordHuntEliminated',
      { username: 'bob' },
    );
  });

  it('should NOT call drainLife for non-word-hunt games', () => {
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'classic',
      letterGrid: [['A']],
      language: 'en',
      gameSessionId: 'sess-1',
    });

    startGameTimer(mockIo, 'CLASSIC01', 60);
    vi.advanceTimersByTime(1000);

    expect(mockDrainLife).not.toHaveBeenCalled();
  });

  it('should end game early when all word-hunt players are eliminated', () => {
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 2, bob: 2 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    };

    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'word-hunt',
      wordHuntState: huntState,
      letterGrid: [['A']],
      language: 'en',
      gameSessionId: 'sess-1',
    });

    mockDrainLife.mockReturnValue({
      updatedLives: { alice: 0, bob: 0 },
      newlyEliminated: ['alice', 'bob'],
    });

    mockAreAllPlayersEliminated.mockReturnValue(true);

    startGameTimer(mockIo, 'HUNT01', 60);
    vi.advanceTimersByTime(1000);

    expect(mockClearGameTimer).toHaveBeenCalledWith('HUNT01');
    expect(mockEndGame).toHaveBeenCalledWith(mockIo, 'HUNT01');
  });

  it('should NOT end game early when some word-hunt players are still alive', () => {
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 100, bob: 2 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    };

    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'word-hunt',
      wordHuntState: huntState,
      letterGrid: [['A']],
      language: 'en',
      gameSessionId: 'sess-1',
    });

    mockDrainLife.mockReturnValue({
      updatedLives: { alice: 98, bob: 0 },
      newlyEliminated: ['bob'],
    });

    mockAreAllPlayersEliminated.mockReturnValue(false);

    startGameTimer(mockIo, 'HUNT01', 60);
    vi.advanceTimersByTime(1000);

    // endGame should NOT have been called (only clearGameTimer from init is ok)
    expect(mockEndGame).not.toHaveBeenCalled();
  });
});
