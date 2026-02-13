/**
 * Duel Gameplay Handlers Tests
 * TDD tests for score submission and duel completion
 */

import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerGameplayHandlers } from '../gameplay';

// Mock dependencies
jest.mock('@/backend/modules/supabase/client');
jest.mock('@/backend/modules/wordValidatorPool');
jest.mock('@/backend/dictionary');
jest.mock('@/backend/modules/scoringEngine.types');
jest.mock('@/backend/utils/logger');

describe('Duel Gameplay Handlers', () => {
  let mockSocket: Partial<DuelSocket>;
  let mockNamespace: Partial<Namespace>;
  let mockSupabaseClient: any;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockSingle: jest.Mock;
  let emittedEvents: Array<{ event: string; data: any }>;
  let roomEmittedEvents: Array<{ room: string; event: string; data: any }>;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    emittedEvents = [];
    roomEmittedEvents = [];

    // Setup mock socket
    mockSocket = {
      data: {
        userId: 'user-1',
        displayName: 'Player 1',
        classroomIds: ['classroom-1'],
      },
      emit: jest.fn((event: string, data: any) => {
        emittedEvents.push({ event, data });
      }),
      on: jest.fn(),
    } as any;

    // Setup mock namespace
    mockNamespace = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn((event: string, data: any) => {
          const roomCall = (mockNamespace.to as jest.Mock).mock.calls[
            (mockNamespace.to as jest.Mock).mock.calls.length - 1
          ];
          const room = roomCall[0];
          roomEmittedEvents.push({ room, event, data });
        }),
      }),
    } as any;

    // Setup Supabase mock - we'll configure per test
    mockSingle = jest.fn();
    mockEq = jest.fn();
    mockSelect = jest.fn();
    mockInsert = jest.fn();
    mockUpdate = jest.fn();
    mockFrom = jest.fn();

    mockSupabaseClient = {
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Mock getSupabase
    const { getSupabase } = require('@/backend/modules/supabase/client');
    getSupabase.mockReturnValue(mockSupabaseClient);
  });

  describe('duel:submit-score', () => {
    it('should validate words server-side and calculate score', async () => {
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        wordsFound: ['test', 'word', 'invalid'],
      };

      // Setup Supabase mock chains
      // Chain 1: Fetch duel
      const duelSelectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: '550e8400-e29b-41d4-a716-446655440001',
              status: 'active',
              challenger_id: 'user-1',
              opponent_id: 'user-2',
              challenger_score: 0,
              opponent_score: 0,
              board_state: [
                ['T', 'E', 'S', 'T'],
                ['W', 'O', 'R', 'D'],
                ['X', 'Y', 'Z', 'A'],
                ['B', 'C', 'D', 'E'],
              ],
              lesson_id: '550e8400-e29b-41d4-a716-446655440001',
            },
            error: null,
          }),
        }),
      });

      // Chain 2: Fetch lesson
      const lessonSelectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { language: 'en' },
            error: null,
          }),
        }),
      });

      // Chain 3: Insert turn
      const turnInsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: '550e8400-e29b-41d4-a716-446655440002', score: 7, words_found: ['test', 'word'] },
            error: null,
          }),
        }),
      });

      // Chain 4: Update duel
      const duelUpdateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: '550e8400-e29b-41d4-a716-446655440001',
                challenger_id: 'user-1',
                opponent_id: 'user-2',
                challenger_score: 7,
                opponent_score: 0,
              },
              error: null,
            }),
          }),
        }),
      });

      // Setup from() to return appropriate chain
      mockFrom.mockImplementation((table: string) => {
        if (table === 'student_duels') {
          // First call is select (fetch duel)
          // Second call is update
          if (!mockFrom.mock.calls.find(c => c[0] === 'duel_turns')) {
            return { select: duelSelectMock, update: duelUpdateMock };
          }
          return { update: duelUpdateMock };
        }
        if (table === 'vocabulary_lessons') {
          return { select: lessonSelectMock };
        }
        if (table === 'duel_turns') {
          return { insert: turnInsertMock };
        }
        return {};
      });

      // Mock word validation
      const { isDictionaryWord } = require('@/backend/dictionary');
      isDictionaryWord.mockImplementation((word: string) => {
        return ['test', 'word'].includes(word.toLowerCase());
      });

      const { isWordOnBoardAsync } = require('@/backend/modules/wordValidatorPool');
      isWordOnBoardAsync.mockImplementation((word: string) => {
        return Promise.resolve(['test', 'word'].includes(word.toLowerCase()));
      });

      // Mock score calculation
      const { calculateWordScore } = require('@/backend/modules/scoringEngine.types');
      calculateWordScore.mockImplementation((word: string) => word.length - 1);

      // Register handlers
      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      // Get the registered handler
      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      expect(submitScoreHandler).toBeDefined();

      // Execute handler
      await submitScoreHandler(payload);

      // Debug: check for errors
      const errorEvents = emittedEvents.filter((e) => e.event === 'duel:error');
      if (errorEvents.length > 0) {
        console.log('Errors emitted:', errorEvents);
      }

      // Verify word validation was called
      expect(isDictionaryWord).toHaveBeenCalledWith('test', 'en');
      expect(isDictionaryWord).toHaveBeenCalledWith('word', 'en');
      expect(isDictionaryWord).toHaveBeenCalledWith('invalid', 'en');

      expect(isWordOnBoardAsync).toHaveBeenCalledWith('test', expect.any(Array));
      expect(isWordOnBoardAsync).toHaveBeenCalledWith('word', expect.any(Array));

      // Verify score calculation
      expect(calculateWordScore).toHaveBeenCalledWith('test', 0);
      expect(calculateWordScore).toHaveBeenCalledWith('word', 0);

      // Verify turn was inserted
      expect(turnInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          duel_id: '550e8400-e29b-41d4-a716-446655440001',
          player_id: 'user-1',
          score: 7,
          words_found: ['test', 'word'],
        })
      );

      // Verify duel score was updated
      expect(duelUpdateMock).toHaveBeenCalledWith({ challenger_score: 7 });

      // Verify event emitted
      const scoreSubmittedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:score-submitted'
      );
      expect(scoreSubmittedEvent).toBeDefined();
      expect(scoreSubmittedEvent?.data).toMatchObject({
        playerId: 'user-1',
        score: 7,
        wordsValidated: 2,
        wordsRejected: 1,
      });
    });

    it('should reject submission when not a participant', async () => {
      // RED: Test should fail because handler doesn't exist
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        wordsFound: ['test'],
      };

      // Mock duel with different participants
      mockSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'active',
          challenger_id: 'other-user-1',
          opponent_id: 'other-user-2',
          board_state: [['T', 'E', 'S', 'T']],
        },
        error: null,
      });

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      // Verify error emitted
      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('not a participant');
    });

    it('should reject submission on non-active duel', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        wordsFound: ['test'],
      };

      // Mock completed duel
      mockSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'completed',
          challenger_id: 'user-1',
          opponent_id: 'user-2',
        },
        error: null,
      });

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('not active');
    });

    it('should handle empty words array (score = 0)', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        wordsFound: [],
      };

      mockSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'active',
          challenger_id: 'user-1',
          opponent_id: 'user-2',
          board_state: [['T', 'E', 'S', 'T']],
          lesson_id: '550e8400-e29b-41d4-a716-446655440001',
        },
        error: null,
      });

      mockSingle.mockResolvedValueOnce({
        data: { language: 'en' },
        error: null,
      });

      mockSingle.mockResolvedValueOnce({
        data: { id: '550e8400-e29b-41d4-a716-446655440002', score: 0, words_found: [] },
        error: null,
      });

      mockSingle.mockResolvedValueOnce({
        data: { id: '550e8400-e29b-41d4-a716-446655440001', challenger_score: 0 },
        error: null,
      });

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      const scoreSubmittedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:score-submitted'
      );
      expect(scoreSubmittedEvent?.data.score).toBe(0);
      expect(scoreSubmittedEvent?.data.wordsValidated).toBe(0);
    });
  });

  describe('duel completion', () => {
    it('should determine winner and award XP when both players submit', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        wordsFound: ['test'],
      };

      // First submission (challenger submits first)
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            status: 'active',
            challenger_id: 'user-1',
            opponent_id: 'user-2',
            board_state: [['T', 'E', 'S', 'T']],
            lesson_id: '550e8400-e29b-41d4-a716-446655440001',
            challenger_score: 0,
            opponent_score: 10, // Opponent already submitted
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: { language: 'en' }, error: null })
        .mockResolvedValueOnce({
          data: { id: '550e8400-e29b-41d4-a716-446655440002', score: 5, words_found: ['test'] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            challenger_score: 5,
            opponent_score: 10,
          },
          error: null,
        });

      const { isDictionaryWord } = require('@/backend/dictionary');
      isDictionaryWord.mockReturnValue(true);

      const { isWordOnBoardAsync } = require('@/backend/modules/wordValidatorPool');
      isWordOnBoardAsync.mockResolvedValue(true);

      const { calculateWordScore } = require('@/backend/modules/scoringEngine.types');
      calculateWordScore.mockReturnValue(5);

      // Mock completion update (race condition protection)
      mockUpdate.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'completed',
          winner_id: 'user-2', // Opponent wins (10 > 5)
          xp_awarded: true,
        },
        error: null,
        count: 1, // Indicates update succeeded
      });

      // Mock XP RPC calls
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: null, error: null }) // Winner XP
        .mockResolvedValueOnce({ data: null, error: null }); // Loser XP

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      // Verify completion event emitted
      const completedEvent = roomEmittedEvents.find((e) => e.event === 'duel:completed');
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data).toMatchObject({
        winnerId: 'user-2',
        challengerScore: 5,
        opponentScore: 10,
        xpAwarded: {
          winner: 200,
          loser: 120,
        },
      });

      // Verify XP awarded
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-2',
        p_xp_amount: 200,
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-1',
        p_xp_amount: 120,
      });
    });

    it('should handle tie game (both scores equal)', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        wordsFound: ['test'],
      };

      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            status: 'active',
            challenger_id: 'user-1',
            opponent_id: 'user-2',
            board_state: [['T', 'E', 'S', 'T']],
            lesson_id: '550e8400-e29b-41d4-a716-446655440001',
            challenger_score: 0,
            opponent_score: 5, // Same score as what challenger will get
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: { language: 'en' }, error: null })
        .mockResolvedValueOnce({
          data: { id: '550e8400-e29b-41d4-a716-446655440002', score: 5, words_found: ['test'] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: '550e8400-e29b-41d4-a716-446655440001', challenger_score: 5, opponent_score: 5 },
          error: null,
        });

      const { isDictionaryWord } = require('@/backend/dictionary');
      isDictionaryWord.mockReturnValue(true);

      const { isWordOnBoardAsync } = require('@/backend/modules/wordValidatorPool');
      isWordOnBoardAsync.mockResolvedValue(true);

      const { calculateWordScore } = require('@/backend/modules/scoringEngine.types');
      calculateWordScore.mockReturnValue(5);

      mockUpdate.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'completed',
          winner_id: null, // Draw
          xp_awarded: true,
        },
        error: null,
        count: 1,
      });

      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      const completedEvent = roomEmittedEvents.find((e) => e.event === 'duel:completed');
      expect(completedEvent?.data).toMatchObject({
        winnerId: null,
        challengerScore: 5,
        opponentScore: 5,
        xpAwarded: {
          challenger: 175,
          opponent: 175,
        },
      });

      // Both get draw XP
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-1',
        p_xp_amount: 175,
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-2',
        p_xp_amount: 175,
      });
    });

    it('should prevent double XP award (race condition)', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        wordsFound: ['test'],
      };

      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            status: 'active',
            challenger_id: 'user-1',
            opponent_id: 'user-2',
            board_state: [['T', 'E', 'S', 'T']],
            lesson_id: '550e8400-e29b-41d4-a716-446655440001',
            challenger_score: 0,
            opponent_score: 10,
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: { language: 'en' }, error: null })
        .mockResolvedValueOnce({
          data: { id: '550e8400-e29b-41d4-a716-446655440002', score: 5, words_found: ['test'] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: '550e8400-e29b-41d4-a716-446655440001', challenger_score: 5, opponent_score: 10 },
          error: null,
        });

      const { isDictionaryWord } = require('@/backend/dictionary');
      isDictionaryWord.mockReturnValue(true);

      const { isWordOnBoardAsync } = require('@/backend/modules/wordValidatorPool');
      isWordOnBoardAsync.mockResolvedValue(true);

      const { calculateWordScore } = require('@/backend/modules/scoringEngine.types');
      calculateWordScore.mockReturnValue(5);

      // Mock update returning 0 rows (XP already awarded)
      mockUpdate.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 0, // No rows updated - race condition detected
      });

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      // Verify NO XP RPC calls (race condition protection worked)
      expect(mockSupabaseClient.rpc).not.toHaveBeenCalled();

      // Verify score-submitted event still fires
      const scoreSubmittedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:score-submitted'
      );
      expect(scoreSubmittedEvent).toBeDefined();
    });

    it('should not complete duel if only one player has submitted', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        wordsFound: ['test'],
      };

      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            status: 'active',
            challenger_id: 'user-1',
            opponent_id: 'user-2',
            board_state: [['T', 'E', 'S', 'T']],
            lesson_id: '550e8400-e29b-41d4-a716-446655440001',
            challenger_score: 0,
            opponent_score: 0, // Opponent hasn't submitted yet
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: { language: 'en' }, error: null })
        .mockResolvedValueOnce({
          data: { id: '550e8400-e29b-41d4-a716-446655440002', score: 5, words_found: ['test'] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: '550e8400-e29b-41d4-a716-446655440001', challenger_score: 5, opponent_score: 0 },
          error: null,
        });

      const { isDictionaryWord } = require('@/backend/dictionary');
      isDictionaryWord.mockReturnValue(true);

      const { isWordOnBoardAsync } = require('@/backend/modules/wordValidatorPool');
      isWordOnBoardAsync.mockResolvedValue(true);

      const { calculateWordScore } = require('@/backend/modules/scoringEngine.types');
      calculateWordScore.mockReturnValue(5);

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      // Verify NO completion event
      const completedEvent = roomEmittedEvents.find((e) => e.event === 'duel:completed');
      expect(completedEvent).toBeUndefined();

      // Verify score-submitted event fires
      const scoreSubmittedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:score-submitted'
      );
      expect(scoreSubmittedEvent).toBeDefined();
    });
  });

  describe('payload validation', () => {
    it('should reject invalid payload (missing duelId)', async () => {
      // RED: Test should fail
      const payload = { wordsFound: ['test'] }; // Missing duelId

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('Invalid');
    });

    it('should reject invalid payload (missing wordsFound)', async () => {
      // RED: Test should fail
      const payload = { duelId: '550e8400-e29b-41d4-a716-446655440001' }; // Missing wordsFound

      registerGameplayHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitScoreHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-score'
      )?.[1];

      await submitScoreHandler(payload);

      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('Invalid');
    });
  });
});
