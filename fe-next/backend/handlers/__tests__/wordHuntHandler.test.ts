/**
 * Word Hunt Handler Tests
 * Tests for target word guess submission (correct/wrong flows, elimination)
 */

// Mock dependencies before imports
jest.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: jest.fn(),
  getGameBySocketId: jest.fn(),
  getUsernameBySocketId: jest.fn(),
}));

jest.mock('../../../backend/modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: jest.fn(),
}));

jest.mock('../../../backend/modules/wordHuntManager', () => ({
  validateTargetGuess: jest.fn(),
  recordTargetFound: jest.fn(),
  penalizeWrongGuess: jest.fn(),
}));

jest.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  getGameRoom: jest.fn().mockReturnValue('room:TEST123'),
  safeEmit: jest.fn(),
}));

jest.mock('../../../backend/utils/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../backend/utils/logger', () => {
  const loggerMock = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  };
  return {
    __esModule: true,
    default: loggerMock,
  };
});

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
} from '../../modules/gameStateManager';

import {
  validateTargetGuess,
  recordTargetFound,
  penalizeWrongGuess,
} from '../../modules/wordHuntManager';

import { broadcastToRoom } from '../../utils/socketHelpers';

import { handleSubmitTargetWord } from '../../handlers/wordHuntHandler';

import type { WordHuntModeState } from '@/shared/types/game';

const mockGetGame = getGame as jest.Mock;
const mockGetGameBySocketId = getGameBySocketId as jest.Mock;
const mockGetUsernameBySocketId = getUsernameBySocketId as jest.Mock;
const mockValidateTargetGuess = validateTargetGuess as jest.Mock;
const mockRecordTargetFound = recordTargetFound as jest.Mock;
const mockPenalizeWrongGuess = penalizeWrongGuess as jest.Mock;
const mockBroadcastToRoom = broadcastToRoom as jest.Mock;

describe('wordHuntHandler', () => {
  let mockSocket: any;
  let mockIo: any;

  const createMockState = (overrides?: Partial<WordHuntModeState>): WordHuntModeState => ({
    targetWord: 'hello',
    targetWordLength: 5,
    playerLives: { alice: 80 },
    eliminatedPlayers: [],
    targetFoundBy: null,
    isFirstFinderClaimed: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = {
      id: 'socket-1',
      emit: jest.fn(),
    };
    mockIo = {};
    mockGetGameBySocketId.mockReturnValue('TEST123');
    mockGetUsernameBySocketId.mockReturnValue('alice');
  });

  describe('handleSubmitTargetWord', () => {
    it('should return error if player is not in a game', () => {
      mockGetGameBySocketId.mockReturnValue(null);

      handleSubmitTargetWord(mockIo, mockSocket, { guess: 'hello' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.any(String),
      }));
    });

    it('should return error if game is not found', () => {
      mockGetGame.mockReturnValue(null);

      handleSubmitTargetWord(mockIo, mockSocket, { guess: 'hello' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.any(String),
      }));
    });

    it('should return error if game mode is not word-hunt', () => {
      mockGetGame.mockReturnValue({
        gameState: 'in-progress',
        gameMode: 'classic',
        wordHuntState: createMockState(),
      });

      handleSubmitTargetWord(mockIo, mockSocket, { guess: 'hello' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.any(String),
      }));
    });

    it('should return error if player is eliminated', () => {
      mockGetGame.mockReturnValue({
        gameState: 'in-progress',
        gameMode: 'word-hunt',
        wordHuntState: createMockState({ eliminatedPlayers: ['alice'] }),
      });

      handleSubmitTargetWord(mockIo, mockSocket, { guess: 'hello' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.any(String),
      }));
    });

    it('should emit feedback and broadcast when guess is correct', () => {
      const huntState = createMockState();
      mockGetGame.mockReturnValue({
        gameState: 'in-progress',
        gameMode: 'word-hunt',
        wordHuntState: huntState,
      });

      mockValidateTargetGuess.mockReturnValue([
        'correct', 'correct', 'correct', 'correct', 'correct',
      ]);
      mockRecordTargetFound.mockReturnValue({ isFirstFinder: true, bonus: 50 });

      handleSubmitTargetWord(mockIo, mockSocket, { guess: 'hello' });

      // Should emit result to submitter
      expect(mockSocket.emit).toHaveBeenCalledWith('wordHuntTargetResult', expect.objectContaining({
        guess: 'hello',
        correct: true,
        isFirstFinder: true,
        bonus: 50,
      }));

      // Should broadcast to room
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        expect.any(String),
        'wordHuntTargetFound',
        expect.objectContaining({
          username: 'alice',
          targetWord: 'hello',
          isFirstFinder: true,
        }),
      );
    });

    it('should emit feedback and penalize when guess is wrong', () => {
      const huntState = createMockState();
      mockGetGame.mockReturnValue({
        gameState: 'in-progress',
        gameMode: 'word-hunt',
        wordHuntState: huntState,
      });

      mockValidateTargetGuess.mockReturnValue([
        'correct', 'absent', 'absent', 'absent', 'absent',
      ]);
      mockPenalizeWrongGuess.mockReturnValue({ livesRemaining: 75, eliminated: false });

      handleSubmitTargetWord(mockIo, mockSocket, { guess: 'hxxxx' });

      expect(mockSocket.emit).toHaveBeenCalledWith('wordHuntTargetResult', expect.objectContaining({
        guess: 'hxxxx',
        correct: false,
        livesRemaining: 75,
      }));
    });

    it('should broadcast elimination when player runs out of lives', () => {
      const huntState = createMockState({ playerLives: { alice: 3 } });
      mockGetGame.mockReturnValue({
        gameState: 'in-progress',
        gameMode: 'word-hunt',
        wordHuntState: huntState,
      });

      mockValidateTargetGuess.mockReturnValue([
        'absent', 'absent', 'absent', 'absent', 'absent',
      ]);
      mockPenalizeWrongGuess.mockReturnValue({ livesRemaining: -2, eliminated: true });

      handleSubmitTargetWord(mockIo, mockSocket, { guess: 'xxxxx' });

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        expect.any(String),
        'wordHuntEliminated',
        expect.objectContaining({
          username: 'alice',
        }),
      );
    });
  });
});
