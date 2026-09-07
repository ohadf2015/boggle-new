/**
 * Writer → reader contract for a live quiz round.
 *
 * `persistClassroomGameScores` writes `practice_sessions`; the teacher's
 * Review tab reads them through `getRecentClassroomGames`
 * (lib/supabase/analyticsLastGame.ts) via `useRecentClassroomGames`. Nothing
 * in the type system connects the two, so a column rename or a changed filter
 * on either side is invisible until a teacher stares at "No class game yet"
 * after a round their class actually played — which is exactly what happened
 * with game GHYRVS on 2026-09-05.
 *
 * So: run the real writer, take the rows it produced, and hand THOSE rows to
 * the real reader. Both filters the reader applies are asserted against what
 * the writer set, and the resulting word x student grid is checked end to end.
 */
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

const sessionInserts: Array<Record<string, unknown>> = [];

vi.mock('../../modules/supabase/client.js', () => ({ getSupabase: vi.fn() }));
vi.mock('../../redisClient.js', () => ({ getRedisClient: vi.fn(() => null) }));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getSupabase } from '../../modules/supabase/client.js';
import { persistClassroomGameScores } from '../classroomGamePersistence';
import { getRecentClassroomGames } from '@/lib/supabase/analyticsLastGame';
import { supabase as readerSupabase } from '@/lib/supabase';

const CLASSROOM_ID = 'class-1';
const GAME_CODE = 'GHYRVS';

const LESSON_WORDS = [
  { word: 'abandon', definition: 'to leave behind' },
  { word: 'brittle', definition: 'easily broken' },
  { word: 'candid', definition: 'honest' },
  { word: 'dwindle', definition: 'to shrink' },
];

// ---------------------------------------------------------------------------
// Writer side
// ---------------------------------------------------------------------------

function writerSupabase() {
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

/** The GHYRVS shape: an empty classroom roster, two students who actually played. */
const quizGame = {
  gameCode: GAME_CODE,
  classroomId: CLASSROOM_ID,
  teacherId: 'teacher-1',
  teacherName: 'Ms K',
  lessonIds: ['lesson-1'],
  lessonNames: ['Unit 3'],
  vocabularyWords: LESSON_WORDS.map((w) => w.word),
  settings: { gameMode: 'vocab-quiz' },
  players: [] as Array<{ userId: string; username: string; socketId: string }>,
  createdAt: new Date().toISOString(),
  status: 'finished' as const,
};

const quizScores = [
  { userId: 'student-a', score: 300, wordsFound: ['abandon', 'brittle'] },
  { userId: 'student-b', score: 120, wordsFound: ['abandon'] },
];

// The quiz asked 3 of the lesson's 4 words. `dwindle` was never shown and must
// not appear in anyone's missed column.
const ASKED = ['abandon', 'brittle', 'candid'];

// ---------------------------------------------------------------------------
// Reader side
// ---------------------------------------------------------------------------

type Result = { data?: unknown; error?: { message: string } | null; count?: number | null };

function chain(result: Result) {
  const q: Record<string, unknown> = {};
  const calls: Array<[string, unknown[]]> = [];
  for (const m of ['select', 'eq', 'in', 'not', 'order', 'limit', 'gte', 'lte']) {
    q[m] = vi.fn((...args: unknown[]) => {
      calls.push([m, args]);
      return q;
    });
  }
  q.calls = calls;
  q.then = (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, count: null, ...result }).then(resolve, reject);
  return q as Record<string, Mock> & { calls: Array<[string, unknown[]]> } & PromiseLike<Result>;
}

function mockReaderTables(tables: Record<string, Result>) {
  const chains: Record<string, ReturnType<typeof chain>> = {};
  (readerSupabase!.from as Mock).mockImplementation((table: string) => {
    if (!(table in tables)) throw new Error(`unexpected table ${table}`);
    chains[table] = chains[table] ?? chain(tables[table]);
    return chains[table];
  });
  return chains;
}

/** Exactly the columns `getRecentClassroomGames` selects, taken off a written row. */
function asReadRow(row: Record<string, unknown>) {
  return {
    student_id: row.student_id,
    score: row.score,
    total_score: row.total_score,
    mode: row.mode,
    completed_at: row.completed_at,
    results: row.results,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionInserts.length = 0;
  (getSupabase as Mock).mockReturnValue(writerSupabase());
});

describe('a quiz round the writer persists is a round the Review tab can read', () => {
  it('writes rows carrying both columns the reader filters on', async () => {
    await persistClassroomGameScores(quizGame as never, quizScores, { askedWords: ASKED });

    expect(sessionInserts).toHaveLength(2);
    for (const row of sessionInserts) {
      // .eq('classroom_id', classroomId)
      expect(row.classroom_id).toBe(CLASSROOM_ID);
      // .not('results->>gameCode', 'is', null)
      expect((row.results as { gameCode?: string }).gameCode).toBe(GAME_CODE);
      // .order('completed_at', ...) — a null here drops the row out of the order.
      expect(row.completed_at).toEqual(expect.any(String));
    }
  });

  it('surfaces the game with every student who played and the words they missed', async () => {
    await persistClassroomGameScores(quizGame as never, quizScores, { askedWords: ASKED });

    mockReaderTables({
      practice_sessions: { data: sessionInserts.map(asReadRow) },
      classroom_memberships: {
        data: [
          { student_id: 'student-a', joined_at: null },
          { student_id: 'student-b', joined_at: null },
        ],
        count: 2,
      },
      public_profiles: {
        data: [
          { id: 'student-a', display_name: 'Ana', username: 'Player_aaaa' },
          { id: 'student-b', display_name: 'Ben', username: 'Player_bbbb' },
        ],
      },
    });

    const { data, error } = await getRecentClassroomGames(CLASSROOM_ID, 5);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const game = data[0];
    expect(game.gameCode).toBe(GAME_CODE);
    expect(game.gameMode).toBe('vocab-quiz');
    expect(game.players.map((p) => p.name).sort()).toEqual(['Ana', 'Ben']);

    const ana = game.players.find((p) => p.studentId === 'student-a')!;
    expect(ana.lessonWordsFound.sort()).toEqual(['abandon', 'brittle']);
    expect(ana.lessonWordsMissed).toEqual(['candid']);

    const ben = game.players.find((p) => p.studentId === 'student-b')!;
    expect(ben.lessonWordsMissed.sort()).toEqual(['brittle', 'candid']);

    // `dwindle` was never asked, so it is nobody's miss and no reteach candidate.
    const everyWord = game.players.flatMap((p) => [...p.lessonWordsFound, ...p.lessonWordsMissed]);
    expect(everyWord).not.toContain('dwindle');
    expect(game.missedWords.map((w) => w.word)).not.toContain('dwindle');
  });

  it('reports nobody as absent when everyone on the roster played', async () => {
    await persistClassroomGameScores(quizGame as never, quizScores, { askedWords: ASKED });

    mockReaderTables({
      practice_sessions: { data: sessionInserts.map(asReadRow) },
      classroom_memberships: {
        data: [
          { student_id: 'student-a', joined_at: null },
          { student_id: 'student-b', joined_at: null },
        ],
        count: 2,
      },
      public_profiles: { data: [] },
    });

    const { data } = await getRecentClassroomGames(CLASSROOM_ID, 5);

    expect(data[0].absentStudents).toEqual([]);
    expect(data[0].participation.played).toBe(2);
  });
});
