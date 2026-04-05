/**
 * Real-Time Duel Handlers Tests
 * TDD tests for real-time word submission, game state, and timer completion
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerRealtimeHandlers, realtimeGames, startRealtimeDuel } from '../realtime';
import { getSupabase } from '@/backend/modules/supabase/client';
import { isDictionaryWord } from '@/backend/dictionary';
import { isWordOnBoardAsync } from '@/backend/modules/wordValidatorPool';
import { calculateWordScore } from '@/backend/modules/scoringEngine.types';
import { EDUCATION_XP_CONFIG } from '@/backend/modules/educationXpManager';

// Mock dependencies
vi.mock('@/backend/modules/supabase/client');
vi.mock('@/backend/modules/wordValidatorPool');
vi.mock('@/backend/dictionary');
vi.mock('@/backend/modules/scoringEngine.types');
vi.mock('@/backend/utils/logger');
vi.mock('@/backend/modules/educationXpManager');

const mockedGetSupabase = vi.mocked(getSupabase);
const mockedIsDictionaryWord = vi.mocked(isDictionaryWord);
const mockedIsWordOnBoardAsync = vi.mocked(isWordOnBoardAsync);
const mockedCalculateWordScore = vi.mocked(calculateWordScore);

describe('Real-Time Duel Handlers', () => {
  let mockSocket: Partial<DuelSocket>;
  let mockNamespace: Partial<Namespace>;
  let mockSupabaseClient: any;
  let emittedEvents: Array<{ event: string; data: any }>;
  let roomEmittedEvents: Array<{ room: string; event: string; data: any }>;

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    vi.useFakeTimers();
    emittedEvents = [];
    roomEmittedEvents = [];

    // Clear realtime games map
    realtimeGames.clear();

    // Setup mock socket
    mockSocket = {
      data: {
        userId: 'user-1',
        displayName: 'Player 1',
        classroomIds: ['classroom-1'],
      },
      emit: vi.fn((event: string, data: any) => {
        emittedEvents.push({ event, data });
      }),
      to: vi.fn().mockReturnThis(),
      on: vi.fn(),
    } as any;

    // Setup mock namespace
    mockNamespace = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn((event: string, data: any) => {
          const roomCall = (mockNamespace.to as Mock).mock.calls[
            (mockNamespace.to as Mock).mock.calls.length - 1
          ];
          const room = roomCall[0];
          roomEmittedEvents.push({ room, event, data });
        }),
      }),
    } as any;

    // Setup Supabase mock
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Mock getSupabase

    mockedGetSupabase.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('duel:submit-word handler', () => {
    it('should reject invalid payload (missing word)', async () => {
      // RED: Test should fail because handler doesn't exist
      const payload = { duelId: '550e8400-e29b-41d4-a716-446655440001' };

      registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitWordHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-word'
      )?.[1];

      expect(submitWordHandler).toBeDefined();

      await submitWordHandler(payload);

      // Verify error emitted
      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('Invalid');
    });

    it('should reject word not in dictionary', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        word: 'invalidword',
      };

      // Setup game state
      realtimeGames.set('550e8400-e29b-41d4-a716-446655440001', {
        challengerId: 'user-1',
        opponentId: 'user-2',
        lessonId: 'lesson-1',
        boardState: [['T', 'E', 'S', 'T']],
        language: 'en',
        timeLimit: 180,
        startTime: new Date().toISOString(),

        challengerWords: [],
        opponentWords: [],
        challengerScore: 0,
        opponentScore: 0,
      });

      // Mock dictionary validation

      mockedIsDictionaryWord.mockReturnValue(false);

      registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitWordHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-word'
      )?.[1];

      await submitWordHandler(payload);

      const rejectedEvent = emittedEvents.find((e) => e.event === 'duel:word-rejected');
      expect(rejectedEvent).toBeDefined();
      expect(rejectedEvent?.data.reason).toContain('dictionary');
    });

    it('should reject word not on board', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        word: 'word',
      };

      realtimeGames.set('550e8400-e29b-41d4-a716-446655440001', {
        challengerId: 'user-1',
        opponentId: 'user-2',
        lessonId: 'lesson-1',
        boardState: [['T', 'E', 'S', 'T']],
        language: 'en',
        timeLimit: 180,
        startTime: new Date().toISOString(),

        challengerWords: [],
        opponentWords: [],
        challengerScore: 0,
        opponentScore: 0,
      });


      mockedIsDictionaryWord.mockReturnValue(true);


      mockedIsWordOnBoardAsync.mockResolvedValue(false);

      registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitWordHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-word'
      )?.[1];

      await submitWordHandler(payload);

      const rejectedEvent = emittedEvents.find((e) => e.event === 'duel:word-rejected');
      expect(rejectedEvent).toBeDefined();
      expect(rejectedEvent?.data.reason).toContain('board');
    });

    it('should reject duplicate word', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        word: 'test',
      };

      realtimeGames.set('550e8400-e29b-41d4-a716-446655440001', {
        challengerId: 'user-1',
        opponentId: 'user-2',
        lessonId: 'lesson-1',
        boardState: [['T', 'E', 'S', 'T']],
        language: 'en',
        timeLimit: 180,
        startTime: new Date().toISOString(),

        challengerWords: ['test'], // Already found
        opponentWords: [],
        challengerScore: 5,
        opponentScore: 0,
      });


      mockedIsDictionaryWord.mockReturnValue(true);


      mockedIsWordOnBoardAsync.mockResolvedValue(true);

      registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitWordHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-word'
      )?.[1];

      await submitWordHandler(payload);

      const rejectedEvent = emittedEvents.find((e) => e.event === 'duel:word-rejected');
      expect(rejectedEvent).toBeDefined();
      expect(rejectedEvent?.data.reason).toContain('duplicate');
    });

    it('should reject if user not a participant', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        word: 'test',
      };

      realtimeGames.set('550e8400-e29b-41d4-a716-446655440001', {
        challengerId: 'other-user-1',
        opponentId: 'other-user-2',
        lessonId: 'lesson-1',
        boardState: [['T', 'E', 'S', 'T']],
        language: 'en',
        timeLimit: 180,
        startTime: new Date().toISOString(),

        challengerWords: [],
        opponentWords: [],
        challengerScore: 0,
        opponentScore: 0,
      });

      registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitWordHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-word'
      )?.[1];

      await submitWordHandler(payload);

      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('not a participant');
    });

    it('should accept valid word and emit to submitter', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        word: 'test',
      };

      realtimeGames.set('550e8400-e29b-41d4-a716-446655440001', {
        challengerId: 'user-1',
        opponentId: 'user-2',
        lessonId: 'lesson-1',
        boardState: [['T', 'E', 'S', 'T']],
        language: 'en',
        timeLimit: 180,
        startTime: new Date().toISOString(),

        challengerWords: [],
        opponentWords: [],
        challengerScore: 0,
        opponentScore: 0,
      });


      mockedIsDictionaryWord.mockReturnValue(true);


      mockedIsWordOnBoardAsync.mockResolvedValue(true);


      mockedCalculateWordScore.mockReturnValue(3);

      registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitWordHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-word'
      )?.[1];

      await submitWordHandler(payload);

      const acceptedEvent = emittedEvents.find((e) => e.event === 'duel:word-accepted');
      expect(acceptedEvent).toBeDefined();
      expect(acceptedEvent?.data).toMatchObject({
        word: 'test',
        points: 3,
        totalScore: 3,
        wordCount: 1,
      });
    });

    it('should broadcast opponent progress to room (excluding sender)', async () => {
      // RED: Test should fail
      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
        word: 'test',
      };

      realtimeGames.set('550e8400-e29b-41d4-a716-446655440001', {
        challengerId: 'user-1',
        opponentId: 'user-2',
        lessonId: 'lesson-1',
        boardState: [['T', 'E', 'S', 'T']],
        language: 'en',
        timeLimit: 180,
        startTime: new Date().toISOString(),

        challengerWords: [],
        opponentWords: [],
        challengerScore: 0,
        opponentScore: 0,
      });


      mockedIsDictionaryWord.mockReturnValue(true);


      mockedIsWordOnBoardAsync.mockResolvedValue(true);


      mockedCalculateWordScore.mockReturnValue(3);

      // Mock socket.to() to emit to room
      const mockRoomEmit = vi.fn();
      (mockSocket.to as Mock).mockReturnValue({
        emit: mockRoomEmit,
      });

      registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const submitWordHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:submit-word'
      )?.[1];

      await submitWordHandler(payload);

      // Verify socket.to() was called with room
      expect(mockSocket.to).toHaveBeenCalledWith('duel:550e8400-e29b-41d4-a716-446655440001');

      // Verify opponent-progress emitted
      expect(mockRoomEmit).toHaveBeenCalledWith('duel:opponent-progress', {
        opponentId: 'user-1',
        totalScore: 3,
        wordCount: 1,
      });
    });
  });

  describe('startRealtimeDuel', () => {
    it('should initialize game state and emit duel:started to room', async () => {
      // RED: Test should fail
      const duelId = '550e8400-e29b-41d4-a716-446655440001';
      const duel = {
        id: duelId,
        challenger_id: 'user-1',
        opponent_id: 'user-2',
        lesson_id: 'lesson-1',
        board_state: [['T', 'E', 'S', 'T']],
        time_limit: 180,
      };

      // Mock lesson fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { language: 'en' },
        error: null,
      });

      await startRealtimeDuel(mockNamespace as Namespace, duelId, duel);

      // Verify game state initialized
      const gameState = realtimeGames.get(duelId);
      expect(gameState).toBeDefined();
      expect(gameState?.challengerId).toBe('user-1');
      expect(gameState?.opponentId).toBe('user-2');
      expect(gameState?.language).toBe('en');
      expect(gameState?.timeLimit).toBe(180);

      // Verify duel:started emitted to room
      const startedEvent = roomEmittedEvents.find((e) => e.event === 'duel:started');
      expect(startedEvent).toBeDefined();
      expect(startedEvent?.room).toBe('duel:550e8400-e29b-41d4-a716-446655440001');
      expect(startedEvent?.data).toMatchObject({
        duelId,
        boardState: [['T', 'E', 'S', 'T']],
        timeLimit: 180,
        players: ['user-1', 'user-2'],
      });
    });

    it.skip('should start server-side timer for duel completion', async () => {
      // RED: Test should fail
      const duelId = '550e8400-e29b-41d4-a716-446655440001';
      const duel = {
        id: duelId,
        challenger_id: 'user-1',
        opponent_id: 'user-2',
        lesson_id: 'lesson-1',
        board_state: [['T', 'E', 'S', 'T']],
        time_limit: 1, // 1 second for quick test
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { language: 'en' },
        error: null,
      });

      // Mock duel update (for completion) - must be set up BEFORE timer fires
      const mockEqChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: duelId, status: 'completed' }],
          error: null,
          count: 1,
        }),
      };
      mockSupabaseClient.update.mockReturnValue(mockEqChain);

      // Mock insert turns
      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'turn-1' }, { id: 'turn-2' }],
          error: null,
        }),
      });

      await startRealtimeDuel(mockNamespace as Namespace, duelId, duel);

      // Verify game state created
      const gameState = realtimeGames.get(duelId);
      expect(gameState).toBeDefined();

      // Fast-forward time to trigger completion
      vi.runAllTimers();

      // Wait for async operations
      await new Promise((resolve) => setImmediate(resolve));

      // Verify duel completed
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
    });
  });

  describe('completeRealtimeDuel (via timer)', () => {
    it.skip('should determine winner by score and emit completion', async () => {
      // RED: Test should fail
      const duelId = '550e8400-e29b-41d4-a716-446655440001';



      // Start duel (which starts timer)
      const duel = {
        id: duelId,
        challenger_id: 'user-1',
        opponent_id: 'user-2',
        lesson_id: 'lesson-1',
        board_state: [['T', 'E', 'S', 'T']],
        time_limit: 1, // 1 second for quick test
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { language: 'en' },
        error: null,
      });

      // Mock atomic update - set up BEFORE timer fires
      const mockEqChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: duelId, status: 'completed', winner_id: 'user-1' }],
          error: null,
          count: 1,
        }),
      };
      mockSupabaseClient.update.mockReturnValue(mockEqChain);

      // Mock insert turns
      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'turn-1' }, { id: 'turn-2' }],
          error: null,
        }),
      });

      await startRealtimeDuel(mockNamespace as Namespace, duelId, duel);

      // Update game state with scores BEFORE timer fires
      const gameState = realtimeGames.get(duelId);
      if (gameState) {
        gameState.challengerScore = 10;
        gameState.opponentScore = 5;
        gameState.challengerWords = ['test', 'word'];
        gameState.opponentWords = ['the'];
      }

      // Fast-forward timer
      vi.runAllTimers();
      await new Promise((resolve) => setImmediate(resolve));

      // Verify completion emitted
      const completedEvent = roomEmittedEvents.find((e) => e.event === 'duel:completed');
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data).toMatchObject({
        winnerId: 'user-1',
        challengerScore: 10,
        opponentScore: 5,
      });

      // Verify XP awarded
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-1',
        p_xp_amount: EDUCATION_XP_CONFIG.DUEL_WIN_REALTIME,
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-2',
        p_xp_amount: EDUCATION_XP_CONFIG.DUEL_LOSS_REALTIME,
      });
    });

    it.skip('should handle draw (both scores equal)', async () => {
      // RED: Test should fail
      const duelId = '550e8400-e29b-41d4-a716-446655440001';



      const duel = {
        id: duelId,
        challenger_id: 'user-1',
        opponent_id: 'user-2',
        lesson_id: 'lesson-1',
        board_state: [['T', 'E', 'S', 'T']],
        time_limit: 1,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { language: 'en' },
        error: null,
      });

      const mockEqChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: duelId, status: 'completed', winner_id: null }],
          error: null,
          count: 1,
        }),
      };
      mockSupabaseClient.update.mockReturnValue(mockEqChain);

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'turn-1' }, { id: 'turn-2' }],
          error: null,
        }),
      });

      await startRealtimeDuel(mockNamespace as Namespace, duelId, duel);

      // Set draw scores BEFORE timer fires
      const gameState = realtimeGames.get(duelId);
      if (gameState) {
        gameState.challengerScore = 5;
        gameState.opponentScore = 5;
        gameState.challengerWords = ['test'];
        gameState.opponentWords = ['word'];
      }

      vi.advanceTimersByTime(1000);
      await new Promise((resolve) => setImmediate(resolve));

      const completedEvent = roomEmittedEvents.find((e) => e.event === 'duel:completed');
      expect(completedEvent?.data).toMatchObject({
        winnerId: null, // Draw
        challengerScore: 5,
        opponentScore: 5,
      });

      // Both get draw XP
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-1',
        p_xp_amount: EDUCATION_XP_CONFIG.DUEL_DRAW,
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-2',
        p_xp_amount: EDUCATION_XP_CONFIG.DUEL_DRAW,
      });
    });

    it.skip('should cleanup game state after completion', async () => {
      // RED: Test should fail
      const duelId = '550e8400-e29b-41d4-a716-446655440001';

      const duel = {
        id: duelId,
        challenger_id: 'user-1',
        opponent_id: 'user-2',
        lesson_id: 'lesson-1',
        board_state: [['T', 'E', 'S', 'T']],
        time_limit: 1,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { language: 'en' },
        error: null,
      });

      const mockEqChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: duelId, status: 'completed' }],
          error: null,
          count: 1,
        }),
      };
      mockSupabaseClient.update.mockReturnValue(mockEqChain);

      mockSupabaseClient.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'turn-1' }, { id: 'turn-2' }],
          error: null,
        }),
      });

      await startRealtimeDuel(mockNamespace as Namespace, duelId, duel);

      // Verify game state exists before timer fires
      expect(realtimeGames.has(duelId)).toBe(true);

      vi.advanceTimersByTime(1000);
      await new Promise((resolve) => setImmediate(resolve));

      // Verify game state cleaned up
      expect(realtimeGames.has(duelId)).toBe(false);
    });
  });
});
