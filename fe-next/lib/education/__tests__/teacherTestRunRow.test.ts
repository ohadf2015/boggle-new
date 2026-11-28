import { describe, expect, it } from 'vitest';
import { buildTeacherTestRunRow } from '../teacherTestRunRow';

const assignments = [
  { id: 'a1', lessonId: 'L1' },
  { id: 'a2', lessonId: 'L2' },
  { id: 'a3', lessonId: 'L3' },
];
const prog = (lesson_id: string, extra: Record<string, unknown> = {}) => ({
  lesson_id,
  completed_at: null,
  total_practice_sessions: 0,
  last_practice_date: null,
  words_attempted: {},
  ...extra,
});

describe('buildTeacherTestRunRow', () => {
  it('returns null when the teacher never played one of the class lessons', () => {
    expect(buildTeacherTestRunRow({ teacherId: 't', name: 'You', assignments, progress: [prog('OTHER', { total_practice_sessions: 2 })] })).toBeNull();
  });

  it('counts played lessons as done, averages their scores, and takes the latest practice day', () => {
    const row = buildTeacherTestRunRow({
      teacherId: 't',
      name: 'You',
      assignments,
      progress: [
        prog('L1', { completed_at: '2026-11-27T10:00:00Z', last_practice_date: '2026-11-27', words_attempted: { cat: { attempts: 2, correct: 2 } } }),
        prog('L2', { total_practice_sessions: 1, last_practice_date: '2026-11-28', words_attempted: { dog: { attempts: 2, correct: 1 } } }),
      ],
    });
    expect(row).toEqual({
      studentId: 't',
      name: 'You',
      completedAssignments: 2,
      totalAssignments: 3,
      averageScore: 75,
      lastActiveAt: '2026-11-28',
      joinFunnelStatus: 'signed_in',
    });
  });

  it('shows no score when the played lessons have no graded attempts', () => {
    const row = buildTeacherTestRunRow({ teacherId: 't', name: 'You', assignments, progress: [prog('L3', { total_practice_sessions: 1 })] });
    expect(row?.averageScore).toBeNull();
  });
});
