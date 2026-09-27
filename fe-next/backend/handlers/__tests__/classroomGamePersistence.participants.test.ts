/**
 * Who actually gets a `practice_sessions` row (RED first).
 *
 * Live evidence, game GHYRVS on 2026-09-05: a teacher ran a vocab quiz, two
 * students played to the end screen, and the Review tab said "No class game
 * yet". `select * from practice_sessions where results->>'gameCode' is not
 * null` returned ZERO rows — for that game and for every classroom game ever.
 *
 * Cause: `persistClassroomGameScores` loops `game.players`, the CLASSROOM
 * roster, which is filled only by the `joinClassroomGame` socket event
 * (classroomGameHandler.ts). Students who reach the room the normal way — the
 * join page, the projector code, `playerJoinHandler` — never emit it. The
 * Redis dump of GHYRVS is literally `players: []`, so the loop body never ran:
 * no insert, no error, no log. A textbook Class 4 silent no-op.
 *
 * The people who played are in `playerScores`, which the quiz builds from its
 * own session roster. The participant list must therefore be the UNION of the
 * roster and the scores, keyed by user id — never the roster alone.
 */
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
import { persistClassroomGameScores } from '../classroomGamePersistence';

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

const studentIds = () => sessionInserts.map((r) => r.student_id as string);

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

describe('participants are everyone who played, not just the classroom roster', () => {
  it('writes a row for each scored player when the roster is empty (the GHYRVS shape)', async () => {
    await persistClassroomGameScores(
      game() as never,
      [
        { userId: 'student-a', score: 300, wordsFound: ['abandon'] },
        { userId: 'student-b', score: 150, wordsFound: ['brittle'] },
      ],
    );

    expect(studentIds().sort()).toEqual(['student-a', 'student-b']);
  });

  it('unions the roster with the scores without duplicating a student', async () => {
    await persistClassroomGameScores(
      game({
        players: [
          { userId: 'student-a', username: 'ana', socketId: 's1' },
          { userId: 'student-c', username: 'cam', socketId: 's3' },
        ],
      }) as never,
      [
        { userId: 'student-a', score: 300, wordsFound: ['abandon'] },
        { userId: 'student-b', score: 150, wordsFound: ['brittle'] },
      ],
    );

    // student-c joined but scored nothing: still a row, still "did not find".
    expect(studentIds().sort()).toEqual(['student-a', 'student-b', 'student-c']);
    const a = sessionInserts.find((r) => r.student_id === 'student-a')!;
    expect(a.score).toBe(300);
    expect(a.vocabulary_words_found).toEqual(['abandon']);
  });

  it('never writes a row for the teacher hosting the game', async () => {
    await persistClassroomGameScores(
      game({
        players: [
          { userId: TEACHER_ID, username: 'Ms K', socketId: 'host' },
          { userId: 'student-a', username: 'ana', socketId: 's1' },
        ],
      }) as never,
      [{ userId: 'student-a', score: 300, wordsFound: ['abandon'] }],
    );

    expect(studentIds()).toEqual(['student-a']);
  });

  it('ignores score entries with no user id — a pure guest has no lesson progress', async () => {
    await persistClassroomGameScores(
      game() as never,
      [
        { userId: '', score: 90, wordsFound: ['candid'] },
        { userId: 'student-a', score: 300, wordsFound: ['abandon'] },
      ] as never,
    );

    expect(studentIds()).toEqual(['student-a']);
  });
});

describe('never a silent no-op (Class 4)', () => {
  it('logs the inserted row count on success', async () => {
    await persistClassroomGameScores(
      game() as never,
      [{ userId: 'student-a', score: 300, wordsFound: ['abandon'] }],
    );

    const info = (logger.info as Mock).mock.calls.map((c) => String(c[1]));
    expect(info.some((line) => /1 practice session/i.test(line) && line.includes('GHYRVS'))).toBe(true);
  });

  it('warns loudly when a finished game produced no rows at all', async () => {
    await persistClassroomGameScores(game() as never, []);

    const warn = (logger.warn as Mock).mock.calls.map((c) => String(c[1]));
    expect(warn.some((line) => line.includes('GHYRVS') && /no participants|0 practice session/i.test(line))).toBe(true);
  });

  it('releases the idempotency key when it wrote nothing, so the real end path can still persist', async () => {
    await persistClassroomGameScores(game() as never, []);

    expect(redisCalls).toContainEqual({ op: 'del', key: 'classroom_game_persisted:GHYRVS' });
  });

  it('keeps the idempotency key once rows exist, so a second end path cannot double-write', async () => {
    await persistClassroomGameScores(
      game() as never,
      [{ userId: 'student-a', score: 300, wordsFound: ['abandon'] }],
    );

    expect(redisCalls.filter((c) => c.op === 'del')).toEqual([]);
  });

  it('releases the key when the game has no lessons to attribute anything to', async () => {
    await persistClassroomGameScores(game({ lessonIds: [] }) as never, []);

    expect(redisCalls).toContainEqual({ op: 'del', key: 'classroom_game_persisted:GHYRVS' });
  });
});
