import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

const roundInserts: Array<Record<string, unknown>> = [];
const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

const fake = {
  sessionError: null as null | { message: string },
  roundInsertError: null as null | { message: string },
  priorRounds: 0,
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
          select: () => ({
            eq: () => Promise.resolve({ count: fake.priorRounds, error: null }),
          }),
          insert: (row: Record<string, unknown>) => {
            roundInserts.push(row);
            return Promise.resolve({ error: fake.roundInsertError });
          },
        };
      }
      if (table === 'classroom_memberships') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({
                data: [{ student_id: 'user-ana', joined_at: null }],
                error: null,
              }),
            }),
          }),
        };
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
  (getSupabase as Mock).mockReturnValue(makeSupabase());
});

describe('persistClassroomGameScores — classroom_rounds row', () => {
  it('Given sessions were written, When persisted, Then one round row carries the classroom_id', async () => {
    await persistClassroomGameScores(game, scores);

    expect(roundInserts).toHaveLength(1);
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
    expect(evs).toHaveLength(1);
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
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({
                data: [{ student_id: 'user-ana', joined_at: new Date(Date.now() - 2 * DAY).toISOString() }],
                error: null,
              }),
            }),
          }),
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
});
