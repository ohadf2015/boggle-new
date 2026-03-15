/**
 * Word Hunt Handler - First Finder Bonus Scoring Test
 * Verifies that the 50-point first-finder bonus is applied to player score.
 */

jest.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: jest.fn(),
  getGameBySocketId: jest.fn(),
  getUsernameBySocketId: jest.fn(),
  updatePlayerScore: jest.fn(),
}));

jest.mock('../../../backend/modules/wordHuntManager', () => ({
  validateTargetGuess: jest.fn(),
  recordTargetFound: jest.fn(),
  penalizeWrongGuess: jest.fn(),
}));

jest.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  getGameRoom: jest.fn().mockImplementation((code: string) => `game:${code}`),
}));

jest.mock('../../../backend/services/gameLifecycle/gameEnd', () => ({
  endGame: jest.fn(),
}));

jest.mock('../../../backend/utils/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

const {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updatePlayerScore,
} = require('../../../backend/modules/gameStateManager');

const {
  validateTargetGuess,
  recordTargetFound,
} = require('../../../backend/modules/wordHuntManager');

import { handleSubmitTargetWord } from '../wordHuntHandler';

function makeHuntGame() {
  return {
    gameCode: 'HUNT1',
    gameState: 'in-progress',
    gameMode: 'word-hunt',
    wordHuntState: {
      targetWord: 'apple',
      targetWordLength: 5,
      playerLives: { player1: 80 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    },
  };
}

function makeMockSocket() {
  return {
    id: 'socket-p1',
    emit: jest.fn(),
  };
}

describe('wordHuntHandler - first finder bonus scoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getGameBySocketId.mockReturnValue('HUNT1');
    getUsernameBySocketId.mockReturnValue('player1');
    getGame.mockReturnValue(makeHuntGame());
  });

  it('should apply first-finder bonus to player score via updatePlayerScore', () => {
    // GIVEN: Player guesses the target word correctly and is first finder
    validateTargetGuess.mockReturnValue(['correct', 'correct', 'correct', 'correct', 'correct']);
    recordTargetFound.mockReturnValue({ isFirstFinder: true, bonus: 50 });

    const socket = makeMockSocket();
    const io = { on: jest.fn() } as any;

    // WHEN: Player submits the correct target word
    handleSubmitTargetWord(io, socket as any, { guess: 'apple' });

    // THEN: updatePlayerScore should be called with the 50-point bonus
    expect(updatePlayerScore).toHaveBeenCalledWith('HUNT1', 'player1', 50, true);
  });

  it('should NOT call updatePlayerScore when bonus is 0 (not first finder)', () => {
    // GIVEN: Player guesses correctly but is NOT the first finder
    validateTargetGuess.mockReturnValue(['correct', 'correct', 'correct', 'correct', 'correct']);
    recordTargetFound.mockReturnValue({ isFirstFinder: false, bonus: 0 });

    const socket = makeMockSocket();
    const io = { on: jest.fn() } as any;

    // WHEN: Player submits the correct target word
    handleSubmitTargetWord(io, socket as any, { guess: 'apple' });

    // THEN: updatePlayerScore should NOT be called (no bonus)
    expect(updatePlayerScore).not.toHaveBeenCalled();
  });
});
