/**
 * Student report streak / session / practice-time metrics come from tables
 * that exist.
 *
 * Regression (Sentry JAVASCRIPT-NEXTJS-1VR): the report read these from
 * `student_xp_tracking`, a table that was never created (PGRST205). Every
 * student report showed 0 minutes, 0 streak and 0 sessions no matter how much
 * the student practised. Streaks live on `student_lesson_progress` (already
 * loaded for word mastery); time and completed sessions live on
 * `practice_sessions`.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getStudentReportData } from '../analyticsReports';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

type Result = { data: unknown; error: unknown };

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'order']) b[m] = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return b;
}

const TABLES: Record<string, Result> = {
  public_profiles: { data: { id: 's1', display_name: 'Maya', avatar_config: null }, error: null },
  classrooms: { data: { id: 'c1', name: 'Class A' }, error: null },
  student_lesson_progress: {
    data: [
      { lesson_id: 'l1', words_attempted: {}, words_mastered: [], current_streak: 3, longest_streak: 5, last_practice_date: null },
      { lesson_id: 'l2', words_attempted: {}, words_mastered: [], current_streak: 1, longest_streak: 7, last_practice_date: null },
    ],
    error: null,
  },
  practice_sessions: {
    data: [
      { time_spent_seconds: 300, duration_seconds: null, completed_at: '2026-09-10T10:00:00Z' },
      { time_spent_seconds: null, duration_seconds: 150, completed_at: '2026-09-11T10:00:00Z' },
      { time_spent_seconds: 90, duration_seconds: null, completed_at: null },
    ],
    error: null,
  },
};

describe('getStudentReportData — streak / time / session metrics', () => {
  beforeEach(() => {
    (supabase!.from as Mock).mockImplementation((table: string) => {
      if (!TABLES[table]) throw new Error(`unexpected table ${table}`);
      return builder(TABLES[table]);
    });
  });

  it('never queries the non-existent student_xp_tracking table', async () => {
    await getStudentReportData('s1', 'c1');
    expect((supabase!.from as Mock).mock.calls.map((c) => c[0])).not.toContain('student_xp_tracking');
  });

  it('derives streaks from lesson progress and time/sessions from practice_sessions', async () => {
    const { data, error } = await getStudentReportData('s1', 'c1');
    expect(error).toBeNull();
    expect(data!.metrics.currentStreak).toBe(3);
    expect(data!.metrics.longestStreak).toBe(7);
    expect(data!.metrics.practiceTimeMinutes).toBe(9); // (300 + 150 + 90) / 60
    expect(data!.metrics.sessionsCompleted).toBe(2);
  });
});
