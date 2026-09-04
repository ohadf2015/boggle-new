/**
 * getRecentClassroomGames — turns classroom `practice_sessions` rows (one per
 * student per game, `results` JSON written by the backend at game end) into
 * per-game insight objects for the teacher's "Last class game" card.
 */
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { getRecentClassroomGames } from '../analyticsLastGame';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Result = { data?: unknown; error?: { message: string } | null; count?: number | null };

/** Chainable query stub: every builder method returns itself; awaiting resolves `result`. */
function chain(result: Result) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'not', 'order', 'limit', 'gte', 'lte']) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, count: null, ...result }).then(resolve, reject);
  return q as Record<string, Mock> & PromiseLike<Result>;
}

function mockTables(tables: Record<string, Result>) {
  const chains: Record<string, ReturnType<typeof chain>> = {};
  (supabase!.from as Mock).mockImplementation((table: string) => {
    if (!(table in tables)) throw new Error(`unexpected table ${table}`);
    chains[table] = chains[table] ?? chain(tables[table]);
    return chains[table];
  });
  return chains;
}

function sessionRow(
  studentId: string,
  gameCode: string,
  completedAt: string,
  found: string[],
  missed: string[],
  extra: Record<string, unknown> = {}
) {
  return {
    student_id: studentId,
    score: 100,
    total_score: 100,
    mode: 'classic',
    completed_at: completedAt,
    results: {
      gameCode,
      gameMode: 'classic',
      lessonIds: ['lesson-1'],
      lessonWordsFound: found,
      lessonWordsMissed: missed,
      allWordsFound: found,
      playerCount: 2,
    },
    ...extra,
  };
}

describe('getRecentClassroomGames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list without touching other tables when the class has no game rows', async () => {
    const chains = mockTables({ practice_sessions: { data: [] } });

    const { data, error } = await getRecentClassroomGames('class-1', 5);

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(Object.keys(chains)).toEqual(['practice_sessions']);
  });

  it('filters to this classroom, only rows with a gameCode, newest first', async () => {
    const chains = mockTables({ practice_sessions: { data: [] } });

    await getRecentClassroomGames('class-1', 3);

    const q = chains.practice_sessions;
    expect(q.eq).toHaveBeenCalledWith('classroom_id', 'class-1');
    expect(q.not).toHaveBeenCalledWith('results->>gameCode', 'is', null);
    expect(q.order).toHaveBeenCalledWith('completed_at', { ascending: false });
    expect(q.limit).toHaveBeenCalled();
  });

  it('groups rows by game, resolves roster names, and derives class-wide word stats', async () => {
    // GIVEN two students in the newest game (G2) and one row from an older game (G1)
    mockTables({
      practice_sessions: {
        data: [
          sessionRow('stu-1', 'G2', '2026-09-04T10:00:00Z', ['cat', 'dog'], ['fox'], { score: 120 }),
          sessionRow('stu-2', 'G2', '2026-09-04T09:59:00Z', ['cat'], ['dog', 'fox'], { score: 40 }),
          sessionRow('stu-1', 'G1', '2026-09-01T10:00:00Z', ['cat'], ['dog', 'fox']),
        ],
      },
      classroom_memberships: { count: 12 },
      public_profiles: {
        data: [
          { id: 'stu-1', display_name: 'Alice', username: 'alice99' },
          { id: 'stu-2', display_name: null, username: 'bobby' },
        ],
      },
    });

    // WHEN
    const { data, error } = await getRecentClassroomGames('class-1', 5);

    // THEN newest game first
    expect(error).toBeNull();
    expect(data.map((g) => g.gameCode)).toEqual(['G2', 'G1']);

    const g2 = data[0];
    expect(g2.gameMode).toBe('classic');
    expect(g2.playedAt).toBe('2026-09-04T10:00:00Z');
    expect(g2.lessonIds).toEqual(['lesson-1']);
    expect(g2.players).toEqual([
      { studentId: 'stu-1', name: 'Alice', score: 120, lessonWordsFound: ['cat', 'dog'], lessonWordsMissed: ['fox'], accuracyPct: 67 },
      { studentId: 'stu-2', name: 'bobby', score: 40, lessonWordsFound: ['cat'], lessonWordsMissed: ['dog', 'fox'], accuracyPct: 33 },
    ]);
    // fox missed by everyone, dog by one, cat by nobody — sorted by pct desc
    expect(g2.missedWords).toEqual([
      { word: 'fox', missedBy: 2, total: 2, pct: 100 },
      { word: 'dog', missedBy: 1, total: 2, pct: 50 },
      { word: 'cat', missedBy: 0, total: 2, pct: 0 },
    ]);
    expect(g2.totalLessonWords).toBe(3);
    expect(g2.wordsNobodyFound).toEqual(['fox']);
    expect(g2.coveragePct).toBe(67);
    expect(g2.averageAccuracyPct).toBe(50);
    expect(g2.participation).toEqual({ played: 2, roster: 12 });

    // players sorted by score desc within a game
    expect(g2.players[0].score).toBeGreaterThan(g2.players[1].score);
  });

  it('never surfaces placeholder or missing names — falls back to a numbered label', async () => {
    mockTables({
      practice_sessions: {
        data: [
          sessionRow('11111111-2222-3333-4444-555555555555', 'G1', '2026-09-04T10:00:00Z', ['cat'], []),
          sessionRow('stu-2', 'G1', '2026-09-04T10:00:00Z', ['cat'], []),
        ],
      },
      classroom_memberships: { count: 2 },
      public_profiles: {
        data: [{ id: '11111111-2222-3333-4444-555555555555', display_name: 'Player_11111111', username: 'Player_11111111' }],
      },
    });

    const { data } = await getRecentClassroomGames('class-1', 5, { fallbackName: 'Student' });

    const names = data[0].players.map((p) => p.name);
    expect(names).toEqual(['Student 1', 'Student 2']);
    for (const n of names) {
      expect(n).not.toMatch(/player_|[0-9a-f]{8}-/i);
    }
  });

  it('treats Hebrew final-letter variants of the same lesson word as one word', async () => {
    mockTables({
      practice_sessions: {
        data: [
          sessionRow('stu-1', 'G1', '2026-09-04T10:00:00Z', ['שלום'], []),
          sessionRow('stu-2', 'G1', '2026-09-04T10:00:00Z', [], ['שלומ']),
        ],
      },
      classroom_memberships: { count: 2 },
      public_profiles: { data: [{ id: 'stu-1', display_name: 'Noa' }, { id: 'stu-2', display_name: 'Dan' }] },
    });

    const { data } = await getRecentClassroomGames('class-1', 5);

    expect(data[0].totalLessonWords).toBe(1);
    expect(data[0].missedWords).toEqual([{ word: 'שלום', missedBy: 1, total: 2, pct: 50 }]);
    expect(data[0].coveragePct).toBe(100);
  });

  it('honours the game limit after grouping', async () => {
    mockTables({
      practice_sessions: {
        data: [
          sessionRow('stu-1', 'G3', '2026-09-04T10:00:00Z', ['cat'], []),
          sessionRow('stu-1', 'G2', '2026-09-03T10:00:00Z', ['cat'], []),
          sessionRow('stu-1', 'G1', '2026-09-02T10:00:00Z', ['cat'], []),
        ],
      },
      classroom_memberships: { count: 1 },
      public_profiles: { data: [{ id: 'stu-1', display_name: 'Alice' }] },
    });

    const { data } = await getRecentClassroomGames('class-1', 2);

    expect(data.map((g) => g.gameCode)).toEqual(['G3', 'G2']);
  });

  it('propagates a query error instead of pretending the class never played', async () => {
    mockTables({ practice_sessions: { data: null, error: { message: 'permission denied' } } });

    const { data, error } = await getRecentClassroomGames('class-1', 5);

    expect(data).toEqual([]);
    expect(error).toEqual({ message: 'permission denied' });
  });

  it('still returns games when the roster/profile lookups fail', async () => {
    mockTables({
      practice_sessions: { data: [sessionRow('stu-1', 'G1', '2026-09-04T10:00:00Z', ['cat'], [])] },
      classroom_memberships: { count: null, error: { message: 'nope' } },
      public_profiles: { data: null, error: { message: 'nope' } },
    });

    const { data, error } = await getRecentClassroomGames('class-1', 5, { fallbackName: 'Student' });

    expect(error).toBeNull();
    expect(data[0].players[0].name).toBe('Student 1');
    expect(data[0].participation).toEqual({ played: 1, roster: 1 });
  });
});
