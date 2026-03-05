/**
 * Test: Game timer calls drainLife for word-hunt mode games
 *
 * TDD RED phase — verifies life drain is wired into timer tick
 */

jest.mock('../../../modules/gameStateManager', () => ({
  getGame: jest.fn(),
  updateGame: jest.fn(),
}));

jest.mock('../../../modules/communityWordManager', () => ({
  resetGameAIValidationCount: jest.fn(),
}));

jest.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  getGameRoom: jest.fn().mockReturnValue('room:HUNT01'),
}));

jest.mock('../../../utils/timerManager', () => ({
  clearGameTimer: jest.fn(),
  setGameTimer: jest.fn(),
}));

jest.mock('../botGame', () => ({
  startBotsForGame: jest.fn(),
}));

jest.mock('../gameEnd', () => ({
  endGame: jest.fn(),
}));

jest.mock('../../../modules/wordHuntManager', () => ({
  drainLife: jest.fn(),
  areAllPlayersEliminated: jest.fn(),
}));

import { getGame, updateGame } from '../../../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../../../utils/socketHelpers';
import { clearGameTimer } from '../../../utils/timerManager';
import { drainLife, areAllPlayersEliminated } from '../../../modules/wordHuntManager';
import { endGame } from '../gameEnd';
import { startGameTimer } from '../gameTimer';

const mockGetGame = getGame as jest.Mock;
const mockUpdateGame = updateGame as jest.Mock;
const mockBroadcastToRoom = broadcastToRoom as jest.Mock;
const mockDrainLife = drainLife as jest.Mock;
const mockAreAllPlayersEliminated = areAllPlayersEliminated as jest.Mock;
const mockClearGameTimer = clearGameTimer as jest.Mock;
const mockEndGame = endGame as jest.Mock;

describe('gameTimer word hunt life drain', () => {
  let mockIo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIo = {};
  });

  afterEach(() => {
    jest.useRealTimers();
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
    jest.advanceTimersByTime(1000);

    expect(mockDrainLife).toHaveBeenCalledWith(huntState);
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
    jest.advanceTimersByTime(1000);

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
    jest.advanceTimersByTime(1000);

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
    jest.advanceTimersByTime(1000);

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
    jest.advanceTimersByTime(1000);

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
    jest.advanceTimersByTime(1000);

    // endGame should NOT have been called (only clearGameTimer from init is ok)
    expect(mockEndGame).not.toHaveBeenCalled();
  });
});
