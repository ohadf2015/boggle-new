import { describe, it, expect } from 'vitest';
import { EDU_EVENTS } from '../eduEvents';

describe('EDU_EVENTS catalog', () => {
  it('Given the catalog, When names are listed, Then every name is edu_-prefixed and unique', () => {
    const names = Object.values(EDU_EVENTS);
    expect(names.every((n) => n.startsWith('edu_'))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('Given the admin contract, Then the live-round and retention events have stable names', () => {
    expect(EDU_EVENTS.classroomCreated).toBe('edu_classroom_created');
    expect(EDU_EVENTS.studentJoined).toBe('edu_student_joined');
    expect(EDU_EVENTS.liveRoundStarted).toBe('edu_live_round_started');
    expect(EDU_EVENTS.liveRoundCompleted).toBe('edu_live_round_completed');
    expect(EDU_EVENTS.studentReturned).toBe('edu_student_returned');
    expect(EDU_EVENTS.teacherFirstLiveGame).toBe('edu_teacher_first_live_game');
    expect(EDU_EVENTS.teacherOnboardingStep).toBe('edu_teacher_onboarding_step');
  });
});
