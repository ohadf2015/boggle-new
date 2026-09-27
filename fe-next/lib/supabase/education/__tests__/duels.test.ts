import { vi, type Mock, } from 'vitest';
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

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { supabase } from '@/lib/supabase';

describe('Duel CRUD Operations', () => {
  const mockFrom = supabase!.from as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper: build chainable mock ending at .single()
  // Chain: from → insert/select/update → ... → select → single
  function chainInsertSelectSingle(resolvedValue: any) {
    const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
    return { mockInsert, mockSelect, mockSingle };
  }

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

      const { mockInsert } = chainInsertSelectSingle({ data: mockDuel, error: null });

      const result = await createDuel(createData);

      expect(result.data).toEqual(mockDuel);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('student_duels');
      expect(mockInsert).toHaveBeenCalledWith(
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

      const { mockInsert } = chainInsertSelectSingle({ data: {}, error: null });

      await createDuel(createData);

      expect(mockInsert).toHaveBeenCalledWith(
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

      chainInsertSelectSingle({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await createDuel(createData);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Database error' });
    });
  });

  describe('getDuelById', () => {
    // Chain: from → select → eq → single
    function chainSelectEqSingle(resolvedValue: any) {
      const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });
      return { mockSelect, mockEq, mockSingle };
    }

    it('should fetch duel with challenger and opponent profiles', async () => {
      const mockDuelWithProfiles = {
        id: 'duel-123',
        status: 'active',
        challenger: {
          id: 'challenger-123',
          display_name: 'Alice',
          avatar_config: null,
        },
        opponent: {
          id: 'opponent-456',
          display_name: 'Bob',
          avatar_config: null,
        },
      };

      const { mockEq } = chainSelectEqSingle({
        data: mockDuelWithProfiles,
        error: null,
      });

      const result = await getDuelById('duel-123');

      expect(result.data).toEqual(mockDuelWithProfiles);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('student_duels');
      expect(mockEq).toHaveBeenCalledWith('id', 'duel-123');
    });

    it('should handle not found error', async () => {
      chainSelectEqSingle({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getDuelById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Not found' });
    });
  });

  describe('updateDuelStatus', () => {
    // Chain: from → update → eq → select → single
    function chainUpdateEqSelectSingle(resolvedValue: any) {
      const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });
      return { mockUpdate, mockEq, mockSelect, mockSingle };
    }

    it('should update status only', async () => {
      const { mockUpdate, mockEq } = chainUpdateEqSelectSingle({
        data: { id: 'duel-123', status: 'active' },
        error: null,
      });

      const result = await updateDuelStatus('duel-123', 'active');

      expect(result.data).toEqual({ id: 'duel-123', status: 'active' });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'duel-123');
    });

    it('should update status and additional fields', async () => {
      const updates = {
        winner_id: 'winner-123',
        challenger_score: 100,
        opponent_score: 80,
        completed_at: '2026-02-13T15:00:00Z',
      };

      const { mockUpdate } = chainUpdateEqSelectSingle({
        data: { id: 'duel-123', ...updates, status: 'completed' },
        error: null,
      });

      const result = await updateDuelStatus('duel-123', 'completed', updates);

      expect(result.data).toBeDefined();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          ...updates,
        })
      );
    });

    it('should handle update error', async () => {
      chainUpdateEqSelectSingle({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await updateDuelStatus('duel-123', 'declined');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Update failed' });
    });
  });

  describe('getDuelHistory', () => {
    // Chain: from → select → eq → or → order (→ optional limit)
    function chainHistoryQuery(resolvedValue: any, withLimit = false) {
      if (withLimit) {
        const mockLimit = vi.fn().mockResolvedValue(resolvedValue);
        const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
        const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
        const mockEq = vi.fn().mockReturnValue({ or: mockOr });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect });
        return { mockSelect, mockEq, mockOr, mockOrder, mockLimit };
      }
      const mockOrder = vi.fn().mockResolvedValue(resolvedValue);
      const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ or: mockOr });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });
      return { mockSelect, mockEq, mockOr, mockOrder };
    }

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
          challenger: { display_name: 'Me', avatar_config: null },
          opponent: { display_name: 'Them', avatar_config: null },
        },
        {
          id: 'duel-2',
          status: 'completed',
          challenger_id: 'other-2',
          opponent_id: studentId,
          challenger_score: 90,
          opponent_score: 70,
          winner_id: 'other-2',
          challenger: { display_name: 'Them2', avatar_config: null },
          opponent: { display_name: 'Me', avatar_config: null },
        },
      ];

      chainHistoryQuery({ data: mockHistory, error: null });

      const result = await getDuelHistory(studentId);

      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toHaveProperty('isWin', true);
      expect(result.data![1]).toHaveProperty('isWin', false);
      expect(mockFrom).toHaveBeenCalledWith('student_duels');
    });

    it('should respect limit parameter', async () => {
      const { mockLimit } = chainHistoryQuery({ data: [], error: null }, true);

      await getDuelHistory('student-123', 10);

      expect(mockLimit!).toHaveBeenCalledWith(10);
    });

    it('should handle fetch error', async () => {
      chainHistoryQuery({
        data: null,
        error: { message: 'Fetch error' },
      });

      const result = await getDuelHistory('student-123');

      expect(result.data).toEqual([]);
      expect(result.error).toEqual({ message: 'Fetch error' });
    });
  });

  describe('getDuelStats', () => {
    // Chain: from → select → eq → or → order
    function chainStatsQuery(resolvedValue: any) {
      const mockOrder = vi.fn().mockResolvedValue(resolvedValue);
      const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ or: mockOr });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });
      return { mockSelect, mockEq, mockOr, mockOrder };
    }

    it('should compute win/loss/draw counts correctly', async () => {
      const studentId = 'student-123';
      const mockDuels = [
        { id: 'duel-1', challenger_id: studentId, opponent_id: 'other-1', winner_id: studentId, completed_at: '2026-02-13T10:00:00Z' },
        { id: 'duel-2', challenger_id: 'other-2', opponent_id: studentId, winner_id: studentId, completed_at: '2026-02-13T11:00:00Z' },
        { id: 'duel-3', challenger_id: studentId, opponent_id: 'other-3', winner_id: 'other-3', completed_at: '2026-02-13T12:00:00Z' },
        { id: 'duel-4', challenger_id: studentId, opponent_id: 'other-4', winner_id: null, completed_at: '2026-02-13T13:00:00Z' },
      ];

      chainStatsQuery({ data: mockDuels, error: null });

      const result = await getDuelStats(studentId);

      expect(result.data).toBeDefined();
      expect(result.data!.wins).toBe(2);
      expect(result.data!.losses).toBe(1);
      expect(result.data!.draws).toBe(1);
    });

    it('should compute current win streak correctly', async () => {
      const studentId = 'student-123';
      const mockDuels = [
        { id: 'duel-3', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T13:00:00Z' },
        { id: 'duel-2', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T12:00:00Z' },
        { id: 'duel-1', challenger_id: studentId, winner_id: 'other', completed_at: '2026-02-13T11:00:00Z' },
      ];

      chainStatsQuery({ data: mockDuels, error: null });

      const result = await getDuelStats(studentId);

      expect(result.data!.currentStreak).toBe(2);
    });

    it('should compute max win streak correctly', async () => {
      const studentId = 'student-123';
      const mockDuels = [
        { id: 'd5', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T15:00:00Z' },
        { id: 'd4', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T14:00:00Z' },
        { id: 'd3', challenger_id: studentId, winner_id: 'other', completed_at: '2026-02-13T13:00:00Z' },
        { id: 'd2', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T12:00:00Z' },
        { id: 'd1', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T11:00:00Z' },
        { id: 'd0', challenger_id: studentId, winner_id: studentId, completed_at: '2026-02-13T10:00:00Z' },
      ];

      chainStatsQuery({ data: mockDuels, error: null });

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

      chainStatsQuery({ data: mockDuels, error: null });

      const result = await getDuelStats(studentId);

      expect(result.data!.opponentStats).toBeDefined();
      expect(result.data!.opponentStats.get('opponent-A')).toEqual({ wins: 1, losses: 1 });
      expect(result.data!.opponentStats.get('opponent-B')).toEqual({ wins: 1, losses: 0 });
    });

    it('should handle empty stats', async () => {
      chainStatsQuery({ data: [], error: null });

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

      const { mockInsert } = chainInsertSelectSingle({ data: mockTurn, error: null });

      const result = await submitDuelTurn(
        'duel-123',
        'player-123',
        85,
        ['word1', 'word2', 'word3']
      );

      expect(result.data).toEqual(mockTurn);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('duel_turns');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          duel_id: 'duel-123',
          player_id: 'player-123',
          score: 85,
          words_found: ['word1', 'word2', 'word3'],
        })
      );
    });

    it('should handle insert error', async () => {
      chainInsertSelectSingle({
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

      // Chain: from → select → eq → eq → order
      const mockOrder = vi.fn().mockResolvedValue({ data: mockPendingDuels, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getPendingDuelsForStudent('student-123');

      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('student_duels');
      expect(mockEq1).toHaveBeenCalledWith('opponent_id', 'student-123');
      expect(mockEq2).toHaveBeenCalledWith('status', 'pending');
    });
  });
});
