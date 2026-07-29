/**
 * Tests for classroom game persistence helpers.
 *
 * Covers F-05 (multi-lesson XP attribution) and F-06 (real game mode +
 * classroom_id written to practice_sessions).
 */

import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

// --- Mocks ---------------------------------------------------------------
const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockRpc = vi.fn();
const mockSupabase = { from: mockFrom, rpc: mockRpc };

vi.mock('../../modules/supabase/client', () => ({
  getSupabase: vi.fn(() => mockSupabase),
}));

const mockRedisSet = vi.fn();
vi.mock('../../redisClient', () => ({
  getRedisClient: vi.fn(() => ({ set: mockRedisSet })),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { persistClassroomGameScores } from '../classroomGamePersistence';
import type { ClassroomGame } from '../../modules/classroomGameManager';

// --- Helpers -------------------------------------------------------------
function makeGame(overrides: Partial<ClassroomGame> = {}): ClassroomGame {
  return {
    gameCode: 'GAME01',
    classroomId: 'class-1',
    teacherId: 'teacher-1',
    teacherName: 'Mrs Smith',
    lessonIds: ['lesson-1'],
    lessonNames: ['Animals'],
    vocabularyWords: ['cat', 'dog'],
    settings: { timerMinutes: 3, boardSize: 'medium', gameMode: 'classic' },
    players: [{ userId: 'stu-1', username: 'Alice', socketId: 's1', joinedAt: 'now' }],
    createdAt: 'now',
    status: 'finished',
    ...overrides,
  };
}

describe('persistClassroomGameScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockRpc.mockResolvedValue({ error: null });
    // Redis NX: acquired on first call
    mockRedisSet.mockResolvedValue('OK');
  });

  describe('F-06: practice session payload', () => {
    it('writes real game mode and classroom_id to practice_sessions', async () => {
      const game = makeGame({ settings: { timerMinutes: 3, gameMode: 'wordHunt' } });
      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 120, wordsFound: ['cat'] }]);

      expect(mockFrom).toHaveBeenCalledWith('practice_sessions');
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg).toMatchObject({
        student_id: 'stu-1',
        lesson_id: 'lesson-1',
        practice_type: 'solo_board', // constrained by 058 CHECK
        mode: 'wordHunt',             // real game mode (F-06)
        classroom_id: 'class-1',      // F-06
        total_score: 120,
      });
    });

    it('defaults mode to "classic" when gameMode is absent', async () => {
      const game = makeGame({ settings: { timerMinutes: 3 } });
      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 10 }]);
      expect(mockInsert.mock.calls[0][0].mode).toBe('classic');
    });
  });

  describe('F-05: multi-lesson XP attribution', () => {
    it('awards XP proportionally across all lessonIds when game covers multiple lessons', async () => {
      const game = makeGame({
        lessonIds: ['lesson-a', 'lesson-b', 'lesson-c'],
        players: [{ userId: 'stu-1', username: 'Alice', socketId: 's1', joinedAt: 'now' }],
      });

      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 300 }]);

      // XP = max(10, floor(300/10)) = 30, split across 3 lessons = 10 each
      expect(mockRpc).toHaveBeenCalledTimes(3);
      const lessonIdsCalled = mockRpc.mock.calls.map(c => c[1].p_lesson_id).sort();
      expect(lessonIdsCalled).toEqual(['lesson-a', 'lesson-b', 'lesson-c']);
      for (const call of mockRpc.mock.calls) {
        expect(call[0]).toBe('award_education_xp');
        expect(call[1].p_student_id).toBe('stu-1');
        expect(call[1].p_xp_amount).toBe(10); // 30 / 3
      }
    });

    it('awards full XP to the single lesson when only one lessonId', async () => {
      const game = makeGame({ lessonIds: ['lesson-1'] });
      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 200 }]);

      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc.mock.calls[0][1]).toMatchObject({
        p_student_id: 'stu-1',
        p_lesson_id: 'lesson-1',
        p_xp_amount: 20, // floor(200/10)
      });
    });

    it('skips XP when player score is zero', async () => {
      const game = makeGame();
      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 0 }]);
      expect(mockInsert).toHaveBeenCalled(); // session still written
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('F-24: reward summary return value', () => {
    it('returns per-player reward summary with xpEarned and lessonIds', async () => {
      const game = makeGame({
        lessonIds: ['lesson-a', 'lesson-b'],
        players: [
          { userId: 'stu-1', username: 'Alice', socketId: 's1', joinedAt: 'now' },
          { userId: 'stu-2', username: 'Bob', socketId: 's2', joinedAt: 'now' },
        ],
      });

      const rewards = await persistClassroomGameScores(game, [
        { userId: 'stu-1', score: 300 },
        { userId: 'stu-2', score: 0 },
      ]);

      expect(rewards).toEqual([
        { userId: 'stu-1', xpEarned: 30, lessonIds: ['lesson-a', 'lesson-b'] },
        { userId: 'stu-2', xpEarned: 0, lessonIds: ['lesson-a', 'lesson-b'] },
      ]);
    });

    it('returns empty array when persistence is skipped (already persisted)', async () => {
      mockRedisSet.mockResolvedValueOnce(null);
      const rewards = await persistClassroomGameScores(makeGame(), [{ userId: 'stu-1', score: 100 }]);
      expect(rewards).toEqual([]);
    });
  });

  describe('idempotency + guards', () => {
    it('returns early when Redis idempotency key already exists', async () => {
      mockRedisSet.mockResolvedValueOnce(null); // SET NX returns null when key exists
      await persistClassroomGameScores(makeGame(), [{ userId: 'stu-1', score: 100 }]);
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('returns early when game has no lessonIds', async () => {
      const game = makeGame({ lessonIds: [] });
      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 100 }]);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('returns early when game is null/undefined', async () => {
      await persistClassroomGameScores(null, []);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
});
