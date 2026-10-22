import { describe, it, expect } from 'vitest';
import { loadParentReportData } from '../parentReportData';
import { fakeSupabase, ok, fail, type TableResponder } from './fakeSupabase';

const STUDENT = 'student-1';
const CLASSROOM = 'classroom-1';
const NOW = new Date('2026-10-21T12:00:00Z');

function db(overrides: Partial<Record<string, TableResponder>> = {}) {
  return fakeSupabase({
    classroom_memberships: ok({ id: 'membership-1' }),
    public_profiles: (filters) =>
      filters.some(([m, col, val]) => m === 'eq' && col === 'id' && val === 'teacher-1')
        ? ok({ display_name: 'Ms. Levi', username: null })
        : ok({ display_name: 'Ana', username: null }),
    classrooms: ok({ name: '5B English', teacher_id: 'teacher-1' }),
    student_lesson_progress: ok([]),
    practice_sessions: ok([]),
    ...overrides,
  });
}

describe('loadParentReportData', () => {
  it('Given the student is not (or no longer) a member of the classroom, Then it returns not_member', async () => {
    const { client } = db({ classroom_memberships: ok(null) });
    expect((await loadParentReportData(client, STUDENT, CLASSROOM, NOW)).status).toBe('not_member');
  });

  it.each(['classroom_memberships', 'student_lesson_progress', 'practice_sessions', 'classrooms'])(
    'Given the %s read errors, Then it returns error (never renders as "no progress")',
    async (table) => {
      const { client } = db({ [table]: fail('boom') });
      expect((await loadParentReportData(client, STUDENT, CLASSROOM, NOW)).status).toBe('error');
    },
  );

  it('Given a member with no progress, Then old fields are zeroed and the header carries class + teacher', async () => {
    const { client } = db();
    const result = await loadParentReportData(client, STUDENT, CLASSROOM, NOW);
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data).toMatchObject({
      displayName: 'Ana',
      totalXp: 0,
      lessonsCompleted: 0,
      wordsMastered: 0,
      recentActivity: [],
      classroomName: '5B English',
      teacherName: 'Ms. Levi',
      generatedAt: NOW.toISOString(),
    });
    expect(result.data.insights?.insight).toBe('quiet');
  });

  it('keeps the headline numbers equal to the insight totals and lists the 5 newest sessions', async () => {
    const sessions = [0, 1, 2, 3, 4, 5].map((d) => ({
      completed_at: new Date(NOW.getTime() - d * 86400000).toISOString(),
      words_attempted: 10,
      words_correct: 5,
      time_spent_seconds: 0,
      duration_seconds: 120,
    }));
    const { client } = db({
      student_lesson_progress: ok([
        { total_xp: 40, words_mastered: ['cat', 'dog'], words_attempted: {}, completed_at: '2026-10-01', current_streak: 1, longest_streak: 2 },
        { total_xp: 60, words_mastered: ['dog', 'fox'], words_attempted: {}, completed_at: '2026-10-02', current_streak: 0, longest_streak: 0 },
      ]),
      practice_sessions: ok(sessions),
    });
    const result = await loadParentReportData(client, STUDENT, CLASSROOM, NOW);
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.totalXp).toBe(100);
    expect(result.data.lessonsCompleted).toBe(2);
    expect(result.data.wordsMastered).toBe(3);
    expect(result.data.recentActivity).toHaveLength(5);
    expect(result.data.recentActivity[0].completedAt).toBe(sessions[0].completed_at);
    expect(result.data.insights?.thisWeek.sessions).toBe(6);
  });

  it('lists each practice day once, even when a day had several sessions', async () => {
    const at = (d: number, h: number) => new Date(Date.UTC(2026, 9, 21 - d, h)).toISOString();
    const sessions = [at(0, 11), at(0, 9), at(1, 18), at(1, 8), at(2, 10), at(4, 10), at(5, 10), at(6, 10)].map((completed_at) => ({
      completed_at,
      words_attempted: 1,
      words_correct: 1,
      time_spent_seconds: 60,
      duration_seconds: null,
    }));
    const { client } = db({ practice_sessions: ok(sessions) });
    const result = await loadParentReportData(client, STUDENT, CLASSROOM, NOW);
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.recentActivity.map((e) => e.completedAt)).toEqual([at(0, 11), at(1, 18), at(2, 10), at(4, 10), at(5, 10)]);
  });

  it('scopes sessions to this classroom and only completed ones', async () => {
    const { client, calls } = db();
    await loadParentReportData(client, STUDENT, CLASSROOM, NOW);
    const sessions = calls.find((c) => c.table === 'practice_sessions')!;
    expect(sessions.filters).toContainEqual(['eq', 'student_id', STUDENT]);
    expect(sessions.filters).toContainEqual(['eq', 'classroom_id', CLASSROOM]);
    expect(sessions.filters).toContainEqual(['not', 'completed_at', 'is', null]);
  });

  it('falls back to a generic name when the profile has no display_name or username', async () => {
    const { client } = db({ public_profiles: ok({ display_name: null, username: null }) });
    const result = await loadParentReportData(client, STUDENT, CLASSROOM, NOW);
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.displayName).toBe('Student');
  });

  it('never leaks email — only display_name/username are selected from profiles', async () => {
    const { client, calls } = db();
    await loadParentReportData(client, STUDENT, CLASSROOM, NOW);
    for (const c of calls.filter((x) => x.table === 'public_profiles')) {
      const select = c.filters.find(([m]) => m === 'select')!;
      expect(String(select[1])).not.toMatch(/email/);
    }
  });

  it('a failed teacher-name read hides the teacher line instead of failing the report', async () => {
    const { client } = db({
      public_profiles: (filters) =>
        filters.some(([m, , val]) => m === 'eq' && val === 'teacher-1') ? fail('nope') : ok({ display_name: 'Ana', username: null }),
    });
    const result = await loadParentReportData(client, STUDENT, CLASSROOM, NOW);
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.teacherName).toBeUndefined();
  });
});
