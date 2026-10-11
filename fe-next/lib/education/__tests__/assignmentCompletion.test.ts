import { describe, it, expect, vi } from 'vitest';
import { findSatisfiedAssignment, stampAssignmentCompletion } from '../assignmentCompletion';

function fakeClient(assignments: Array<{ id: string; practice_focus: string | null; word_count_target?: number | null; classroom_id?: string | null }>, upsertError: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  const order = vi.fn().mockResolvedValue({ data: assignments, error: null });
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table === 'lesson_assignments') return { select };
    if (table === 'student_lesson_progress') return { upsert };
    throw new Error(`unexpected table ${table}`);
  });
  return { client: { from } as never, upsert, eq };
}

const NOW = '2026-09-18T10:00:00.000Z';

describe('findSatisfiedAssignment', () => {
  it('Given a Word Craft assignment, When a Word Craft session finishes, Then that assignment is found', async () => {
    const { client, eq } = fakeClient([{ id: 'A1', practice_focus: 'wordcraft' }]);
    expect(await findSatisfiedAssignment(client, { lessonId: 'L', sessionMode: 'wordcraft' })).toEqual({
      id: 'A1',
      classroomId: null,
    });
    expect(eq).toHaveBeenCalledWith('lesson_id', 'L');
  });

  it('Given a Word Craft assignment, When a flashcard session finishes, Then it does not count', async () => {
    const { client } = fakeClient([{ id: 'A1', practice_focus: 'wordcraft' }]);
    expect(await findSatisfiedAssignment(client, { lessonId: 'L', sessionMode: null })).toBeNull();
  });

  it('Given a legacy NULL assignment, When a Word Craft session finishes, Then it still counts (NULL = student picks)', async () => {
    const { client } = fakeClient([{ id: 'A3', practice_focus: null }]);
    expect(await findSatisfiedAssignment(client, { lessonId: 'L', sessionMode: 'wordcraft' })).toEqual({
      id: 'A3',
      classroomId: null,
    });
  });

  it('Given a student-picks assignment, When any session finishes, Then it counts', async () => {
    const { client } = fakeClient([{ id: 'A2', practice_focus: 'any' }]);
    expect(await findSatisfiedAssignment(client, { lessonId: 'L', sessionMode: null })).toEqual({
      id: 'A2',
      classroomId: null,
    });
  });

  it('Given a word-count goal, When the student has found enough unique words, Then that assignment is found', async () => {
    const { client } = fakeClient([{ id: 'A4', practice_focus: null, word_count_target: 3, classroom_id: 'C9' }]);
    expect(await findSatisfiedAssignment(client, {
      lessonId: 'L',
      sessionMode: 'solo_board',
      extraWords: ['cat', 'dog', 'fish'],
    })).toEqual({ id: 'A4', classroomId: 'C9' });
  });

  it('Given a word-list goal, When vocabulary_words_found covers the list, Then that assignment is found', async () => {
    const { client } = fakeClient([{ id: 'A5', practice_focus: null, classroom_id: 'C2' }]);
    expect(await findSatisfiedAssignment(client, {
      lessonId: 'L',
      sessionMode: 'solo_board',
      goalWords: ['cat', 'dog', 'fish'],
      vocabularyWordsFound: ['CAT', 'dog', 'FISH'],
    })).toEqual({ id: 'A5', classroomId: 'C2' });
  });

  it('Given a word-list goal, When the student has not practiced every list word, Then it does not count', async () => {
    const { client } = fakeClient([{ id: 'A5', practice_focus: null }]);
    expect(await findSatisfiedAssignment(client, {
      lessonId: 'L',
      sessionMode: 'solo_board',
      goalWords: ['cat', 'dog', 'fish'],
      vocabularyWordsFound: ['cat'],
    })).toBeNull();
  });

  it('Given a word-count goal, When the student is still short, Then it does not count', async () => {
    const { client } = fakeClient([{ id: 'A4', practice_focus: null, word_count_target: 5 }]);
    expect(await findSatisfiedAssignment(client, {
      lessonId: 'L',
      sessionMode: 'solo_board',
      extraWords: ['cat'],
    })).toBeNull();
  });

  it('Given the lesson is not assigned to any of my classrooms, Then null', async () => {
    const { client } = fakeClient([]);
    expect(await findSatisfiedAssignment(client, { lessonId: 'L', sessionMode: 'wordcraft' })).toBeNull();
  });
});

describe('stampAssignmentCompletion', () => {
  it('upserts assignment_id + completed_at on the (student, lesson) progress row', async () => {
    const { client, upsert } = fakeClient([]);
    expect(await stampAssignmentCompletion(client, { studentId: 'S', lessonId: 'L', assignmentId: 'A1', now: NOW })).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      { student_id: 'S', lesson_id: 'L', assignment_id: 'A1', completed_at: NOW },
      { onConflict: 'student_id,lesson_id' },
    );
  });

  it('Given the upsert fails, Then it reports false instead of claiming success', async () => {
    const { client } = fakeClient([], { message: 'rls' });
    expect(await stampAssignmentCompletion(client, { studentId: 'S', lessonId: 'L', assignmentId: 'A1', now: NOW })).toBe(false);
  });
});
