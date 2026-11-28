import { describe, expect, it } from 'vitest';
import { assignmentsToStudentLessons, studentLessonsToPracticeLessons, withOwnProgress } from '../teacherStudentView';
import type { StudentLessonProgress, TeacherAssignment } from '@/lib/supabase/education/types';

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

const row = (over: Partial<StudentLessonProgress> = {}) =>
  ({ lesson_id: 'l1', words_mastered: ['orbit'], completed_at: null, total_practice_sessions: 1, total_xp: 20, ...over }) as StudentLessonProgress;

describe('withOwnProgress', () => {
  const lessons = assignmentsToStudentLessons(
    [assignment(), assignment({ id: 'a2', lesson_id: 'l2', created_at: '2026-11-19T00:00:00Z', vocabulary_lessons: { id: 'l2', name: 'Sea', language: 'en', words: [] } as never })],
    'c1',
  );

  it('Given the teacher finished a round of a class lesson, Then that lesson counts as done with their mastered words, like a student whose homework was stamped', () => {
    const [played, untouched] = withOwnProgress(lessons, [row()]);
    expect(played).toMatchObject({ lessonId: 'l1', status: 'completed', progress: { words_mastered: ['orbit'], total_xp: 20 } });
    expect(untouched).toMatchObject({ lessonId: 'l2', status: 'assigned', progress: { words_mastered: [] } });
  });

  it('Given a progress row with no finished round yet, Then the lesson is started, not done', () => {
    expect(withOwnProgress(lessons, [row({ total_practice_sessions: 0 })])[0].status).toBe('started');
  });

  it('Given a row stamped complete, Then it is done even with no session count', () => {
    expect(withOwnProgress(lessons, [row({ total_practice_sessions: 0, completed_at: '2026-11-28T00:00:00Z' })])[0].status).toBe('completed');
  });

  it('Given the teacher played lessons outside this class, Then the class list and its order stay as they are', () => {
    const out = withOwnProgress(lessons, [row({ lesson_id: 'elsewhere' })]);
    expect(out.map((l) => [l.lessonId, l.status])).toEqual([['l1', 'assigned'], ['l2', 'assigned']]);
  });
});

describe('studentLessonsToPracticeLessons', () => {
  it('Given the class lessons, Then the practice screens get the same lessons in their shape, assignment focus kept', () => {
    const [p] = studentLessonsToPracticeLessons(assignmentsToStudentLessons([assignment({ practice_focus: 'spelling' } as never)], 'c1'));
    expect(p).toMatchObject({ id: 'l1', name: 'Space words', language: 'en', words: [{ word: 'orbit' }], classroom_id: 'c1', assignment: { lesson_id: 'l1', practice_focus: 'spelling' } });
  });
});
