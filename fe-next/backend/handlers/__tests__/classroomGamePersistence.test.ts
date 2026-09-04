/**
 * Tests for classroom game persistence helpers.
 *
 * Covers F-05 (multi-lesson XP attribution), F-06 (real game mode +
 * classroom_id written to practice_sessions) and the lesson-progress
 * pipeline: after a live class game every human player gets a
 * `student_lesson_progress` upsert per lesson so the teacher analytics
 * (common mistakes, heatmap, students needing help) reflect the game.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Mocks ---------------------------------------------------------------
const mockInsert = vi.fn();          // practice_sessions.insert
const mockUpsert = vi.fn();          // student_lesson_progress.upsert
const mockMaybeSingle = vi.fn();     // student_lesson_progress existing-row read
const mockProgressEq2 = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockProgressEq1 = vi.fn(() => ({ eq: mockProgressEq2 }));
const mockLessonsIn = vi.fn();       // vocabulary_lessons select().in()
const mockLessonsSelect = vi.fn(() => ({ in: mockLessonsIn }));

function tableRouter(table: string) {
  if (table === 'practice_sessions') return { insert: mockInsert };
  if (table === 'vocabulary_lessons') return { select: mockLessonsSelect };
  if (table === 'student_lesson_progress') {
    return {
      select: vi.fn(() => ({ eq: mockProgressEq1 })),
      upsert: mockUpsert,
    };
  }
  throw new Error(`unexpected table ${table}`);
}

const mockFrom = vi.fn(tableRouter);
const mockRpc = vi.fn();
const mockSupabase = { from: mockFrom, rpc: mockRpc };

vi.mock('../../modules/supabase/client', () => ({
  getSupabase: vi.fn(() => mockSupabase),
}));

const mockRedisSet = vi.fn();
vi.mock('../../redisClient', () => ({
  getRedisClient: vi.fn(() => ({ set: mockRedisSet })),
}));

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: mockLogger }));

import {
  persistClassroomGameScores,
  playerScoresFromGameResults,
} from '../classroomGamePersistence';
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

function lessonRow(id: string, words: string[], language = 'en') {
  return { id, language, words: words.map((word) => ({ word, canIntegrate: true })) };
}

function upsertsFor(table = 'student_lesson_progress') {
  void table;
  return mockUpsert.mock.calls.map((c) => c[0]);
}

describe('persistClassroomGameScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(tableRouter);
    mockInsert.mockResolvedValue({ error: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockLessonsIn.mockResolvedValue({ data: [lessonRow('lesson-1', ['cat', 'dog'])], error: null });
    mockRpc.mockResolvedValue({ error: null });
    // Redis NX: acquired on first call
    mockRedisSet.mockResolvedValue('OK');
  });

  describe('F-06: practice session payload', () => {
    it('writes real game mode and classroom_id to practice_sessions', async () => {
      const game = makeGame({ settings: { timerMinutes: 3, gameMode: 'word-hunt' } });
      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 120, wordsFound: ['cat'] }]);

      expect(mockFrom).toHaveBeenCalledWith('practice_sessions');
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg).toMatchObject({
        student_id: 'stu-1',
        lesson_id: 'lesson-1',
        practice_type: 'solo_board', // constrained by 058 CHECK
        mode: 'word-hunt',            // real game mode (F-06)
        classroom_id: 'class-1',      // F-06
        total_score: 120,
      });
    });

    it('defaults mode to "classic" when gameMode is absent', async () => {
      const game = makeGame({ settings: { timerMinutes: 3 } });
      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 10 }]);
      expect(mockInsert.mock.calls[0][0].mode).toBe('classic');
    });

    it('stores per-player results JSON plus lesson accuracy columns', async () => {
      // GIVEN a lesson with two words and a player who found one of them (plus a non-lesson word)
      const game = makeGame({ startedAt: new Date(Date.now() - 90_000).toISOString() });

      // WHEN the game is persisted
      await persistClassroomGameScores(game, [
        { userId: 'stu-1', score: 40, wordsFound: ['CAT', 'tree'] },
      ]);

      // THEN the session row carries the lesson-word breakdown
      const row = mockInsert.mock.calls[0][0];
      expect(row.words_attempted).toBe(2);
      expect(row.words_correct).toBe(1);
      expect(row.accuracy).toBe(50);
      expect(row.vocabulary_words_found).toEqual(['cat']);
      expect(row.results).toEqual({
        gameCode: 'GAME01',
        gameMode: 'classic',
        lessonIds: ['lesson-1'],
        lessonWordsFound: ['cat'],
        lessonWordsMissed: ['dog'],
        allWordsFound: ['CAT', 'tree'],
        durationSeconds: expect.any(Number),
        playerCount: 1,
      });
      expect(row.results.durationSeconds).toBeGreaterThanOrEqual(89);
      expect(row.duration_seconds).toBe(row.results.durationSeconds);
    });

    it('omits durationSeconds when the game never recorded startedAt', async () => {
      await persistClassroomGameScores(makeGame(), [{ userId: 'stu-1', score: 0 }]);
      const row = mockInsert.mock.calls[0][0];
      expect(row.results.durationSeconds).toBeUndefined();
      expect(row.duration_seconds).toBeNull();
    });
  });

  describe('lesson progress (student_lesson_progress)', () => {
    it('reads the lesson vocabulary exactly once per game, not per player', async () => {
      // GIVEN two players and two lessons
      const game = makeGame({
        lessonIds: ['lesson-a', 'lesson-b'],
        players: [
          { userId: 'stu-1', username: 'Alice', socketId: 's1' },
          { userId: 'stu-2', username: 'Bob', socketId: 's2' },
        ],
      });
      mockLessonsIn.mockResolvedValue({
        data: [lessonRow('lesson-a', ['cat']), lessonRow('lesson-b', ['dog'])],
        error: null,
      });

      // WHEN
      await persistClassroomGameScores(game, [
        { userId: 'stu-1', score: 10, wordsFound: ['cat'] },
        { userId: 'stu-2', score: 0, wordsFound: [] },
      ]);

      // THEN a single lesson lookup, scoped to the game's lessons
      const lessonLookups = mockFrom.mock.calls.filter((c) => c[0] === 'vocabulary_lessons');
      expect(lessonLookups).toHaveLength(1);
      expect(mockLessonsIn).toHaveBeenCalledWith('id', ['lesson-a', 'lesson-b']);
    });

    it('merges words_attempted with the existing row and appends newly found words to words_mastered', async () => {
      // GIVEN an existing progress row where "cat" was tried twice, once correctly
      mockMaybeSingle.mockResolvedValue({
        data: {
          words_attempted: { cat: { attempts: 2, correct: 1, lastAttemptAt: '2026-01-01T00:00:00.000Z' } },
          words_mastered: ['cat'],
          started_at: '2026-01-01T00:00:00.000Z',
        },
        error: null,
      });

      // WHEN the player finds CAT (case differs) but not dog
      await persistClassroomGameScores(makeGame(), [
        { userId: 'stu-1', score: 30, wordsFound: ['CAT'] },
      ]);

      // THEN attempts/correct are merged per lesson word, misses recorded as attempts
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const [payload, options] = mockUpsert.mock.calls[0];
      expect(options).toEqual({ onConflict: 'student_id,lesson_id' });
      expect(payload.student_id).toBe('stu-1');
      expect(payload.lesson_id).toBe('lesson-1');
      expect(payload.words_attempted.cat).toMatchObject({ attempts: 3, correct: 2 });
      expect(payload.words_attempted.dog).toMatchObject({ attempts: 1, correct: 0 });
      expect(payload.words_attempted.cat.lastAttemptAt).not.toBe('2026-01-01T00:00:00.000Z');
      expect(payload.words_mastered).toEqual(['cat']);      // deduped, not appended twice
      expect(payload.started_at).toBe('2026-01-01T00:00:00.000Z'); // kept
      // never write XP columns directly
      expect(payload).not.toHaveProperty('total_xp');
      expect(payload).not.toHaveProperty('current_level');
      expect(payload).not.toHaveProperty('total_practice_sessions');
    });

    it('creates a fresh row with started_at when the student has no progress yet', async () => {
      await persistClassroomGameScores(makeGame(), [
        { userId: 'stu-1', score: 30, wordsFound: ['dog'] },
      ]);

      const [payload] = mockUpsert.mock.calls[0];
      expect(typeof payload.started_at).toBe('string');
      expect(payload.words_attempted).toEqual({
        cat: { attempts: 1, correct: 0, lastAttemptAt: expect.any(String) },
        dog: { attempts: 1, correct: 1, lastAttemptAt: expect.any(String) },
      });
      expect(payload.words_mastered).toEqual(['dog']);
    });

    it('matches Hebrew lesson words regardless of final-letter form', async () => {
      // GIVEN a Hebrew lesson word in its natural form and a board word with the final collapsed
      mockLessonsIn.mockResolvedValue({ data: [lessonRow('lesson-1', ['שלום', 'ילד'], 'he')], error: null });

      await persistClassroomGameScores(makeGame({ vocabularyWords: ['שלום', 'ילד'] }), [
        { userId: 'stu-1', score: 30, wordsFound: ['שלומ'] },
      ]);

      const [payload] = mockUpsert.mock.calls[0];
      // storage key is the normalized (final-collapsed) form, same as normalizeForStorage
      expect(payload.words_attempted['שלומ']).toMatchObject({ attempts: 1, correct: 1 });
      expect(payload.words_attempted['ילד']).toMatchObject({ attempts: 1, correct: 0 });
      // mastered keeps the teacher's display form
      expect(payload.words_mastered).toEqual(['שלום']);
      const row = mockInsert.mock.calls[0][0];
      expect(row.results.lessonWordsFound).toEqual(['שלום']);
      expect(row.results.lessonWordsMissed).toEqual(['ילד']);
    });

    it('scopes each lesson to its own words when the game spans several lessons', async () => {
      const game = makeGame({ lessonIds: ['lesson-a', 'lesson-b'], vocabularyWords: ['cat', 'dog'] });
      mockLessonsIn.mockResolvedValue({
        data: [lessonRow('lesson-a', ['cat']), lessonRow('lesson-b', ['dog'])],
        error: null,
      });

      await persistClassroomGameScores(game, [{ userId: 'stu-1', score: 30, wordsFound: ['cat'] }]);

      const payloads = upsertsFor();
      expect(payloads).toHaveLength(2);
      const a = payloads.find((p) => p.lesson_id === 'lesson-a');
      const b = payloads.find((p) => p.lesson_id === 'lesson-b');
      expect(Object.keys(a.words_attempted)).toEqual(['cat']);
      expect(a.words_attempted.cat.correct).toBe(1);
      expect(Object.keys(b.words_attempted)).toEqual(['dog']);
      expect(b.words_attempted.dog.correct).toBe(0);
      // the session row still reports the union
      const row = mockInsert.mock.calls[0][0];
      expect(row.words_attempted).toBe(2);
      expect(row.words_correct).toBe(1);
    });

    it('falls back to the game vocabulary and logs loudly when the lesson lookup fails', async () => {
      mockLessonsIn.mockResolvedValue({ data: null, error: { message: 'boom' } });

      await persistClassroomGameScores(makeGame(), [{ userId: 'stu-1', score: 30, wordsFound: ['cat'] }]);

      expect(mockLogger.error).toHaveBeenCalledWith('CLASSROOM_GAME', expect.stringContaining('boom'));
      const [payload] = mockUpsert.mock.calls[0];
      expect(payload.words_attempted.cat.correct).toBe(1);
      expect(payload.words_attempted.dog.correct).toBe(0);
    });

    it('never lets one student’s failure block the others, and logs it', async () => {
      const game = makeGame({
        players: [
          { userId: 'stu-1', username: 'Alice', socketId: 's1' },
          { userId: 'stu-2', username: 'Bob', socketId: 's2' },
        ],
      });
      mockMaybeSingle
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValue({ data: null, error: null });

      const rewards = await persistClassroomGameScores(game, [
        { userId: 'stu-1', score: 30, wordsFound: ['cat'] },
        { userId: 'stu-2', score: 30, wordsFound: ['dog'] },
      ]);

      expect(mockLogger.error).toHaveBeenCalledWith('CLASSROOM_GAME', expect.stringContaining('stu-1'));
      expect(mockInsert).toHaveBeenCalledTimes(2);
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert.mock.calls[0][0].student_id).toBe('stu-2');
      // both still get a reward entry (XP path ran)
      expect(rewards.map((r) => r.userId)).toEqual(['stu-1', 'stu-2']);
    });

    it('logs an upsert error instead of swallowing it', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'rls denied' } });
      await persistClassroomGameScores(makeGame(), [{ userId: 'stu-1', score: 30, wordsFound: ['cat'] }]);
      expect(mockLogger.error).toHaveBeenCalledWith('CLASSROOM_GAME', expect.stringContaining('rls denied'));
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

describe('playerScoresFromGameResults', () => {
  it('maps validated results to per-user scores, skipping bots, guests and rejected words', () => {
    // GIVEN the server-side results payload and the room's user map
    const results = [
      {
        username: 'Alice',
        totalScore: 120,
        wordDetails: [
          { word: 'cat', validated: true, isDuplicate: false },
          { word: 'dog', validated: true, isDuplicate: true },   // duplicate still counts as found
          { word: 'zzz', validated: false, isDuplicate: false }, // rejected → not found
        ],
      },
      { username: 'Botty', totalScore: 500, wordDetails: [{ word: 'cat', validated: true, isDuplicate: false }] },
      { username: 'Ghost', totalScore: 10, wordDetails: [] },
    ];
    const users = {
      Alice: { authUserId: 'stu-1' },
      Botty: { authUserId: null, isBot: true },
      Ghost: { authUserId: null },
    };

    // WHEN
    const scores = playerScoresFromGameResults(results, users);

    // THEN
    expect(scores).toEqual([{ userId: 'stu-1', username: 'Alice', score: 120, wordsFound: ['cat', 'dog'] }]);
  });
});
