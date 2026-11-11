import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { getStudentsProgressSummary } from '../analyticsClassroom';
import { supabase } from '@/lib/supabase';
import { fakeSupabase, ok } from '@/lib/education/__tests__/fakeSupabase';
import { rosterRows } from '@/components/teacher/home/rosterModel';
import { buildStudentPulses } from '@/lib/education/pro/classInsights';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const NOW = Date.parse('2026-11-11T12:00:00Z');
const TODAY = '2026-11-11';

const rows = [
  {
    student_id: 'mia',
    lesson_id: 'l1',
    total_xp: 0,
    current_level: 1,
    current_streak: 0,
    words_mastered: [],
    words_attempted: { cup: { correct: 0, attempts: 2, lastAttemptAt: '2026-11-10T09:30:00Z' } },
    last_practice_date: null,
  },
  {
    student_id: 'dana',
    lesson_id: 'l1',
    total_xp: 30,
    current_level: 1,
    current_streak: 1,
    words_mastered: ['cup'],
    words_attempted: { cup: { correct: 2, attempts: 2 } },
    last_practice_date: '2026-11-10',
  },
];

describe('roster and class analytics share one "played" rule', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const db = fakeSupabase({
      classroom_memberships: ok(['mia', 'dana', 'tal'].map((student_id) => ({ student_id }))),
      public_profiles: ok(['mia', 'dana', 'tal'].map((id) => ({ id, display_name: id, avatar_config: null, avatar_emoji: null }))),
      student_lesson_progress: ok(rows),
      vocabulary_lessons: ok([{ id: 'l1', words: [{ word: 'cup' }] }]),
    });
    (supabase!.from as Mock).mockImplementation((t: string) => db.from(t));
  });
  afterEach(() => vi.useRealTimers());

  it('Given a student who played this week and scored 0, Then the roster says played, as analytics does', async () => {
    const { data, error } = await getStudentsProgressSummary('c1');
    expect(error).toBeNull();
    expect(data.find((s) => s.studentId === 'mia')?.lastPracticeDate).toBe('2026-11-10');

    const status = Object.fromEntries(rosterRows(data, NOW).map((r) => [r.id, r.status]));
    expect(status).toEqual({ mia: 'done', dana: 'done', tal: 'idle' });

    const pulses = Object.fromEntries(buildStudentPulses(rows, ['mia', 'dana', 'tal'], TODAY).map((p) => [p.id, p.status]));
    expect(pulses.mia).not.toBe('notStarted');
    expect(pulses.tal).toBe('notStarted');
  });
});
