import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

const sessionInserts: Array<Record<string, unknown>> = [];
const redisCalls: Array<{ op: string; key: string }> = [];
let redisSetResult: string | null = 'OK';

vi.mock('../../modules/supabase/client.js', () => ({ getSupabase: vi.fn() }));
vi.mock('../../redisClient.js', () => ({ getRedisClient: vi.fn() }));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getSupabase } from '../../modules/supabase/client.js';
import { getRedisClient } from '../../redisClient.js';
import logger from '../../utils/logger.js';
import { persistClassroomGameScores, playerScoresFromGameResults, roundHasStudents } from '../classroomGamePersistence';

const LESSON_WORDS = [
  { word: 'abandon', definition: 'to leave behind' },
  { word: 'brittle', definition: 'easily broken' },
  { word: 'candid', definition: 'honest' },
];

function makeSupabase() {
  return {
    from(table: string) {
      if (table === 'vocabulary_lessons') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: 'lesson-1', words: LESSON_WORDS, language: 'en' }],
                error: null,
              }),
          }),
        };
      }
      if (table === 'practice_sessions') {
        return {
          insert: (row: Record<string, unknown>) => {
            sessionInserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'student_lesson_progress') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            }),
          }),
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: () => Promise.resolve({ error: null }),
  };
}

const TEACHER_ID = 'teacher-1';

function game(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'GHYRVS',
    classroomId: 'class-1',
    teacherId: TEACHER_ID,
    teacherName: 'Ms K',
    lessonIds: ['lesson-1'],
    lessonNames: ['Unit 3'],
    vocabularyWords: LESSON_WORDS.map((w) => w.word),
    settings: { gameMode: 'vocab-quiz' },
    players: [] as Array<{ userId: string; username: string; socketId: string }>,
    createdAt: new Date().toISOString(),
    status: 'finished' as const,
    ...overrides,
  };
}


beforeEach(() => {
  vi.clearAllMocks();
  sessionInserts.length = 0;
  redisCalls.length = 0;
  redisSetResult = 'OK';
  (getSupabase as Mock).mockReturnValue(makeSupabase());
  (getRedisClient as Mock).mockReturnValue({
    set: (key: string) => {
      redisCalls.push({ op: 'set', key });
      return Promise.resolve(redisSetResult);
    },
    del: (key: string) => {
      redisCalls.push({ op: 'del', key });
      return Promise.resolve(1);
    },
  });
});

const lines = (fn: unknown) => (fn as Mock).mock.calls.map((c) => String(c[1]));

describe('a teacher practice round with bots is not a lost class round', () => {
  it('given only the teacher scored (bots dropped), then it logs info, not the no-participants warning', async () => {
    await persistClassroomGameScores(game() as never, [{ userId: TEACHER_ID, score: 40, wordsFound: [] }]);

    expect(lines(logger.warn).some((l) => /no participants/i.test(l))).toBe(false);
    expect(lines(logger.info).some((l) => l.includes('GHYRVS') && /practice round|only the teacher/i.test(l))).toBe(true);
    expect(sessionInserts).toEqual([]);
  });

  it('given a student score was submitted but nothing could be recorded, then it still warns', async () => {
    await persistClassroomGameScores(game() as never, []);

    expect(lines(logger.warn).some((l) => /no participants/i.test(l))).toBe(true);
  });
});

describe('roundHasStudents', () => {
  const users = {
    'Ms K': { authUserId: TEACHER_ID },
    'Taylor Bot': { isBot: true },
    Noa: { authUserId: 'student-a' },
    Guest: { authUserId: null },
  };

  it('given only the teacher and bots played, then the round has no students', () => {
    const results = [{ username: 'Ms K', totalScore: 10 }, { username: 'Taylor Bot', totalScore: 90 }];
    expect(roundHasStudents(results, users, TEACHER_ID)).toBe(false);
  });

  it('given a student with an account played, then the round has students', () => {
    const results = [{ username: 'Ms K', totalScore: 10 }, { username: 'Noa', totalScore: 90 }];
    expect(roundHasStudents(results, users, TEACHER_ID)).toBe(true);
  });

  it('given a guest without an account played, then the round still has students', () => {
    const results = [{ username: 'Guest', totalScore: 30 }];
    expect(roundHasStudents(results, users, TEACHER_ID)).toBe(true);
  });
});

describe('playerScoresFromGameResults - students without an account are reported, not silently dropped', () => {
  it('given a human with no auth id, then it warns with the game and a count, never a name', () => {
    playerScoresFromGameResults(
      [{ username: 'Guest', totalScore: 30, wordDetails: [] }],
      { Guest: { authUserId: null } },
      'ABC123',
    );

    const warns = lines(logger.warn);
    expect(warns.some((l) => l.includes('ABC123') && l.includes('1 player'))).toBe(true);
    expect(warns.some((l) => l.includes('Guest'))).toBe(false);
  });

  it('given a player who already left the room (no user entry), then it does not warn', () => {
    playerScoresFromGameResults([{ username: 'Gone', totalScore: 30, wordDetails: [] }], {}, 'ABC123');

    expect(lines(logger.warn)).toEqual([]);
  });

  it('given only bots lacked an account, then it does not warn', () => {
    playerScoresFromGameResults(
      [{ username: 'Taylor Bot', totalScore: 30, wordDetails: [] }],
      { 'Taylor Bot': { isBot: true } },
      'ABC123',
    );

    expect(lines(logger.warn)).toEqual([]);
  });
});
