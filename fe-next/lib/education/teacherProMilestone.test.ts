import { describe, it, expect } from 'vitest';
import {
  TEACHER_PRO_MILESTONE_MIN_STUDENTS,
  TEACHER_PRO_MILESTONE_MIN_COMPLETED,
  classroomHitsTeacherProMilestone,
  teacherHitsProUpgradeMilestone,
  isTeacherProAskDismissed,
  persistTeacherProAskDismissed,
  TEACHER_PRO_ASK_DISMISS_KEY,
} from './teacherProMilestone';

/**
 * The upgrade moment for Teacher Pro: a classroom that has actually engaged,
 * not a first-visit strip. Trigger when ANY classroom has >=3 students or
 * >=5 completed games or assignments. Never invent a hit from empty data.
 */
describe('classroomHitsTeacherProMilestone', () => {
  it('does not fire below both thresholds', () => {
    expect(
      classroomHitsTeacherProMilestone({
        studentCount: TEACHER_PRO_MILESTONE_MIN_STUDENTS - 1,
        gameCount: TEACHER_PRO_MILESTONE_MIN_COMPLETED - 1,
        assignmentCompletedCount: TEACHER_PRO_MILESTONE_MIN_COMPLETED - 1,
      }),
    ).toBe(false);
  });

  it('fires at 3 students even with no games', () => {
    expect(
      classroomHitsTeacherProMilestone({
        studentCount: TEACHER_PRO_MILESTONE_MIN_STUDENTS,
        gameCount: 0,
        assignmentCompletedCount: 0,
      }),
    ).toBe(true);
  });

  it('fires at 5 completed games even with a tiny roster', () => {
    expect(
      classroomHitsTeacherProMilestone({
        studentCount: 1,
        gameCount: TEACHER_PRO_MILESTONE_MIN_COMPLETED,
        assignmentCompletedCount: 0,
      }),
    ).toBe(true);
  });

  it('fires at 5 completed assignments even with a tiny roster', () => {
    expect(
      classroomHitsTeacherProMilestone({
        studentCount: 0,
        gameCount: 0,
        assignmentCompletedCount: TEACHER_PRO_MILESTONE_MIN_COMPLETED,
      }),
    ).toBe(true);
  });

  it('treats missing counts as zero, never as a hit', () => {
    expect(classroomHitsTeacherProMilestone({ studentCount: 0 })).toBe(false);
    expect(classroomHitsTeacherProMilestone({ studentCount: 2 })).toBe(false);
  });
});

describe('teacherHitsProUpgradeMilestone', () => {
  it('is true when any one classroom hits, not the totals across classes', () => {
    expect(
      teacherHitsProUpgradeMilestone([
        { studentCount: 2, gameCount: 4, assignmentCompletedCount: 4 },
        { studentCount: 3, gameCount: 0, assignmentCompletedCount: 0 },
      ]),
    ).toBe(true);
  });

  it('is false when every classroom is under threshold even if the school totals look big', () => {
    expect(
      teacherHitsProUpgradeMilestone([
        { studentCount: 2, gameCount: 4, assignmentCompletedCount: 4 },
        { studentCount: 2, gameCount: 4, assignmentCompletedCount: 4 },
      ]),
    ).toBe(false);
  });

  it('is false for an empty dashboard', () => {
    expect(teacherHitsProUpgradeMilestone([])).toBe(false);
  });
});

describe('Teacher Pro ask dismiss persistence', () => {
  it('reads as not dismissed when storage is missing or empty', () => {
    expect(isTeacherProAskDismissed(null)).toBe(false);
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
    expect(isTeacherProAskDismissed(storage)).toBe(false);
  });

  it('persists a dismiss so a reload stays quiet', () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
    persistTeacherProAskDismissed(storage);
    expect(mem.get(TEACHER_PRO_ASK_DISMISS_KEY)).toBe('1');
    expect(isTeacherProAskDismissed(storage)).toBe(true);
  });
});
