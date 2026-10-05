/**
 * Teacher activation checklist — four steps from an approved teacher
 * to a class that has actually been taught live.
 *
 * Order: create classroom → first assignment → copy student invite
 * → start live class. Copy is done when they copied (server flag) OR a
 * student joined. Live is done when a game ran OR they started one.
 */
import { describe, it, expect } from 'vitest';
import { teacherOnboardingChecklist } from '../teacherOnboardingChecklist';

describe('teacherOnboardingChecklist', () => {
  it('starts on create_classroom when there is no class', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 0,
      assignmentCount: 0,
      rosterCount: 0,
      hasLiveClass: false,
    });
    expect(result.current).toBe('create_classroom');
    expect(result.complete).toBe(false);
    expect(result.doneCount).toBe(0);
    expect(result.steps.map((s) => s.id)).toEqual([
      'create_classroom',
      'create_first_assignment',
      'share_join_link',
      'start_live_class',
    ]);
  });

  it('asks for the first assignment even with an empty roster — that is the stall', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 0,
      rosterCount: 0,
      hasLiveClass: false,
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
      hasLiveClass: false,
    });
    expect(result.steps[1].status).toBe('unknown');
    expect(result.current).toBeNull();
  });

  it('asks to copy the invite once a classroom and an assignment exist', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 1,
      rosterCount: 0,
      hasLiveClass: false,
    });
    expect(result.current).toBe('share_join_link');
  });

  it('treats a persisted copy as the join-link step done even with an empty roster', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 1,
      rosterCount: 0,
      hasLiveClass: false,
      inviteCopied: true,
    });
    expect(result.steps.find((s) => s.id === 'share_join_link')?.status).toBe('done');
    expect(result.current).toBe('start_live_class');
  });

  it('treats students on the roster as the join-link step done', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 1,
      rosterCount: 3,
      hasLiveClass: false,
    });
    expect(result.current).toBe('start_live_class');
    expect(result.steps.find((s) => s.id === 'share_join_link')?.status).toBe('done');
  });

  it('does not pretend a class has never played when the live-game read failed', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 1,
      rosterCount: 3,
      hasLiveClass: null,
    });
    expect(result.steps[3].status).toBe('unknown');
    expect(result.current).toBeNull();
    expect(result.complete).toBe(false);
  });

  it('treats a persisted live start as the live step done', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 1,
      assignmentCount: 1,
      rosterCount: 1,
      hasLiveClass: false,
      liveStarted: true,
    });
    expect(result.steps.find((s) => s.id === 'start_live_class')?.status).toBe('done');
    expect(result.complete).toBe(true);
  });

  it('is complete only when every step is honestly done', () => {
    const result = teacherOnboardingChecklist({
      classroomCount: 2,
      assignmentCount: 1,
      rosterCount: 4,
      hasLiveClass: true,
    });
    expect(result.current).toBeNull();
    expect(result.complete).toBe(true);
    expect(result.doneCount).toBe(4);
  });
});
