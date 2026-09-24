/**
 * Pro "Missed-words homework": one tap assigns every student THEIR OWN missed
 * words from the last live game.
 *
 * Storage (no migration): a `lesson_assignments` row for the game's lesson.
 * The live game already wrote each student's per-word attempts to
 * `student_lesson_progress` for that lesson, and /student/review ranks a
 * student's own misses first — so one classroom row delivers per-student
 * words. The assignment also makes express-created lessons (classroom_id null)
 * visible to students at all.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildMissedWordsHomeworkPlan,
  assignMissedWordsHomework,
  type HomeworkGameInput,
} from '../missedWordsHomework';

const L1 = '11111111-1111-4111-8111-111111111111';
const L2 = '22222222-2222-4222-8222-222222222222';

const game = (over: Partial<HomeworkGameInput> = {}): HomeworkGameInput => ({
  lessonIds: [L1],
  players: [
    { studentId: 's1', name: 'Dana', lessonWordsMissed: ['apple', 'pear'] },
    { studentId: 's2', name: 'Omer', lessonWordsMissed: [] },
    { studentId: 's3', name: 'Noa', lessonWordsMissed: ['pear', 'plum', 'fig', 'Pear'] },
  ],
  ...over,
});

const NOW = new Date('2026-09-24T10:00:00Z');

describe('buildMissedWordsHomeworkPlan', () => {
  it('Given a game with misses, When planned, Then each student with misses gets their own words', () => {
    const plan = buildMissedWordsHomeworkPlan(game(), [], NOW)!;
    expect(plan.students).toEqual([
      { studentId: 's3', name: 'Noa', words: ['pear', 'plum', 'fig'] },
      { studentId: 's1', name: 'Dana', words: ['apple', 'pear'] },
    ]);
    expect(plan.studentCount).toBe(2);
    expect(plan.wordCount).toBe(4);
    expect(plan.lessonIds).toEqual([L1]);
    expect(plan.dueDate).toBe('2026-09-27');
  });

  it('Given the reteach game with a synthetic lesson id, When planned, Then that id is never assigned', () => {
    expect(buildMissedWordsHomeworkPlan(game({ lessonIds: ['class-gap-reteach'] }), [], NOW)).toBeNull();
    const plan = buildMissedWordsHomeworkPlan(game({ lessonIds: ['class-gap-reteach', L2] }), [], NOW)!;
    expect(plan.lessonIds).toEqual([L2]);
  });

  it('Given a lesson already assigned to this class, When planned, Then it is not assigned twice', () => {
    const plan = buildMissedWordsHomeworkPlan(game({ lessonIds: [L1, L2] }), [L1], NOW)!;
    expect(plan.lessonIds).toEqual([L2]);
    expect(plan.alreadyAssigned).toBe(false);

    const all = buildMissedWordsHomeworkPlan(game(), [L1], NOW)!;
    expect(all.lessonIds).toEqual([]);
    expect(all.alreadyAssigned).toBe(true);
  });

  it('Given nobody missed anything, When planned, Then there is nothing to assign', () => {
    const clean = game({ players: [{ studentId: 's2', name: 'Omer', lessonWordsMissed: [] }] });
    expect(buildMissedWordsHomeworkPlan(clean, [], NOW)).toBeNull();
  });

  it('Given no game, When planned, Then null', () => {
    expect(buildMissedWordsHomeworkPlan(null, [], NOW)).toBeNull();
  });
});

describe('assignMissedWordsHomework', () => {
  const plan = buildMissedWordsHomeworkPlan(game({ lessonIds: [L1, L2] }), [], NOW)!;

  it('Given a plan, When assigned, Then it writes one plain classroom assignment per lesson with the due date', async () => {
    const createAssignment = vi.fn().mockResolvedValue({ data: { id: 'a' }, error: null });
    const res = await assignMissedWordsHomework(plan, { classroomId: 'c1', teacherId: 't1', createAssignment });
    expect(res).toEqual({ created: 2, failed: 0 });
    expect(createAssignment).toHaveBeenCalledWith({
      classroom_id: 'c1',
      lesson_id: L1,
      teacher_id: 't1',
      due_date: '2026-09-27',
      practice_focus: null,
    });
  });

  it('Given one write fails, When assigned, Then the failure is counted, never swallowed', async () => {
    const createAssignment = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 'a' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'rls' } });
    const res = await assignMissedWordsHomework(plan, { classroomId: 'c1', teacherId: 't1', createAssignment });
    expect(res).toEqual({ created: 1, failed: 1 });
  });

  it('Given a write throws, When assigned, Then it is a failure, not a crash', async () => {
    const createAssignment = vi.fn().mockRejectedValue(new Error('net'));
    const res = await assignMissedWordsHomework(plan, { classroomId: 'c1', teacherId: 't1', createAssignment });
    expect(res).toEqual({ created: 0, failed: 2 });
  });
});
