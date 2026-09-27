import { describe, it, expect } from 'vitest';
import {
  TEACHER_USAGE_PROMPT_MIN_STUDENTS,
  TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS,
  TEACHER_USAGE_PROMPT_DISMISS_KEY,
  classroomUsagePromptReason,
  teacherUsagePrompt,
  isTeacherUsagePromptDismissed,
  persistTeacherUsagePromptDismissed,
} from '../teacherUsagePrompt';

/**
 * The usage-triggered Pro ask: fire when a classroom hits a limit Teacher Pro
 * actually lifts — 10+ students on the roster, or 3+ assignments created.
 * Never invent a hit from empty or unknown data.
 */
describe('classroomUsagePromptReason', () => {
  it('does not fire below both thresholds', () => {
    expect(
      classroomUsagePromptReason({
        studentCount: TEACHER_USAGE_PROMPT_MIN_STUDENTS - 1,
        assignmentCreatedCount: TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS - 1,
      }),
    ).toBeNull();
  });

  it('does not fire on an empty classroom with no count data', () => {
    expect(classroomUsagePromptReason({ studentCount: 0 })).toBeNull();
  });

  it('fires at the student threshold', () => {
    expect(
      classroomUsagePromptReason({
        studentCount: TEACHER_USAGE_PROMPT_MIN_STUDENTS,
        assignmentCreatedCount: 0,
      }),
    ).toBe('students');
  });

  it('fires at the created-assignments threshold', () => {
    expect(
      classroomUsagePromptReason({
        studentCount: 2,
        assignmentCreatedCount: TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS,
      }),
    ).toBe('assignments');
  });

  it('prefers students on a tie — the roster count is always loaded', () => {
    expect(
      classroomUsagePromptReason({
        studentCount: TEACHER_USAGE_PROMPT_MIN_STUDENTS,
        assignmentCreatedCount: TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS,
      }),
    ).toBe('students');
  });
});

describe('teacherUsagePrompt', () => {
  it('returns null with no classrooms', () => {
    expect(teacherUsagePrompt([])).toBeNull();
  });

  it('ignores a small roster even when assignments are unknown (fail closed)', () => {
    expect(teacherUsagePrompt([{ studentCount: 2 }])).toBeNull();
  });

  it('reports the largest roster and its size', () => {
    const hit = teacherUsagePrompt([
      { studentCount: 4, assignmentCreatedCount: 0 },
      { studentCount: 14, assignmentCreatedCount: 0 },
    ]);
    expect(hit).toEqual({ reason: 'students', count: 14 });
  });

  it('reports the created-assignment count when no roster hits', () => {
    const hit = teacherUsagePrompt([
      { studentCount: 2, assignmentCreatedCount: 1 },
      { studentCount: 5, assignmentCreatedCount: 3 },
    ]);
    expect(hit).toEqual({ reason: 'assignments', count: 3 });
  });

  it('never sums two quiet classes into one hit', () => {
    expect(
      teacherUsagePrompt([
        { studentCount: 2, assignmentCreatedCount: 2 },
        { studentCount: 2, assignmentCreatedCount: 2 },
      ]),
    ).toBeNull();
  });
});

describe('usage prompt dismiss', () => {
  it('reads back a persisted dismiss', () => {
    const storage = new Map<string, string>();
    const stub = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
    };
    expect(isTeacherUsagePromptDismissed(stub)).toBe(false);
    persistTeacherUsagePromptDismissed(stub);
    expect(storage.get(TEACHER_USAGE_PROMPT_DISMISS_KEY)).toBe('1');
    expect(isTeacherUsagePromptDismissed(stub)).toBe(true);
  });

  it('fails open when storage is unavailable', () => {
    expect(isTeacherUsagePromptDismissed(null)).toBe(false);
    expect(isTeacherUsagePromptDismissed(undefined)).toBe(false);
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
    };
    expect(isTeacherUsagePromptDismissed(throwing)).toBe(false);
    expect(() =>
      persistTeacherUsagePromptDismissed({
        setItem: () => {
          throw new Error('denied');
        },
      }),
    ).not.toThrow();
  });
});
