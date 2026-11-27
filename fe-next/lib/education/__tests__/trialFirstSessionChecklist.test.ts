import { describe, expect, it } from 'vitest';

import {
  TEACHER_ACTIVATION_STEP_COMPLETED,
  TRIAL_FIRST_SESSION_STEP_INDEX,
  TRIAL_FIRST_SESSION_STEP_ORDER,
  deriveTrialFirstSession,
  teacherActivationAnalyticsWhere,
  trialFirstSessionHrefs,
} from '../trialFirstSessionChecklist';

const TRIAL = {
  status: 'trialing',
  known: true,
  loading: false,
} as const;

describe('trial first-session checklist state', () => {
  it('pins the PostHog event and the four steps in order', () => {
    expect(TEACHER_ACTIVATION_STEP_COMPLETED).toBe('teacher_activation_step_completed');
    expect(TRIAL_FIRST_SESSION_STEP_ORDER).toEqual([
      'create_classroom',
      'add_students',
      'create_assignment',
      'first_live_game',
    ]);
    expect(TRIAL_FIRST_SESSION_STEP_INDEX).toEqual({
      create_classroom: 1,
      add_students: 2,
      create_assignment: 3,
      first_live_game: 4,
    });
  });

  it('Given a new trial with no class, When derived, Then the welcome points at create classroom and the dashboard checklist stays hidden', () => {
    const state = deriveTrialFirstSession({ ...TRIAL, classroomCount: 0 });

    expect(state.current).toBe('create_classroom');
    expect(state.welcomePointsAt).toBe('create_classroom');
    expect(state.visible).toBe(false);
    expect(state.steps.map((step) => step.status)).toEqual(['current', 'todo', 'todo', 'todo']);
  });

  it('Given a trial teacher who already has students but no assignment, When derived, Then the checklist shows create assignment', () => {
    const state = deriveTrialFirstSession({
      ...TRIAL,
      classrooms: [{ id: 'c1', member_count: 42 }],
      assignmentCount: 0,
    });

    expect(state.visible).toBe(true);
    expect(state.current).toBe('create_assignment');
    expect(state.doneCount).toBe(2);
    expect(state.steps.find((step) => step.id === 'add_students')?.done).toBe(true);
    expect(state.welcomePointsAt).toBe('create_assignment');
  });

  it('Given an invite was copied but no student has joined, When derived, Then add students is still current', () => {
    const state = deriveTrialFirstSession({
      ...TRIAL,
      classroomCount: 1,
      inviteCopied: true,
      hasStudents: false,
      assignmentCount: 0,
    });

    expect(state.current).toBe('add_students');
    expect(state.steps.find((step) => step.id === 'add_students')?.done).toBe(false);
  });

  it('Given the assignment count is still loading or failed, When derived, Then create assignment is not marked done', () => {
    const loading = deriveTrialFirstSession({
      ...TRIAL,
      classroomCount: 1,
      hasStudents: true,
      assignmentsLoading: true,
      assignmentCount: 3,
    });
    const failed = deriveTrialFirstSession({
      ...TRIAL,
      classroomCount: 1,
      hasStudents: true,
      assignmentsError: true,
      assignmentCount: null,
    });

    expect(loading.steps.find((step) => step.id === 'create_assignment')?.done).toBe(false);
    expect(failed.steps.find((step) => step.id === 'create_assignment')?.done).toBe(false);
    expect(loading.current).toBe('create_assignment');
  });

  it('Given a class and an assignment but no live game, When derived, Then the current step is run or schedule the live game', () => {
    const state = deriveTrialFirstSession({
      ...TRIAL,
      classroomCount: 1,
      hasStudents: true,
      assignmentCount: 1,
    });

    expect(state.current).toBe('first_live_game');
    expect(state.allStepsDone).toBe(false);
    expect(state.visible).toBe(true);
  });

  it('Given a live round, played games, or a scheduled live game, When derived, Then the live step is done and the checklist hides', () => {
    for (const extra of [{ liveStarted: true }, { gamesPlayed: 1 }, { scheduledLive: true }]) {
      const state = deriveTrialFirstSession({
        ...TRIAL,
        classroomCount: 1,
        hasStudents: true,
        assignmentCount: 1,
        ...extra,
      });
      expect(state.allStepsDone).toBe(true);
      expect(state.visible).toBe(false);
      expect(state.welcomePointsAt).toBeNull();
    }
  });

  it('Given a classroom list and a zero count default, When derived, Then the list is evidence of a class', () => {
    const state = deriveTrialFirstSession({
      ...TRIAL,
      classroomCount: 0,
      classrooms: [{ member_count: 2 }],
      assignmentCount: 0,
    });

    expect(state.steps.find((step) => step.id === 'create_classroom')?.done).toBe(true);
    expect(state.current).toBe('create_assignment');
  });

  it('Given a non-trial, unknown, loading, or dismissed teacher, When derived, Then nothing is shown', () => {
    expect(deriveTrialFirstSession({ ...TRIAL, status: 'active', classroomCount: 1 }).visible).toBe(false);
    expect(deriveTrialFirstSession({ ...TRIAL, known: false, classroomCount: 1 }).visible).toBe(false);
    expect(deriveTrialFirstSession({ ...TRIAL, loading: true, classroomCount: 1 }).visible).toBe(false);
    expect(deriveTrialFirstSession({ ...TRIAL, classroomCount: 1, dismissed: true }).visible).toBe(false);
    expect(deriveTrialFirstSession({ ...TRIAL, classroomCount: 1, dismissed: true }).welcomePointsAt).toBeNull();
  });

  it('deep-links each step into the existing class, invite, assignment, and live-game flows', () => {
    const hrefs = trialFirstSessionHrefs('en', 'c1');

    expect(hrefs.create_classroom).toBe('/en/teacher/classroom/new');
    expect(hrefs.add_students).toBe('/en/teacher/classroom/new?classroomId=c1');
    expect(hrefs.create_assignment).toBe('/en/teacher?classroomId=c1&assign=1');
    expect(hrefs.first_live_game).toBe('/en/education/classroom-game?classroomId=c1&minutes=2');
    expect(hrefs.schedule_live_game).toBe('/en/teacher/classroom/new?classroomId=c1');
  });

  it('falls back to creating a class when there is no classroom to invite, assign, or host', () => {
    const hrefs = trialFirstSessionHrefs('he', null);

    expect(hrefs.create_classroom).toBe('/he/teacher/classroom/new');
    expect(hrefs.add_students).toBe('/he/teacher/classroom/new');
    expect(hrefs.create_assignment).toBe('/he/teacher/classroom/new');
    expect(hrefs.first_live_game).toBe('/he/education/classroom-game?minutes=2');
    expect(hrefs.schedule_live_game).toBe('/he/teacher/classroom/new');
  });

  it('excludes cookieless ids and the two test users from analytics reads', () => {
    const where = teacherActivationAnalyticsWhere();

    expect(where).toContain("cookieless_");
    expect(where).toContain('14f10c13');
    expect(where).toContain('1f0715b5');
    expect(where).toMatch(/NOT startsWith\(distinct_id, 'cookieless_'\)/);
    expect(where).toMatch(/NOT startsWith\(person_id, '14f10c13'\)/);
    expect(where).toMatch(/NOT startsWith\(person_id, '1f0715b5'\)/);
  });
});
