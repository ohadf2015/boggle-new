/**
 * Classroom completion telemetry — the regression guard for the live path.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * `edu_practice_complete` had a live call site in `PracticeSessionProvider` and
 * fired ZERO times in 180 days. The reason was never a swallowed event: that
 * provider mounts only on `/[locale]/student/lessons/[id]`, which saw 5
 * pageviews from 2 users and has never produced a completed session. Every real
 * completion — 6 of 6 in the DB, all with a `classroom_id` — is written HERE,
 * by the Socket.IO backend, which had no telemetry at all.
 *
 * So the guard has to sit on the path that actually runs. If
 * `persistClassroomGameScores` ever stops emitting, or emits without the
 * properties the classroom funnel joins on, these tests fail.
 */
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

const sessionInserts: Array<Record<string, unknown>> = [];
const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

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
  { word: 'candid', definition: 'honest' },
  { word: 'dwindle', definition: 'to shrink' },
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
          insert: (row: Record<string, unknown>) => {
            sessionInserts.push(row);
            return Promise.resolve({ error: null });
          },
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

const game = (gameMode: string) => ({
  gameCode: 'ABC123',
  classroomId: 'class-1',
  teacherId: 'teacher-1',
  teacherName: 'Ms K',
  lessonIds: ['lesson-1'],
  lessonNames: ['Unit 3'],
  vocabularyWords: LESSON_WORDS.map((w) => w.word),
  settings: { gameMode },
  players: [
    { userId: 'user-ana', username: 'ana', socketId: 's1' },
    { userId: 'user-bo', username: 'bo', socketId: 's2' },
  ],
  createdAt: new Date().toISOString(),
  status: 'finished' as const,
});

const scores = [
  { userId: 'user-ana', score: 300, wordsFound: ['abandon', 'brittle'] },
  { userId: 'user-bo', score: 100, wordsFound: ['abandon'] },
];

beforeEach(() => {
  vi.clearAllMocks();
  sessionInserts.length = 0;
  captured.length = 0;
  (getSupabase as Mock).mockReturnValue(makeSupabase());
});

describe('persistClassroomGameScores — edu_classroom_game_completed', () => {
  it('Given a finished classroom game, When persisted, Then one completion event per student is emitted', async () => {
    await persistClassroomGameScores(game('word-hunt'), scores);

    const evs = captured.filter((c) => c.event === 'edu_classroom_game_completed');
    expect(evs).toHaveLength(2);
    expect(evs.map((e) => e.distinctId).sort()).toEqual(['user-ana', 'user-bo']);
  });

  it('Given a completion event, When emitted, Then it carries classroom_id and the REAL game mode', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores);

    const ev = captured.find((c) => c.event === 'edu_classroom_game_completed')!;
    expect(ev.properties.classroom_id).toBe('class-1');
    // `practice_type` is pinned to 'solo_board' by a CHECK constraint, so the
    // mode column is the only place the real mode survives — and the only way
    // "which modes do students play in class" is answerable.
    expect(ev.properties.game_mode).toBe('vocab-quiz');
    expect(ev.properties.game_code).toBe('ABC123');
  });

  it('Given a completion event, When emitted, Then $host is present so the classroom funnel can see it', async () => {
    await persistClassroomGameScores(game('classic'), scores);

    const evs = captured.filter((c) => c.event === 'edu_classroom_game_completed');
    expect(evs.length).toBeGreaterThan(0);
    for (const ev of evs) {
      expect(ev.properties.$host).toBe(EDU_ANALYTICS_HOST);
    }
  });

  it('Given per-student scores, When emitted, Then score and lesson accuracy match that student', async () => {
    await persistClassroomGameScores(game('classic'), scores);

    const ana = captured.find(
      (c) => c.event === 'edu_classroom_game_completed' && c.distinctId === 'user-ana'
    )!;
    expect(ana.properties.score).toBe(300);
    expect(ana.properties.lesson_words_found).toBe(2);
    expect(ana.properties.lesson_words_asked).toBe(4);
    expect(ana.properties.lesson_accuracy).toBeCloseTo(0.5);
  });

  it('Given PostHog is unavailable, When persisted, Then practice sessions are still written', async () => {
    // Analytics must never be able to cost a class its results.
    await persistClassroomGameScores(game('classic'), scores);
    expect(sessionInserts.length).toBe(2);
  });
});
