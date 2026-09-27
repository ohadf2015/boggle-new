import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * Picking a classroom in the Create Lesson dialog must actually assign the
 * lesson to it.
 *
 * A live smoke run created a lesson "for" a classroom and the student saw
 * "NO LESSONS ASSIGNED YET" until the teacher went back and used a separate
 * "Assign to Classroom" button. Cause: the dropdown only set
 * `vocabulary_lessons.classroom_id`, while students read their lessons from
 * `lesson_assignments`. Two paths to "this classroom has this lesson", one of
 * which silently reached nothing — pitfall class 3.
 */
import { createLessonAndAssign } from '../createLessonWithAssignment';
import { createAssignment } from '@/lib/supabase/education/assignments';

vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockCreateAssignment = createAssignment as unknown as ReturnType<typeof vi.fn>;

const LESSON = { id: 'lesson-1', name: 'Week 3 Vocabulary' };

const lessonInput = (classroomId?: string) => ({
  name: 'Week 3 Vocabulary',
  description: '',
  language: 'en' as const,
  words: [{ word: 'hesitant', canIntegrate: true }],
  classroomId,
  isPublic: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateAssignment.mockResolvedValue({ data: { id: 'a1' }, error: null });
});

describe('createLessonAndAssign', () => {
  it('creates the assignment when a classroom was chosen', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: LESSON });

    const result = await createLessonAndAssign({
      lesson: lessonInput('class-1'),
      teacherId: 'teacher-1',
      createLesson,
    });

    expect(result.success).toBe(true);
    expect(result.assigned).toBe(true);
    expect(result.assignmentError).toBeUndefined();
    expect(mockCreateAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        classroom_id: 'class-1',
        lesson_id: 'lesson-1',
        teacher_id: 'teacher-1',
      })
    );
  });

  it('does not assign when no classroom was chosen', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: LESSON });

    const result = await createLessonAndAssign({
      lesson: lessonInput(undefined),
      teacherId: 'teacher-1',
      createLesson,
    });

    expect(result.success).toBe(true);
    expect(result.assigned).toBe(false);
    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });

  it('still passes the classroom to createLesson, so the column stays in sync', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: LESSON });
    await createLessonAndAssign({
      lesson: lessonInput('class-1'),
      teacherId: 'teacher-1',
      createLesson,
    });
    expect(createLesson).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'class-1' }));
  });

  it('never attempts an assignment when the lesson itself failed to save', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: false, error: 'boom' });

    const result = await createLessonAndAssign({
      lesson: lessonInput('class-1'),
      teacherId: 'teacher-1',
      createLesson,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
    expect(result.assigned).toBe(false);
    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });

  it('reports a saved-but-unassigned lesson instead of plain success', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: LESSON });
    mockCreateAssignment.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });

    const result = await createLessonAndAssign({
      lesson: lessonInput('class-1'),
      teacherId: 'teacher-1',
      createLesson,
    });

    // The lesson does exist, so this is not a failed create...
    expect(result.success).toBe(true);
    expect(result.lesson).toEqual(LESSON);
    // ...but the teacher must not be told it reached the classroom.
    expect(result.assigned).toBe(false);
    expect(result.assignmentError).toBe('RLS denied');
  });

  it('treats a thrown assignment error the same way, never as success', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: LESSON });
    mockCreateAssignment.mockRejectedValue(new Error('network down'));

    const result = await createLessonAndAssign({
      lesson: lessonInput('class-1'),
      teacherId: 'teacher-1',
      createLesson,
    });

    expect(result.success).toBe(true);
    expect(result.assigned).toBe(false);
    expect(result.assignmentError).toBe('network down');
  });

  it('still assigns when the user object has not resolved yet', async () => {
    // `lesson_assignments` has no teacher_id column — migration 056 defines
    // lesson_id, classroom_id, due_date and later practice_focus, and
    // `createAssignment` writes only those. Refusing on a momentarily-null user
    // would fail an insert the database would have accepted.
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: LESSON });

    const result = await createLessonAndAssign({
      lesson: lessonInput('class-1'),
      teacherId: '',
      createLesson,
    });

    expect(result.success).toBe(true);
    expect(result.assigned).toBe(true);
    expect(result.assignmentError).toBeUndefined();
    expect(mockCreateAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ classroom_id: 'class-1', lesson_id: 'lesson-1' })
    );
  });

  it('sends no due date, which the nullable column accepts', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: LESSON });
    await createLessonAndAssign({
      lesson: lessonInput('class-1'),
      teacherId: 'teacher-1',
      createLesson,
    });
    expect(mockCreateAssignment.mock.calls[0][0].due_date).toBeUndefined();
  });

  it('reports unassigned when the lesson saved but came back without an id', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: null });

    const result = await createLessonAndAssign({
      lesson: lessonInput('class-1'),
      teacherId: 'teacher-1',
      createLesson,
    });

    expect(result.assigned).toBe(false);
    expect(result.assignmentError).toBeTruthy();
    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });
});
