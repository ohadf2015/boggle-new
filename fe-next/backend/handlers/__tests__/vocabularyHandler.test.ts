/**
 * Vocabulary Handler Tests
 * Tests for vocabulary word selection and lesson saving
 *
 * TDD: RED phase - These tests MUST fail initially
 */

import type { Socket } from 'socket.io';
import type { GameState } from '../../modules/gameState/types';

// Mock dependencies
jest.mock('../../modules/gameStateManager', () => ({
  getGame: jest.fn(),
  getGameBySocketId: jest.fn(),
}));

jest.mock('../../../hooks/wordIntegrationLogic', () => ({
  checkWordIntegration: jest.fn(),
}));

import { getGame, getGameBySocketId } from '../../modules/gameStateManager';
import { checkWordIntegration } from '@/hooks/wordIntegrationLogic';

// Import handlers to test (these don't exist yet - will fail)
import { handleSelectVocabularyWord, registerVocabularyHandlers } from '../vocabularyHandler';

describe('vocabularyHandler', () => {
  let mockSocket: jest.Mocked<Socket>;
  let mockGame: GameState;

  beforeEach(() => {
    // Create mock socket with writable id
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<Socket>;
    Object.defineProperty(mockSocket, 'id', {
      value: 'host-socket-123',
      writable: true,
      configurable: true,
    });

    // Create mock game state
    mockGame = {
      gameCode: 'TEST123',
      hostSocketId: 'host-socket-123',
      hostUsername: 'TestHost',
      roomName: 'Test Room',
      language: 'en',
      users: {},
      spectators: {},
      playerScores: {},
      playerWords: {},
      playerAchievements: {},
      playerCombos: {},
      gameState: 'finished',
      letterGrid: null,
      timerSeconds: 180,
      tournamentId: null,
      reconnectionTimeout: null,
      isRanked: false,
      allowLateJoin: true,
      aiApprovedWords: [],
      peerValidationWord: null,
      peerValidationVotes: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
      gameSessionId: 1,
      playersReadyForNextGame: {},
      selectedVocabulary: new Set<string>(),
    } as GameState;

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock returns
    (getGame as jest.Mock).mockReturnValue(mockGame);
    (getGameBySocketId as jest.Mock).mockReturnValue('TEST123');
    (checkWordIntegration as jest.Mock).mockReturnValue({
      word: 'cat',
      canIntegrate: true,
      reason: undefined,
    });
  });

  describe('selectVocabularyWord', () => {
    it('should add word to selection when host emits in finished state', async () => {
      // GIVEN: Host socket in finished game
      const payload = { word: 'CAT', include: true };

      // WHEN: Host selects a word
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: Word is added to selection
      expect(mockGame.selectedVocabulary?.has('CAT')).toBe(true);

      // AND: Socket receives updated selection with canIntegrate status
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'vocabularySelectionUpdated',
        expect.objectContaining({
          selectedWords: expect.arrayContaining([
            expect.objectContaining({
              word: 'CAT',
              canIntegrate: expect.any(Boolean),
            }),
          ]),
        })
      );
    });

    it('should reject when non-host emits', async () => {
      // GIVEN: Non-host socket
      Object.defineProperty(mockSocket, 'id', {
        value: 'player-socket-456',
        writable: true,
        configurable: true,
      });
      const payload = { word: 'CAT', include: true };

      // WHEN: Non-host tries to select word
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: Error emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Only host can select vocabulary words',
      });

      // AND: Word not added
      expect(mockGame.selectedVocabulary?.has('CAT')).toBe(false);
    });

    it('should reject when game not in finished state', async () => {
      // GIVEN: Game in playing state
      mockGame.gameState = 'in-progress';
      const payload = { word: 'CAT', include: true };

      // WHEN: Host tries to select word
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: Error emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Can only select words after game ends',
      });

      // AND: Word not added
      expect(mockGame.selectedVocabulary?.has('CAT')).toBe(false);
    });

    it('should remove word when include=false', async () => {
      // GIVEN: Word already selected
      mockGame.selectedVocabulary = new Set(['CAT']);
      const payload = { word: 'CAT', include: false };

      // WHEN: Host deselects word
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: Word removed from selection
      expect(mockGame.selectedVocabulary.has('CAT')).toBe(false);

      // AND: Updated selection emitted
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'vocabularySelectionUpdated',
        expect.objectContaining({
          selectedWords: [],
        })
      );
    });

    it('should reject invalid word (empty)', async () => {
      // GIVEN: Empty word payload
      const payload = { word: '', include: true };

      // WHEN: Host tries to select empty word
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: Error emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid word',
      });
    });

    it('should reject invalid word (whitespace only)', async () => {
      // GIVEN: Whitespace word payload
      const payload = { word: '   ', include: true };

      // WHEN: Host tries to select whitespace word
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: Error emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid word',
      });
    });

    it('should normalize word before adding (uppercase to lowercase)', async () => {
      // GIVEN: Uppercase word
      const payload = { word: 'ELEPHANT', include: true };
      (checkWordIntegration as jest.Mock).mockReturnValue({
        word: 'elephant',
        canIntegrate: true,
        reason: undefined,
      });

      // WHEN: Host selects uppercase word
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: Word added in uppercase (as stored)
      expect(mockGame.selectedVocabulary?.has('ELEPHANT')).toBe(true);

      // AND: checkWordIntegration called with normalized word
      expect(checkWordIntegration).toHaveBeenCalledWith('ELEPHANT', 'en');
    });

    it('should include canIntegrate status from useWordIntegration', async () => {
      // GIVEN: Word that cannot be integrated
      const payload = { word: 'XYZ', include: true };
      (checkWordIntegration as jest.Mock).mockReturnValue({
        word: 'xyz',
        canIntegrate: false,
        reason: 'word_not_in_dictionary',
      });

      // WHEN: Host selects non-dictionary word
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: Word still added (tracking only)
      expect(mockGame.selectedVocabulary?.has('XYZ')).toBe(true);

      // AND: Socket receives canIntegrate=false
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'vocabularySelectionUpdated',
        expect.objectContaining({
          selectedWords: expect.arrayContaining([
            expect.objectContaining({
              word: 'XYZ',
              canIntegrate: false,
            }),
          ]),
        })
      );
    });

    it('should handle multiple selected words', async () => {
      // GIVEN: Multiple words already selected
      mockGame.selectedVocabulary = new Set(['CAT', 'DOG', 'BIRD']);
      (checkWordIntegration as jest.Mock).mockImplementation((word: string) => ({
        word: word.toLowerCase(),
        canIntegrate: true,
        reason: undefined,
      }));

      // WHEN: Host selects another word
      const payload = { word: 'FISH', include: true };
      await handleSelectVocabularyWord(mockSocket, mockGame, payload);

      // THEN: All words included in response
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'vocabularySelectionUpdated',
        expect.objectContaining({
          selectedWords: expect.arrayContaining([
            expect.objectContaining({ word: 'CAT' }),
            expect.objectContaining({ word: 'DOG' }),
            expect.objectContaining({ word: 'BIRD' }),
            expect.objectContaining({ word: 'FISH' }),
          ]),
        })
      );
    });
  });

  describe('registerVocabularyHandlers', () => {
    it('should register selectVocabularyWord event handler', () => {
      // GIVEN: Mock socket and getGame function
      const mockGetGame = jest.fn().mockReturnValue(mockGame);

      // WHEN: Registering handlers
      registerVocabularyHandlers(mockSocket, mockGetGame);

      // THEN: Socket.on called with 'selectVocabularyWord'
      expect(mockSocket.on).toHaveBeenCalledWith(
        'selectVocabularyWord',
        expect.any(Function)
      );
    });
  });
});
