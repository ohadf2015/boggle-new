import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/education/assignmentEvents.server', () => ({
  captureAssignmentStartedServer: vi.fn(),
  captureAssignmentCompletedServer: vi.fn(),
}));

import {
  findAssignmentForLesson,
  findSatisfiedAssignment,
  stampAssignmentCompletion,
  stampAssignmentStarted,
  stampAssignmentStartForLesson,
} from '../assignmentCompletion';
import { captureAssignmentStartedServer } from '@/lib/education/assignmentEvents.server';

beforeEach(() => vi.clearAllMocks());

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

function fakeStartClient({
  assignments = [] as Array<{ id: string; classroom_id?: string | null }>,
  progressRow = null as { assignment_id: string | null; completed_at: string | null } | null,
  insertError = null as unknown,
  updateError = null as unknown,
} = {}) {
  const limit = vi.fn().mockResolvedValue({ data: assignments, error: null });
  const order = vi.fn(() => ({ limit }));
  const selectAssignment = vi.fn(() => ({ eq: vi.fn(() => ({ order })) }));

  const maybeSingle = vi.fn().mockResolvedValue({ data: progressRow, error: null });
  const selectProgress = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) }));
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ eq: updateEq })) }));

  const from = vi.fn((table: string) => {
    if (table === 'lesson_assignments') return { select: selectAssignment };
    if (table === 'student_lesson_progress') return { select: selectProgress, insert, update };
    throw new Error(`unexpected table ${table}`);
  });
  return { client: { from } as never, insert, update, maybeSingle };
}

describe('findAssignmentForLesson', () => {
  it('returns the newest assignment for the lesson with its classroom', async () => {
    const { client } = fakeStartClient({ assignments: [{ id: 'A1', classroom_id: 'C1' }] });
    expect(await findAssignmentForLesson(client, 'L')).toEqual({ id: 'A1', classroomId: 'C1' });
  });

  it('Given the lesson is not assigned to any of my classrooms, Then null', async () => {
    const { client } = fakeStartClient();
    expect(await findAssignmentForLesson(client, 'L')).toBeNull();
  });
});

describe('stampAssignmentStarted', () => {
  it('inserts a started progress row and emits assignment_started', async () => {
    const { client, insert } = fakeStartClient();
    const ok = await stampAssignmentStarted(client, {
      studentId: 'S',
      lessonId: 'L',
      assignmentId: 'A1',
      classroomId: 'C1',
      now: NOW,
    });
    expect(ok).toBe(true);
    expect(insert).toHaveBeenCalledWith({
      student_id: 'S',
      lesson_id: 'L',
      assignment_id: 'A1',
      started_at: NOW,
    });
    expect(captureAssignmentStartedServer).toHaveBeenCalledWith({
      classroom_id: 'C1',
      assignment_id: 'A1',
      student_id: 'S',
    });
  });

  it('Given a progress row already exists (started or completed), Then it stays silent', async () => {
    const { client, insert, update } = fakeStartClient({
      progressRow: { assignment_id: 'A1', completed_at: null },
    });
    expect(await stampAssignmentStarted(client, { studentId: 'S', lessonId: 'L', assignmentId: 'A1' })).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(captureAssignmentStartedServer).not.toHaveBeenCalled();
  });

  it('adopts a legacy progress row that has no assignment link yet', async () => {
    const { client, update } = fakeStartClient({
      progressRow: { assignment_id: null, completed_at: null },
    });
    expect(
      await stampAssignmentStarted(client, { studentId: 'S', lessonId: 'L', assignmentId: 'A1', classroomId: 'C1' }),
    ).toBe(true);
    expect(update).toHaveBeenCalledWith({ assignment_id: 'A1' });
    expect(captureAssignmentStartedServer).toHaveBeenCalledTimes(1);
  });

  it('Given the insert fails, Then it reports false and emits nothing', async () => {
    const { client } = fakeStartClient({ insertError: { message: 'duplicate key' } });
    expect(await stampAssignmentStarted(client, { studentId: 'S', lessonId: 'L', assignmentId: 'A1' })).toBe(false);
    expect(captureAssignmentStartedServer).not.toHaveBeenCalled();
  });
});

describe('stampAssignmentStartForLesson', () => {
  it('finds the lesson assignment and stamps the start', async () => {
    const { client, insert } = fakeStartClient({ assignments: [{ id: 'A9', classroom_id: 'C9' }] });
    expect(await stampAssignmentStartForLesson(client, { studentId: 'S', lessonId: 'L', now: NOW })).toBe(true);
    expect(insert).toHaveBeenCalledWith({
      student_id: 'S',
      lesson_id: 'L',
      assignment_id: 'A9',
      started_at: NOW,
    });
  });

  it('Given the lesson has no assignment, Then false and no write', async () => {
    const { client, insert } = fakeStartClient();
    expect(await stampAssignmentStartForLesson(client, { studentId: 'S', lessonId: 'L' })).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
});
