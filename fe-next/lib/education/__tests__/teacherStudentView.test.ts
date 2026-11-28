import { describe, expect, it } from 'vitest';
import { assignmentsToStudentLessons } from '../teacherStudentView';
import type { TeacherAssignment } from '@/lib/supabase/education/types';

const assignment = (over: Partial<TeacherAssignment> = {}): TeacherAssignment => ({
  id: 'a1',
  classroom_id: 'c1',
  lesson_id: 'l1',
  teacher_id: 't1',
  assignment_type: 'practice' as TeacherAssignment['assignment_type'],
  due_date: '2026-12-01T00:00:00Z',
  title: null,
  instructions: null,
  created_at: '2026-11-20T00:00:00Z',
  updated_at: '2026-11-20T00:00:00Z',
  vocabulary_lessons: { id: 'l1', name: 'Space words', language: 'en', words: [{ word: 'orbit' }] } as never,
  ...over,
});

describe('assignmentsToStudentLessons', () => {
  it('Given the class assignments, When the teacher opens the student view, Then each becomes a fresh assigned lesson a new student would see, due date and words kept', () => {
    const [lesson] = assignmentsToStudentLessons([assignment()], 'c1');
    expect(lesson).toMatchObject({
      lessonId: 'l1',
      status: 'assigned',
      classroomId: 'c1',
      dueDate: '2026-12-01T00:00:00Z',
      assignedAt: '2026-11-20T00:00:00Z',
      lesson: { name: 'Space words' },
      progress: { words_mastered: [] },
    });
    expect(lesson.assignment?.id).toBe('a1');
  });

  it('Given an assignment whose lesson was deleted, Then it is left out rather than shown as an empty island', () => {
    expect(assignmentsToStudentLessons([assignment({ vocabulary_lessons: undefined })], 'c1')).toEqual([]);
  });

  it('Given the same lesson assigned twice, Then the student sees it once, with the newest assignment', () => {
    const lessons = assignmentsToStudentLessons(
      [assignment({ id: 'new', created_at: '2026-11-25T00:00:00Z' }), assignment({ id: 'old', created_at: '2026-11-01T00:00:00Z' })],
      'c1',
    );
    expect(lessons.map((l) => l.assignment?.id)).toEqual(['new']);
  });
});
