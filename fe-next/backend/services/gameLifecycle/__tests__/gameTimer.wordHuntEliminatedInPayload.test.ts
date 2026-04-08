/**
 * TDD RED: gameTimer wordHuntLifeUpdate should include eliminatedPlayers
 *
 * Bug: The wordHuntLifeUpdate event only sends { playerLives } but not
 * eliminatedPlayers. Reconnecting clients miss individual elimination events.
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
  areAllPlayersEliminated: vi.fn().mockReturnValue(false),
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { broadcastToRoom } from '../../../utils/socketHelpers';
import { drainLife } from '../../../modules/wordHuntManager';
import { startGameTimer } from '../gameTimer';

const mockGetGame = getGame as Mock;
const mockBroadcastToRoom = broadcastToRoom as Mock;
const mockDrainLife = drainLife as Mock;

describe('gameTimer wordHuntLifeUpdate includes eliminatedPlayers', () => {
  let mockIo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIo = {};
  });

  afterEach(() => {
    vi.useRealTimers();
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
    vi.advanceTimersByTime(1000);

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
    vi.advanceTimersByTime(1000);

    // THEN: wordHuntLifeUpdate includes bob in eliminatedPlayers
    // (after the newly eliminated are pushed to huntState.eliminatedPlayers)
    const lifeUpdateCall = mockBroadcastToRoom.mock.calls.find(
      (call: any[]) => call[2] === 'wordHuntLifeUpdate'
    );
    expect(lifeUpdateCall).toBeDefined();
    expect(lifeUpdateCall![3].eliminatedPlayers).toContain('bob');
  });
});
