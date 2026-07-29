/**
 * Word Hunt Handler Tests
 * Tests for target word guess submission (correct/wrong flows, elimination)
 */

// Mock dependencies before imports
vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  updatePlayerScore: vi.fn(),
  addPlayerEventBonus: vi.fn(),
}));

vi.mock('../../../backend/modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: vi.fn(),
}));

vi.mock('../../../backend/modules/wordHuntManager', () => ({
  validateTargetGuess: vi.fn(),
  recordTargetFound: vi.fn(),
  penalizeWrongGuess: vi.fn(),
}));

vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:TEST123'),
  safeEmit: vi.fn(),
}));

vi.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

vi.mock('../../../backend/services/gameLifecycle/gameEnd', () => ({
  endGame: vi.fn(),
}));

vi.mock('../../../backend/utils/logger', () => {
  const loggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  };
  return {
    __esModule: true,
    default: loggerMock,
  };
});

import { vi, type Mock, type MockInstance } from 'vitest';
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

const mockGetGame = getGame as Mock;
const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockGetUsernameBySocketId = getUsernameBySocketId as Mock;
const mockValidateTargetGuess = validateTargetGuess as Mock;
const mockRecordTargetFound = recordTargetFound as Mock;
const mockPenalizeWrongGuess = penalizeWrongGuess as Mock;
const mockBroadcastToRoom = broadcastToRoom as Mock;

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
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSocket = {
      id: 'socket-1',
      emit: vi.fn(),
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
      mockRecordTargetFound.mockReturnValue({ isFirstFinder: true, bonus: 500 });

      handleSubmitTargetWord(mockIo, mockSocket, { guess: 'hello' });

      // Should emit result to submitter
      expect(mockSocket.emit).toHaveBeenCalledWith('wordHuntTargetResult', expect.objectContaining({
        guess: 'hello',
        correct: true,
        isFirstFinder: true,
        bonus: 500,
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
