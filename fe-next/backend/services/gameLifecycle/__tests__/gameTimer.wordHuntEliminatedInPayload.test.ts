/**
 * TDD RED: gameTimer wordHuntLifeUpdate should include eliminatedPlayers
 *
 * Bug: The wordHuntLifeUpdate event only sends { playerLives } but not
 * eliminatedPlayers. Reconnecting clients miss individual elimination events.
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
}));

import { getGame } from '../../../modules/gameStateManager';
import { broadcastToRoom } from '../../../utils/socketHelpers';
import { drainLife } from '../../../modules/wordHuntManager';
import { startGameTimer } from '../gameTimer';

const mockGetGame = getGame as jest.Mock;
const mockBroadcastToRoom = broadcastToRoom as jest.Mock;
const mockDrainLife = drainLife as jest.Mock;

describe('gameTimer wordHuntLifeUpdate includes eliminatedPlayers', () => {
  let mockIo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIo = {};
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should include eliminatedPlayers array in wordHuntLifeUpdate payload', () => {
    // GIVEN: word-hunt game with one already-eliminated player
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 50, bob: 0 },
      eliminatedPlayers: ['bob'],
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
      updatedLives: { alice: 48, bob: 0 },
      newlyEliminated: [],
    });

    // WHEN: timer ticks
    startGameTimer(mockIo, 'HUNT01', 60);
    jest.advanceTimersByTime(1000);

    // THEN: wordHuntLifeUpdate includes eliminatedPlayers
    const lifeUpdateCall = mockBroadcastToRoom.mock.calls.find(
      (call: any[]) => call[2] === 'wordHuntLifeUpdate'
    );
    expect(lifeUpdateCall).toBeDefined();
    expect(lifeUpdateCall![3]).toEqual({
      playerLives: { alice: 48, bob: 0 },
      eliminatedPlayers: ['bob'],
    });
  });

  it('should include newly eliminated players in eliminatedPlayers', () => {
    // GIVEN: word-hunt game where bob is about to be eliminated
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 50, bob: 2 },
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
      updatedLives: { alice: 48, bob: 0 },
      newlyEliminated: ['bob'],
    });

    // WHEN: timer ticks
    startGameTimer(mockIo, 'HUNT01', 60);
    jest.advanceTimersByTime(1000);

    // THEN: wordHuntLifeUpdate includes bob in eliminatedPlayers
    // (after the newly eliminated are pushed to huntState.eliminatedPlayers)
    const lifeUpdateCall = mockBroadcastToRoom.mock.calls.find(
      (call: any[]) => call[2] === 'wordHuntLifeUpdate'
    );
    expect(lifeUpdateCall).toBeDefined();
    expect(lifeUpdateCall![3].eliminatedPlayers).toContain('bob');
  });
});
