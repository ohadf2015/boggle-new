/**
 * Teacher onboarding checklist — the four steps from an approved teacher
 * to a class that has actually been taught.
 *
 * Activation gap: teachers create a classroom and stall before the first
 * assignment, so they never reach the Teacher Pro upgrade prompt. This
 * derivation is the single place that decides which step is current.
 *
 * `assignmentCount` / `hasProgressReport` of `null` mean unknown. Publishing
 * "zero" from a failed read is the silent-failure shape this repo keeps
 * paying for.
 */
import { describe, it, expect } from 'vitest';
import { teacherOnboardingChecklist } from '../teacherOnboardingChecklist';

describe('teacherOnboardingChecklist', () => {
  it('starts on create_classroom when there is no class', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 0,
      assignmentCount: 0,
      rosterCount: 0,
      hasProgressReport: false,
    });
    expect(result.current).toBe('create_classroom');
    expect(result.complete).toBe(false);
    expect(result.doneCount).toBe(0);
    expect(result.steps.map((s) => s.id)).toEqual([
      'create_classroom',
      'create_first_assignment',
      'share_join_link',
      'view_first_progress_report',
    ]);
  });

  it('asks for the first assignment even with an empty roster — that is the stall', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 0,
      rosterCount: 0,
      hasProgressReport: false,
    });
    expect(result.current).toBe('create_first_assignment');
    expect(result.steps[0].status).toBe('done');
    expect(result.steps[1].status).toBe('todo');
  });

  it('does not pretend there are zero assignments when the count is unknown', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: null,
      rosterCount: 0,
      hasProgressReport: false,
    });
    expect(result.steps[1].status).toBe('unknown');
    expect(result.current).toBeNull();
  });

  it('asks to share the join link once a classroom and an assignment exist', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 1,
      rosterCount: 0,
      hasProgressReport: false,
    });
    expect(result.current).toBe('share_join_link');
  });

  it('treats students on the roster as the join-link step done', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 1,
      rosterCount: 3,
      hasProgressReport: false,
    });
    expect(result.current).toBe('view_first_progress_report');
    expect(result.steps.find((s) => s.id === 'share_join_link')?.status).toBe('done');
  });

  it('does not pretend a class has never played when the report read failed', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 1,
      rosterCount: 3,
      hasProgressReport: null,
    });
    expect(result.steps[3].status).toBe('unknown');
    expect(result.current).toBeNull();
    expect(result.complete).toBe(false);
  });

  it('is complete only when every step is honestly done', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 2,
      assignmentCount: 1,
      rosterCount: 4,
      hasProgressReport: true,
    });
    expect(result.current).toBeNull();
    expect(result.complete).toBe(true);
    expect(result.doneCount).toBe(4);
  });
});
