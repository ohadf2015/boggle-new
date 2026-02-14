/**
 * Tests for duel CRUD operations
 * Following TDD: RED-GREEN-REFACTOR cycle
 */

import {
  createDuel,
  getDuelById,
  updateDuelStatus,
  getDuelHistory,
  getDuelStats,
  submitDuelTurn,
  getPendingDuelsForStudent,
  type DuelRow,
  type DuelTurnRow,
  type CreateDuelData,
} from '../duels';

// Mock Supabase client following practice.test.ts pattern
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/utils/supabase/server';

describe('Duel CRUD Operations', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mock before each test
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createDuel', () => {
    it('should create a duel with default values', async () => {
      const createData: CreateDuelData = {
        challengerId: 'challenger-123',
        opponentId: 'opponent-456',
        classroomId: 'classroom-789',
        lessonId: 'lesson-abc',
        boardState: [
          ['A', 'B', 'C'],
          ['D', 'E', 'F'],
        ],
      };

      const mockDuel: DuelRow = {
        id: 'duel-123',
        classroom_id: createData.classroomId,
        challenger_id: createData.challengerId,
        opponent_id: createData.opponentId,
        lesson_id: createData.lessonId,
        duel_type: 'async',
        status: 'pending',
        board_state: createData.boardState as any,
        challenger_score: 0,
        opponent_score: 0,
        winner_id: null,
        xp_awarded: false,
        created_at: '2026-02-13T14:00:00Z',
        started_at: null,
        completed_at: null,
        expires_at: '2026-02-14T14:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({ data: mockDuel, error: null });

      const result = await createDuel(createData);

      expect(result.data).toEqual(mockDuel);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('student_duels');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          challenger_id: createData.challengerId,
          opponent_id: createData.opponentId,
          classroom_id: createData.classroomId,
          lesson_id: createData.lessonId,
          board_state: createData.boardState,
          duel_type: 'async',
          status: 'pending',
          challenger_score: 0,
          opponent_score: 0,
        })
      );
    });

    it('should use custom expiresAt if provided', async () => {
      const createData: CreateDuelData = {
        challengerId: 'challenger-123',
        opponentId: 'opponent-456',
        classroomId: 'classroom-789',
        lessonId: 'lesson-abc',
        boardState: [['A', 'B']],
        expiresAt: '2026-02-15T10:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({ data: {}, error: null });

      await createDuel(createData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: createData.expiresAt,
        })
      );
    });

    it('should handle creation error', async () => {
      const createData: CreateDuelData = {
        challengerId: 'challenger-123',
        opponentId: 'opponent-456',
        classroomId: 'classroom-789',
        lessonId: 'lesson-abc',
        boardState: [['A']],
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await createDuel(createData);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Database error' });
    });
  });

  describe('getDuelById', () => {
    it('should fetch duel with challenger and opponent profiles', async () => {
      const mockDuelWithProfiles = {
        id: 'duel-123',
        status: 'active',
        challenger: {
          id: 'challenger-123',
          display_name: 'Alice',
          avatar_url: 'avatar1.jpg',
        },
        opponent: {
          id: 'opponent-456',
          display_name: 'Bob',
          avatar_url: 'avatar2.jpg',
        },
      };

      mockSupabase.single.mockResolvedValue({
        data: mockDuelWithProfiles,
        error: null,
      });

      const result = await getDuelById('duel-123');

      expect(result.data).toEqual(mockDuelWithProfiles);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('student_duels');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'duel-123');
    });

    it('should handle not found error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getDuelById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Not found' });
    });
  });

  describe('updateDuelStatus', () => {
    it('should update status only', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'duel-123', status: 'active' },
        error: null,
      });

      const result = await updateDuelStatus('duel-123', 'active');

      expect(result.data).toEqual({ id: 'duel-123', status: 'active' });
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'duel-123');
    });

    it('should update status and additional fields', async () => {
      const updates = {
        winner_id: 'winner-123',
        challenger_score: 100,
        opponent_score: 80,
        completed_at: '2026-02-13T15:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'duel-123', ...updates, status: 'completed' },
        error: null,
      });

      const result = await updateDuelStatus('duel-123', 'completed', updates);

      expect(result.data).toBeDefined();
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          ...updates,
        })
      );
    });

    it('should handle update error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await updateDuelStatus('duel-123', 'declined');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Update failed' });
    });
  });

  describe('getDuelHistory', () => {
    it('should fetch completed duels with isWin computed correctly', async () => {
      const studentId = 'student-123';
      const mockHistory = [
        {
          id: 'duel-1',
          status: 'completed',
          challenger_id: studentId,
          opponent_id: 'other-1',
          challenger_score: 100,
          opponent_score: 80,
          winner_id: studentId,
          challenger: { display_name: 'Me', avatar_url: 'me.jpg' },
          opponent: { display_name: 'Them', avatar_url: 'them.jpg' },
        },
        {
          id: 'duel-2',
          status: 'completed',
          challenger_id: 'other-2',
          opponent_id: studentId,
          challenger_score: 90,
          opponent_score: 70,
          winner_id: 'other-2',
          challenger: { display_name: 'Them2', avatar_url: 'them2.jpg' },
          opponent: { display_name: 'Me', avatar_url: 'me.jpg' },
        },
      ];

      // Mock the final query result (order is the last method in chain)
      mockSupabase.order.mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      const result = await getDuelHistory(studentId);

      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toHaveProperty('isWin', true); // student won duel-1
      expect(result.data![1]).toHaveProperty('isWin', false); // student lost duel-2
      expect(mockSupabase.from).toHaveBeenCalledWith('student_duels');
    });

    it('should respect limit parameter', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      await getDuelHistory('student-123', 10);

      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
    });

    it('should handle fetch error', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Fetch error' },
      });

      const result = await getDuelHistory('student-123');

      expect(result.data).toEqual([]);
      expect(result.error).toEqual({ message: 'Fetch error' });
    });
  });

  describe('getDuelStats', () => {
    it('should compute win/loss/draw counts correctly', async () => {
      const studentId = 'student-123';
      const mockDuels = [
        {
          id: 'duel-1',
          challenger_id: studentId,
          opponent_id: 'other-1',
          challenger_score: 100,
          opponent_score: 80,
          winner_id: studentId,
          completed_at: '2026-02-13T10:00:00Z',
        },
        {
          id: 'duel-2',
          challenger_id: 'other-2',
          opponent_id: studentId,
          challenger_score: 90,
          opponent_score: 100,
          winner_id: studentId,
          completed_at: '2026-02-13T11:00:00Z',
        },
        {
          id: 'duel-3',
          challenger_id: studentId,
          opponent_id: 'other-3',
          challenger_score: 80,
          opponent_score: 100,
          winner_id: 'other-3',
          completed_at: '2026-02-13T12:00:00Z',
        },
        {
          id: 'duel-4',
          challenger_id: studentId,
          opponent_id: 'other-4',
          challenger_score: 50,
          opponent_score: 50,
          winner_id: null,
          completed_at: '2026-02-13T13:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockDuels, error: null });

      const result = await getDuelStats(studentId);

      expect(result.data).toBeDefined();
      expect(result.data!.wins).toBe(2);
      expect(result.data!.losses).toBe(1);
      expect(result.data!.draws).toBe(1);
    });

    it('should compute current win streak correctly', async () => {
      const studentId = 'student-123';
      // Last 3 duels: win, win, loss (streak = 2)
      const mockDuels = [
        {
          id: 'duel-3',
          challenger_id: studentId,
          winner_id: studentId,
          completed_at: '2026-02-13T13:00:00Z',
        },
        {
          id: 'duel-2',
          challenger_id: studentId,
          winner_id: studentId,
          completed_at: '2026-02-13T12:00:00Z',
        },
        {
          id: 'duel-1',
          challenger_id: studentId,
          winner_id: 'other',
          completed_at: '2026-02-13T11:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockDuels, error: null });

      const result = await getDuelStats(studentId);

      expect(result.data!.currentStreak).toBe(2);
    });

    it('should compute max win streak correctly', async () => {
      const studentId = 'student-123';
      // Wins: 3 in a row, then loss, then 2 in a row (max = 3)
      const mockDuels = [
        { id: 'd5', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T15:00:00Z' },
        { id: 'd4', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T14:00:00Z' },
        { id: 'd3', challenger_id: studentId, winner_id: 'other', completed_at: '2026-02-13T13:00:00Z' },
        { id: 'd2', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T12:00:00Z' },
        { id: 'd1', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T11:00:00Z' },
        { id: 'd0', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T10:00:00Z' },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockDuels, error: null });

      const result = await getDuelStats(studentId);

      expect(result.data!.winStreak).toBe(3);
    });

    it('should compute per-opponent stats correctly', async () => {
      const studentId = 'student-123';
      const mockDuels = [
        { challenger_id: studentId, opponent_id: 'opponent-A', winner_id: studentId, completed_at: '2026-02-13T10:00:00Z' },
        { challenger_id: studentId, opponent_id: 'opponent-A', winner_id: 'opponent-A', completed_at: '2026-02-13T11:00:00Z' },
        { challenger_id: 'opponent-B', opponent_id: studentId, winner_id: studentId, completed_at: '2026-02-13T12:00:00Z' },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockDuels, error: null });

      const result = await getDuelStats(studentId);

      expect(result.data!.opponentStats).toBeDefined();
      expect(result.data!.opponentStats.get('opponent-A')).toEqual({
        wins: 1,
        losses: 1,
      });
      expect(result.data!.opponentStats.get('opponent-B')).toEqual({
        wins: 1,
        losses: 0,
      });
    });

    it('should handle empty stats', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const result = await getDuelStats('student-123');

      expect(result.data).toEqual({
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        currentStreak: 0,
        opponentStats: new Map(),
      });
    });
  });

  describe('submitDuelTurn', () => {
    it('should insert duel turn with correct data', async () => {
      const mockTurn: DuelTurnRow = {
        id: 'turn-123',
        duel_id: 'duel-123',
        player_id: 'player-123',
        score: 85,
        words_found: ['word1', 'word2', 'word3'] as any,
        board_state_snapshot: null,
        started_at: '2026-02-13T14:00:00Z',
        completed_at: '2026-02-13T14:05:00Z',
      };

      mockSupabase.single.mockResolvedValue({ data: mockTurn, error: null });

      const result = await submitDuelTurn(
        'duel-123',
        'player-123',
        85,
        ['word1', 'word2', 'word3']
      );

      expect(result.data).toEqual(mockTurn);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('duel_turns');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          duel_id: 'duel-123',
          player_id: 'player-123',
          score: 85,
          words_found: ['word1', 'word2', 'word3'],
        })
      );
    });

    it('should handle insert error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const result = await submitDuelTurn('duel-123', 'player-123', 50, []);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Insert failed' });
    });
  });

  describe('getPendingDuelsForStudent', () => {
    it('should fetch pending duels where student is opponent', async () => {
      const mockPendingDuels = [
        { id: 'duel-1', status: 'pending', opponent_id: 'student-123' },
        { id: 'duel-2', status: 'pending', opponent_id: 'student-123' },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockPendingDuels,
        error: null,
      });

      const result = await getPendingDuelsForStudent('student-123');

      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('student_duels');
      expect(mockSupabase.eq).toHaveBeenCalledWith('opponent_id', 'student-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending');
    });
  });
});
