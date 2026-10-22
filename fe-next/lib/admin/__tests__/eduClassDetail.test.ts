import { describe, it, expect } from 'vitest';
import { buildClassDetail, type ClassDetailInput } from '../eduClassDetail';

const NOW = Date.parse('2026-10-08T00:00:00Z');
const DAY = 86_400_000;
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();

const input = (over: Partial<ClassDetailInput> = {}): ClassDetailInput => ({
  nowMs: NOW,
  classroom: { id: 'c1', name: 'Period 3', join_code: 'ABC123', language: 'en', created_at: ago(40), teacher_id: 't1' },
  profiles: [
    { id: 't1', display_name: 'Ada', username: 'ada', last_seen_at: ago(1), is_test_account: false },
    { id: 's1', display_name: 'Sam', username: null, last_seen_at: ago(5), is_test_account: false },
    { id: 's2', display_name: null, username: 'kim', last_seen_at: ago(1), is_test_account: false },
    { id: 'qa', display_name: 'QA kid', username: null, last_seen_at: ago(1), is_test_account: true },
  ],
  memberships: [
    { student_id: 's1', joined_at: ago(30) },
    { student_id: 's2', joined_at: ago(20) },
    { student_id: 's3', joined_at: ago(10) },
    { student_id: 'qa', joined_at: ago(2) },
  ],
  assignments: [{ id: 'a1', lesson_id: 'l1', due_date: ago(-3), created_at: ago(4) }],
  lessons: [{ id: 'l1', name: 'Animals' }],
  progress: [
    { assignment_id: 'a1', student_id: 's1', completed_at: ago(2) },
    { assignment_id: 'a1', student_id: 's2', completed_at: null },
    { assignment_id: 'a1', student_id: 'qa', completed_at: ago(1) },
  ],
  rounds: [
    { game_mode: 'classic', player_count: 2, completed_at: ago(3) },
    { game_mode: 'blast', player_count: 3, completed_at: ago(1) },
    { game_mode: 'classic', player_count: 2, completed_at: ago(50) },
  ],
  games: [],
  ...over,
});

describe('buildClassDetail', () => {
  it('lists real students with a readable name, most recently seen first, and leaves test students out', () => {
    const out = buildClassDetail(input());
    expect(out.students.map((s) => [s.id, s.name])).toEqual([
      ['s2', 'kim'],
      ['s1', 'Sam'],
      ['s3', null],
    ]);
    expect(out.studentCount).toBe(3);
    expect(out.excludedTestStudents).toBe(1);
  });

  it('shows each assignment with its lesson name and how many real students finished it', () => {
    const out = buildClassDetail(input());
    expect(out.assignments).toEqual([
      { id: 'a1', lessonName: 'Animals', dueDate: ago(-3), createdAt: ago(4), completed: 1, assigned: 3 },
    ]);
  });

  it('summarises live rounds over the last 30 days and the last time the class played', () => {
    const out = buildClassDetail(input());
    expect(out.rounds).toEqual({
      available: true,
      last30Days: 2,
      lastPlayedAt: ago(1),
      modes: [
        { mode: 'blast', rounds: 1 },
        { mode: 'classic', rounds: 1 },
      ],
    });
  });

  it('says rounds are unmeasured instead of zero when the table is missing', () => {
    expect(buildClassDetail(input({ rounds: null })).rounds).toEqual({ available: false, last30Days: null, lastPlayedAt: null, modes: [] });
  });

  it('names the teacher and flags a test-account teacher', () => {
    expect(buildClassDetail(input()).teacher).toEqual({ id: 't1', name: 'Ada', lastSeenAt: ago(1), isTestAccount: false });
  });
});
