import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';

const roundInserts: Array<Record<string, unknown>> = [];
const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

const fake = {
  sessionError: null as null | { message: string },
  roundInsertError: null as null | { message: string },
  priorRounds: 0,
  flagged: [] as string[],
};

vi.mock('../../modules/supabase/client.js', () => ({ getSupabase: vi.fn() }));
vi.mock('../../redisClient.js', () => ({ getRedisClient: vi.fn(() => null) }));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({
    capture: (arg: { distinctId: string; event: string; properties: Record<string, unknown> }) => {
      captured.push(arg);
    },
  }),
}));

import { getSupabase } from '../../modules/supabase/client.js';
import { persistClassroomGameScores } from '../classroomGamePersistence';
import { EDU_ANALYTICS_HOST } from '../../utils/educationTelemetry';
import logger from '../../utils/logger.js';

// Flake diagnosis (CI-only, never reproduced locally): recordClassroomRound runs
// several lookups inside one try/catch that logs and swallows, so a throw there
// skips the insert and the test only sees `roundInserts.length === 0`. The logger
// is mocked, so the reason vanished. Surface what was swallowed.
function swallowedErrors(): string {
  const calls = (logger.error as unknown as Mock).mock.calls;
  return calls.length
    ? `logger.error calls:\n${calls.map((c) => c.map(String).join(' | ')).join('\n')}`
    : 'no logger.error calls';
}

const LESSON_WORDS = [
  { word: 'abandon', definition: 'to leave behind' },
  { word: 'brittle', definition: 'easily broken' },
];

function makeSupabase() {
  return {
    from(table: string) {
      if (table === 'vocabulary_lessons') {
        return {
          select: () => ({
            in: () => Promise.resolve({
              data: [{ id: 'lesson-1', words: LESSON_WORDS, language: 'en' }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'practice_sessions') {
        return {
          insert: () => Promise.resolve({ error: fake.sessionError }),
        };
      }
      if (table === 'classroom_rounds') {
        return {
          select: (_cols: string, opts?: { head?: boolean }) => {
            const result = opts?.head
              ? { count: fake.priorRounds, error: null }
              : { data: fake.priorRounds > 0 ? [{ completed_at: new Date().toISOString() }] : [], error: null };
            const chain: Record<string, unknown> = {
              then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(result).then(ok, bad),
            };
            for (const m of ['eq', 'gte', 'order', 'limit']) chain[m] = () => chain;
            return chain;
          },
          insert: (row: Record<string, unknown>) => {
            roundInserts.push(row);
            return Promise.resolve({ error: fake.roundInsertError });
          },
        };
      }
      if (table === 'classroom_memberships') {
        return {
          select: () => {
            const filters = {};
            const chain = {
              eq(col, val) {
                filters[col] = val;
                return chain;
              },
              in() {
                // Rehearsal seats are not players. This fixture has none.
                if (filters.is_rehearsal === true) {
                  return Promise.resolve({ data: [], error: null });
                }
                return Promise.resolve({
                  data: [{ student_id: 'user-ana', joined_at: null }, { student_id: 'user-bo', joined_at: null }],
                  error: null,
                });
              },
            };
            return chain;
          },
        };
      }
      if (table === 'profiles') {
        return { select: () => ({ in: (_c: string, ids: string[]) => ({ eq: () => Promise.resolve({ data: ids.filter((i) => fake.flagged.includes(i)).map((id) => ({ id })), error: null }) }) }) };
      }
      if (table === 'student_lesson_progress') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          }),
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: () => Promise.resolve({ error: null }),
  };
}

const game = {
  gameCode: 'RND123',
  classroomId: 'class-1',
  teacherId: 'teacher-1',
  teacherName: 'Ms K',
  lessonIds: ['lesson-1'],
  lessonNames: ['Unit 3'],
  vocabularyWords: LESSON_WORDS.map((w) => w.word),
  settings: { gameMode: 'classic' },
  players: [
    { userId: 'user-ana', username: 'ana', socketId: 's1' },
    { userId: 'user-bo', username: 'bo', socketId: 's2' },
  ],
  createdAt: new Date(Date.now() - 120_000).toISOString(),
  startedAt: new Date(Date.now() - 90_000).toISOString(),
  status: 'finished' as const,
};

const scores = [
  { userId: 'user-ana', score: 300, wordsFound: ['abandon', 'brittle'] },
  { userId: 'user-bo', score: 100, wordsFound: ['abandon'] },
];

const eventsNamed = (name: string) => captured.filter((c) => c.event === name);

beforeEach(() => {
  vi.clearAllMocks();
  roundInserts.length = 0;
  captured.length = 0;
  fake.sessionError = null;
  fake.roundInsertError = null;
  fake.priorRounds = 0;
  fake.flagged = [];
  (getSupabase as Mock).mockReturnValue(makeSupabase());
});

afterEach((ctx) => {
  if (ctx.task.result?.state === 'fail') {
    console.error(`[classroomRoundPersistence] ${ctx.task.name}\n${swallowedErrors()}`);
  }
});

describe('persistClassroomGameScores — classroom_rounds row', () => {
  it('Given sessions were written, When persisted, Then one round row carries the classroom_id', async () => {
    await persistClassroomGameScores(game, scores);

    expect(roundInserts, swallowedErrors()).toHaveLength(1);
    expect(roundInserts[0]).toMatchObject({
      classroom_id: 'class-1',
      teacher_id: 'teacher-1',
      game_code: 'RND123',
      game_mode: 'classic',
      player_count: 2,
      lesson_count: 1,
    });
    expect(roundInserts[0].duration_seconds).toEqual(expect.any(Number));
  });

  it('Given no practice session was written, When persisted, Then no round row is inserted', async () => {
    fake.sessionError = { message: 'boom' };

    await persistClassroomGameScores(game, scores);

    expect(roundInserts).toHaveLength(0);
    expect(eventsNamed('edu_live_round_completed')).toHaveLength(0);
  });

  it('Given the round insert fails, When persisted, Then rewards still resolve and no round event fires', async () => {
    fake.roundInsertError = { message: 'rls denied' };

    await expect(persistClassroomGameScores(game, scores)).resolves.toBeDefined();
    expect(eventsNamed('edu_live_round_completed')).toHaveLength(0);
  });
});

describe('persistClassroomGameScores — round education events', () => {
  it('Given a completed round, When persisted, Then edu_live_round_completed fires exactly once with round props', async () => {
    await persistClassroomGameScores(game, scores);

    const evs = eventsNamed('edu_live_round_completed');
    expect(evs, swallowedErrors()).toHaveLength(1);
    expect(evs[0].distinctId).toBe('teacher-1');
    expect(evs[0].properties).toMatchObject({
      classroom_id: 'class-1',
      game_mode: 'classic',
      player_count: 2,
      $host: EDU_ANALYTICS_HOST,
    });
    expect(evs[0].properties.duration_seconds).toEqual(expect.any(Number));
  });

  it('Given the teacher has no prior rounds, When persisted, Then edu_teacher_first_live_game fires exactly once', async () => {
    await persistClassroomGameScores(game, scores);

    const evs = eventsNamed('edu_teacher_first_live_game');
    expect(evs).toHaveLength(1);
    expect(evs[0].properties).toMatchObject({ classroom_id: 'class-1', game_mode: 'classic', player_count: 2 });
  });

  it('Given the teacher already ran a round, When persisted, Then edu_teacher_first_live_game does not fire', async () => {
    fake.priorRounds = 4;

    await persistClassroomGameScores(game, scores);

    expect(eventsNamed('edu_teacher_first_live_game')).toHaveLength(0);
    expect(eventsNamed('edu_live_round_completed')).toHaveLength(1);
  });

  it('Given a returning student, When persisted, Then edu_student_returned fires once for that student', async () => {
    const DAY = 86_400_000;
    const supa = makeSupabase();
    const base = supa.from;
    supa.from = (table: string) => {
      if (table === 'classroom_memberships') {
        return {
          select: () => {
            const filters: Record<string, unknown> = {};
            const chain = {
              eq(col: string, val: unknown) {
                filters[col] = val;
                return chain;
              },
              in() {
                if (filters.is_rehearsal === true) {
                  return Promise.resolve({ data: [], error: null });
                }
                return Promise.resolve({
                  // Extra minute so day_n stays 2 even when `now` was snapshotted
                  // before this mock runs (floor((2d - 1ms) / 1d) === 1).
                  data: [
                    { student_id: 'user-ana', joined_at: new Date(Date.now() - 2 * DAY - 60_000).toISOString() },
                    { student_id: 'user-bo', joined_at: null },
                  ],
                  error: null,
                });
              },
            };
            return chain;
          },
        };
      }
      return base(table);
    };
    (getSupabase as Mock).mockReturnValue(supa);

    await persistClassroomGameScores(game, scores);

    const evs = eventsNamed('edu_student_returned');
    expect(evs.map((e) => e.distinctId)).toEqual(['user-ana']);
    expect(evs[0].properties).toMatchObject({ classroom_id: 'class-1', day_n: 2 });
  });

  it('Given a QA teacher, When the round persists, Then every per-student completion carries is_test_account true', async () => {
    fake.flagged = ['teacher-1'];
    (getSupabase as Mock).mockReturnValue(makeSupabase());
    await persistClassroomGameScores(game as never, scores);
    const done = eventsNamed('edu_classroom_game_completed');
    expect(done.length).toBe(2);
    for (const e of done) expect(e.properties.is_test_account).toBe(true);
  });

  it('Given a real teacher and one flagged QA student, When persisted, Then only that student is tagged', async () => {
    fake.flagged = ['user-bo'];
    (getSupabase as Mock).mockReturnValue(makeSupabase());
    await persistClassroomGameScores(game as never, scores);
    const byUser = Object.fromEntries(eventsNamed('edu_classroom_game_completed').map((e) => [e.distinctId, e.properties.is_test_account]));
    expect(byUser).toEqual({ 'user-ana': false, 'user-bo': true });
  });
});
