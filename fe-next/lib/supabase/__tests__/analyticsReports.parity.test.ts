import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getStudentReportData } from '../analyticsReports';
import { supabase } from '@/lib/supabase';
import { loadStudentInsights } from '@/lib/education/studentInsightsLoader';
import { loadParentReportData } from '@/lib/education/parentReportData';
import { fakeSupabase, ok } from '@/lib/education/__tests__/fakeSupabase';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const STUDENT = 's1';
const CLASSROOM = 'c1';
const NOW = new Date('2026-10-21T12:00:00Z');

const progressRows = [
  {
    lesson_id: 'l1',
    total_xp: 50,
    words_mastered: ['tree'],
    words_attempted: { tree: { correct: 3, attempts: 3 }, sun: { correct: 1, attempts: 4 } },
    completed_at: '2026-10-01T00:00:00Z',
    current_streak: 2,
    longest_streak: 4,
    last_practice_date: null,
  },
  {
    lesson_id: 'l2',
    total_xp: 30,
    words_mastered: ['tree'],
    words_attempted: { tree: { correct: 2, attempts: 2 } },
    completed_at: null,
    current_streak: 0,
    longest_streak: 1,
    last_practice_date: null,
  },
];

const allSessions = [
  { classroom_id: CLASSROOM, completed_at: '2026-10-20T10:00:00Z', words_attempted: 10, words_correct: 7, time_spent_seconds: 600, duration_seconds: null },
  { classroom_id: CLASSROOM, completed_at: '2026-10-02T10:00:00Z', words_attempted: 10, words_correct: 5, time_spent_seconds: 0, duration_seconds: 300 },
  { classroom_id: CLASSROOM, completed_at: null, words_attempted: 3, words_correct: 0, time_spent_seconds: 1200, duration_seconds: null },
  { classroom_id: 'other', completed_at: '2026-10-19T10:00:00Z', words_attempted: 10, words_correct: 10, time_spent_seconds: 1800, duration_seconds: null },
];

function serviceDb() {
  return fakeSupabase({
    classroom_memberships: ok({ id: 'm1' }),
    public_profiles: ok({ display_name: 'Ana', username: null }),
    classrooms: ok({ name: 'Class A', teacher_id: 't1' }),
    student_lesson_progress: ok(progressRows),
    practice_sessions: (filters) => {
      const classroom = filters.find(([m, col]) => m === 'eq' && col === 'classroom_id')?.[2];
      const completedOnly = filters.some(([m, col]) => m === 'not' && col === 'completed_at');
      return ok(allSessions.filter((r) => (!classroom || r.classroom_id === classroom) && (!completedOnly || r.completed_at)));
    },
  });
}

function browserTable(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'order', 'limit']) b[m] = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return b;
}

describe('teacher student report and parent report show the same numbers', () => {
  beforeEach(() => {
    const browserRows: Record<string, { data: unknown; error: unknown }> = {
      public_profiles: { data: { id: STUDENT, display_name: 'Ana', avatar_config: null }, error: null },
      classrooms: { data: { id: CLASSROOM, name: 'Class A' }, error: null },
      student_lesson_progress: { data: progressRows, error: null },
      practice_sessions: { data: allSessions, error: null },
    };
    (supabase!.from as Mock).mockImplementation((table: string) => browserTable(browserRows[table]));
  });

  it('takes words mastered, accuracy, practice time, sessions and streaks from the shared insights', async () => {
    const routeInsights = await loadStudentInsights(serviceDb().client, STUDENT, CLASSROOM, NOW);
    if (!routeInsights.ok) throw new Error('expected ok');
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, insights: routeInsights.insights }), { status: 200 }));

    const parent = await loadParentReportData(serviceDb().client, STUDENT, CLASSROOM, NOW);
    if (parent.status !== 'ok' || !parent.data.insights) throw new Error('expected parent insights');
    const p = parent.data.insights;

    const { data, error } = await getStudentReportData(STUDENT, CLASSROOM, undefined, fetcher as unknown as typeof fetch);
    expect(error).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(`/api/education/classroom/${CLASSROOM}/members/${STUDENT}/insights`);
    expect(data!.metrics).toMatchObject({
      wordsLearned: p.wordsMastered,
      totalWords: p.wordsPracticed,
      accuracy: p.accuracy,
      practiceTimeMinutes: p.totalMinutes,
      sessionsCompleted: p.sessionsCompleted,
      currentStreak: p.currentStreak,
      longestStreak: p.longestStreak,
    });
    // The old per-row math would have said 2 mastered words and 50 minutes (incomplete + other-class sessions).
    expect(data!.metrics.wordsLearned).toBe(1);
    expect(data!.metrics.practiceTimeMinutes).toBe(15);
  });

  it('fails visibly when the shared insights cannot be loaded, instead of showing different numbers', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 500 }));
    const { data, error } = await getStudentReportData(STUDENT, CLASSROOM, undefined, fetcher as unknown as typeof fetch);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
