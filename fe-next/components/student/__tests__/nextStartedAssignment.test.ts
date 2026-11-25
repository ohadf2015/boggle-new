import { describe, it, expect } from 'vitest';
import { nextStartedAssignment } from '../nextOpenAssignment';
import type { StudentLesson } from '@/hooks/useStudentProgress';

function lesson(
  over: Partial<StudentLesson> & { lessonId: string },
): StudentLesson {
  return {
    status: 'assigned',
    ...over,
  };
}

const started = (lessonId: string, assignmentId: string, due: string | null, classroomId = 'c1') =>
  lesson({
    lessonId,
    status: 'started',
    assignment: {
      id: assignmentId,
      lesson_id: lessonId,
      classroom_id: classroomId,
      due_date: due,
      created_at: '2026-10-01T00:00:00Z',
    },
    lesson: { id: lessonId, name: `Lesson ${lessonId}` } as never,
  });

describe('nextStartedAssignment', () => {
  it('returns null when nothing is started', () => {
    expect(nextStartedAssignment([], 'en')).toBeNull();
    expect(
      nextStartedAssignment(
        [
          lesson({
            lessonId: 'l1',
            status: 'assigned',
            assignment: { id: 'a1', lesson_id: 'l1', classroom_id: 'c1', due_date: null, created_at: '2026-10-01' },
            lesson: { id: 'l1', name: 'Not started' } as never,
          }),
          lesson({
            lessonId: 'l2',
            status: 'completed',
            assignment: { id: 'a2', lesson_id: 'l2', classroom_id: 'c1', due_date: null, created_at: '2026-10-01' },
            lesson: { id: 'l2', name: 'Done' } as never,
          }),
        ],
        'en',
      ),
    ).toBeNull();
  });

  it('returns the started assignment with a deep-link href', () => {
    const next = nextStartedAssignment([started('week-3', 'asg-9', '2026-10-10T00:00:00Z')], 'en');
    expect(next).toEqual({
      assignmentId: 'asg-9',
      lessonId: 'week-3',
      title: 'Lesson week-3',
      dueDate: '2026-10-10T00:00:00Z',
      href: '/en/student/lessons/week-3',
    });
  });

  it('ignores started solo practice that has no assignment', () => {
    expect(
      nextStartedAssignment(
        [lesson({ lessonId: 'solo', status: 'started', lesson: { id: 'solo', name: 'Solo' } as never })],
        'en',
      ),
    ).toBeNull();
  });

  it('picks the soonest due when several are started, and respects the classroom filter', () => {
    const lessons = [
      started('later', 'a-later', '2026-10-20T00:00:00Z'),
      started('sooner', 'a-soon', '2026-10-08T00:00:00Z'),
      started('other-class', 'a-other', '2026-10-02T00:00:00Z', 'c2'),
    ];
    expect(nextStartedAssignment(lessons, 'en')?.assignmentId).toBe('a-other');
    expect(nextStartedAssignment(lessons, 'en', 'c1')?.assignmentId).toBe('a-soon');
  });
});
