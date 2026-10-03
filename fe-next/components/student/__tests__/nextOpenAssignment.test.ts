import { describe, it, expect } from 'vitest';
import { nextOpenAssignment } from '../nextOpenAssignment';
import type { StudentLesson } from '@/hooks/useStudentProgress';

function lesson(
  over: Partial<StudentLesson> & { lessonId: string },
): StudentLesson {
  return {
    status: 'assigned',
    ...over,
  };
}

describe('nextOpenAssignment', () => {
  it('returns null when there are zero open assignments', () => {
    expect(nextOpenAssignment([], 'en')).toBeNull();
    expect(
      nextOpenAssignment(
        [
          lesson({
            lessonId: 'l1',
            status: 'completed',
            assignment: { id: 'a1', lesson_id: 'l1', classroom_id: 'c1', due_date: null, created_at: '2026-10-01' },
            lesson: { id: 'l1', name: 'Done' } as never,
          }),
          lesson({
            lessonId: 'l2',
            status: 'assigned',
            lesson: { id: 'l2', name: 'Practice only' } as never,
          }),
        ],
        'en',
      ),
    ).toBeNull();
  });

  it('returns the open assignment with a deep-link href', () => {
    const next = nextOpenAssignment(
      [
        lesson({
          lessonId: 'week-3',
          status: 'assigned',
          assignment: {
            id: 'asg-9',
            lesson_id: 'week-3',
            classroom_id: 'c1',
            due_date: '2026-10-10T00:00:00Z',
            created_at: '2026-10-03T00:00:00Z',
          },
          lesson: { id: 'week-3', name: 'Week 3 Vocabulary' } as never,
        }),
      ],
      'en',
    );
    expect(next).toEqual({
      assignmentId: 'asg-9',
      lessonId: 'week-3',
      title: 'Week 3 Vocabulary',
      dueDate: '2026-10-10T00:00:00Z',
      href: '/en/student/lessons/week-3',
    });
  });

  it('picks the soonest due open assignment when several are open', () => {
    const next = nextOpenAssignment(
      [
        lesson({
          lessonId: 'later',
          assignment: {
            id: 'a-later',
            lesson_id: 'later',
            classroom_id: 'c1',
            due_date: '2026-10-20T00:00:00Z',
            created_at: '2026-10-01T00:00:00Z',
          },
          lesson: { id: 'later', name: 'Later' } as never,
        }),
        lesson({
          lessonId: 'sooner',
          assignment: {
            id: 'a-soon',
            lesson_id: 'sooner',
            classroom_id: 'c1',
            due_date: '2026-10-08T00:00:00Z',
            created_at: '2026-10-02T00:00:00Z',
          },
          lesson: { id: 'sooner', name: 'Sooner' } as never,
        }),
      ],
      'he',
    );
    expect(next?.assignmentId).toBe('a-soon');
    expect(next?.href).toBe('/he/student/lessons/sooner');
  });
});
