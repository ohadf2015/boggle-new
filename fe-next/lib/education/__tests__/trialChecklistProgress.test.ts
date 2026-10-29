import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

const growthMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => growthMock(...args),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  applyTrialChecklistPatch,
  deriveTrialChecklist,
  EMPTY_TRIAL_CHECKLIST_PROGRESS,
  profileUpdateFromPatch,
  progressFromProfileRow,
  TRIAL_CHECKLIST_ALL_COMPLETED,
  TRIAL_CHECKLIST_EVENTS,
  TRIAL_CHECKLIST_SHOWN,
  TRIAL_CHECKLIST_STEP_COMPLETED,
  TRIAL_CHECKLIST_STEP_INDEX,
  TRIAL_CHECKLIST_STEP_ORDER,
} from '../trialChecklistProgress';
import {
  captureTrialChecklistAllCompletedOnce,
  captureTrialChecklistShownOnce,
  captureTrialChecklistStepCompletedOnce,
} from '../trialChecklistTelemetry';

describe('trialChecklistEvents — exact event name constants and step order', () => {
  it('pins the exact three PostHog event name strings', () => {
    expect(TRIAL_CHECKLIST_SHOWN).toBe('trial_checklist_shown');
    expect(TRIAL_CHECKLIST_STEP_COMPLETED).toBe('trial_checklist_step_completed');
    expect(TRIAL_CHECKLIST_ALL_COMPLETED).toBe('trial_checklist_all_completed');
    expect(TRIAL_CHECKLIST_EVENTS).toEqual({
      shown: 'trial_checklist_shown',
      stepCompleted: 'trial_checklist_step_completed',
      allCompleted: 'trial_checklist_all_completed',
    });
  });

  it('pins fixed step order and step_index 1, 2, 3', () => {
    expect(TRIAL_CHECKLIST_STEP_ORDER).toEqual([
      'create_classroom',
      'invite_students',
      'first_assignment',
    ]);
    expect(TRIAL_CHECKLIST_STEP_INDEX).toEqual({
      create_classroom: 1,
      invite_students: 2,
      first_assignment: 3,
    });
  });
});

describe('trialChecklistProgress — persistence helpers', () => {
  it('reads empty when the profile row is missing', () => {
    expect(progressFromProfileRow(null)).toEqual(EMPTY_TRIAL_CHECKLIST_PROGRESS);
    expect(progressFromProfileRow(undefined)).toEqual(EMPTY_TRIAL_CHECKLIST_PROGRESS);
  });

  it('treats profile timestamps as boolean flags', () => {
    expect(
      progressFromProfileRow({
        teacher_trial_checklist_dismissed_at: '2026-10-27T12:00:00Z',
        teacher_trial_checklist_completed_at: null,
      }),
    ).toEqual({ dismissed: true, completed: false });

    expect(
      progressFromProfileRow({
        teacher_trial_checklist_dismissed_at: null,
        teacher_trial_checklist_completed_at: '2026-10-27T13:00:00Z',
      }),
    ).toEqual({ dismissed: false, completed: true });
  });

  it('only turns flags on and never off', () => {
    const next = applyTrialChecklistPatch(
      { dismissed: true, completed: true },
      { dismissed: false, completed: false },
    );
    expect(next).toEqual({ dismissed: true, completed: true });

    const turnedOn = applyTrialChecklistPatch(
      { dismissed: false, completed: false },
      { dismissed: true },
    );
    expect(turnedOn).toEqual({ dismissed: true, completed: false });
  });

  it('writes only the timestamps requested by the patch', () => {
    const now = '2026-10-27T19:00:00.000Z';
    expect(profileUpdateFromPatch({ dismissed: true }, now)).toEqual({
      teacher_trial_checklist_dismissed_at: now,
    });
    expect(profileUpdateFromPatch({ completed: true }, now)).toEqual({
      teacher_trial_checklist_completed_at: now,
    });
    expect(profileUpdateFromPatch({}, now)).toEqual({});
  });
});

describe('deriveTrialChecklist — step derivation and visibility', () => {
  const TRIAL_BASE = {
    status: 'trialing',
    known: true,
    loading: false,
    classroomCount: 0,
    inviteCopied: false,
    assignmentCount: 0,
    dismissed: false,
    completed: false,
  } as const;

  it('shows for a known Polar trialing teacher with 0 steps done and marks create_classroom current', () => {
    const state = deriveTrialChecklist(TRIAL_BASE);
    expect(state.visible).toBe(true);
    expect(state.doneCount).toBe(0);
    expect(state.current).toBe('create_classroom');
    expect(state.complete).toBe(false);
    expect(state.steps.map((s) => [s.id, s.index, s.status])).toEqual([
      ['create_classroom', 1, 'current'],
      ['invite_students', 2, 'todo'],
      ['first_assignment', 3, 'todo'],
    ]);
  });

  it('marks create_classroom done when classroomCount >= 1 and advances to invite_students', () => {
    const state = deriveTrialChecklist({
      ...TRIAL_BASE,
      classroomCount: 1,
    });
    expect(state.current).toBe('invite_students');
    expect(state.doneCount).toBe(1);
    expect(state.steps[0].status).toBe('done');
    expect(state.steps[1].status).toBe('current');
  });

  it('marks invite_students done when inviteCopied is true OR any classroom has member_count > 0', () => {
    const byCopy = deriveTrialChecklist({
      ...TRIAL_BASE,
      classroomCount: 1,
      inviteCopied: true,
    });
    expect(byCopy.steps[1].status).toBe('done');
    expect(byCopy.current).toBe('first_assignment');

    const byMemberCount = deriveTrialChecklist({
      ...TRIAL_BASE,
      classrooms: [{ member_count: 0 }, { member_count: 2 }],
      inviteCopied: false,
    });
    expect(byMemberCount.steps[0].status).toBe('done');
    expect(byMemberCount.steps[1].status).toBe('done');
    expect(byMemberCount.current).toBe('first_assignment');
  });

  it('does NOT mark first_assignment done when the assignment count read failed or is still loading', () => {
    const readFailed = deriveTrialChecklist({
      ...TRIAL_BASE,
      classroomCount: 1,
      inviteCopied: true,
      assignmentCount: null,
    });
    expect(readFailed.steps[2].status).toBe('current');
    expect(readFailed.allStepsDone).toBe(false);
    expect(readFailed.complete).toBe(false);
    expect(readFailed.visible).toBe(true);

    const stillLoading = deriveTrialChecklist({
      ...TRIAL_BASE,
      classroomCount: 1,
      inviteCopied: true,
      assignmentCount: 1,
      assignmentsLoading: true,
    });
    expect(stillLoading.steps[2].status).toBe('current');
    expect(stillLoading.complete).toBe(false);
    expect(stillLoading.visible).toBe(true);
  });

  it('marks complete and hides when all 3 steps are done', () => {
    const state = deriveTrialChecklist({
      ...TRIAL_BASE,
      classroomCount: 1,
      inviteCopied: true,
      assignmentCount: 1,
    });
    expect(state.doneCount).toBe(3);
    expect(state.allStepsDone).toBe(true);
    expect(state.complete).toBe(true);
    expect(state.visible).toBe(false);
  });

  it('hides for active paid Pro, free teachers, access-trial-only, loading, or unknown status', () => {
    expect(deriveTrialChecklist({ ...TRIAL_BASE, status: 'active' }).visible).toBe(false);
    expect(deriveTrialChecklist({ ...TRIAL_BASE, status: null }).visible).toBe(false);
    expect(
      deriveTrialChecklist({
        ...TRIAL_BASE,
        status: 'active',
        accessTrialExpires: '2026-11-10T00:00:00Z',
      }).visible,
    ).toBe(false);
    expect(deriveTrialChecklist({ ...TRIAL_BASE, loading: true }).visible).toBe(false);
    expect(deriveTrialChecklist({ ...TRIAL_BASE, known: false }).visible).toBe(false);
  });

  it('hides when dismissed or when completed_at was already persisted on load (even if classes were later deleted)', () => {
    expect(deriveTrialChecklist({ ...TRIAL_BASE, dismissed: true }).visible).toBe(false);
    const completedOnLoad = deriveTrialChecklist({
      ...TRIAL_BASE,
      classroomCount: 0,
      assignmentCount: 0,
      completed: true,
    });
    expect(completedOnLoad.complete).toBe(true);
    expect(completedOnLoad.visible).toBe(false);
  });
});

describe('trialChecklistTelemetry — once-per-teacher emission and latches', () => {
  beforeEach(() => {
    captureMock.mockClear();
    growthMock.mockClear();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('fires trial_checklist_shown once per teacher id with locale, plan: trial, and done_count', () => {
    expect(captureTrialChecklistShownOnce('t-1', { locale: 'en', done_count: 1 })).toBe(true);
    expect(captureTrialChecklistShownOnce('t-1', { locale: 'en', done_count: 1 })).toBe(false);

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('trial_checklist_shown', {
      locale: 'en',
      plan: 'trial',
      done_count: 1,
    });
    expect(growthMock).toHaveBeenCalledTimes(1);
    expect(growthMock).toHaveBeenCalledWith('trial_checklist_shown', {
      locale: 'en',
      plan: 'trial',
      done_count: 1,
    });
  });

  it('fires trial_checklist_step_completed once per step per teacher id with step_index 1/2/3', () => {
    expect(
      captureTrialChecklistStepCompletedOnce('t-1', 'create_classroom', { locale: 'he' }),
    ).toBe(true);
    expect(
      captureTrialChecklistStepCompletedOnce('t-1', 'create_classroom', { locale: 'he' }),
    ).toBe(false);
    expect(
      captureTrialChecklistStepCompletedOnce('t-1', 'invite_students', { locale: 'he' }),
    ).toBe(true);

    expect(captureMock).toHaveBeenCalledTimes(2);
    expect(captureMock).toHaveBeenNthCalledWith(1, 'trial_checklist_step_completed', {
      step: 'create_classroom',
      step_index: 1,
      locale: 'he',
      plan: 'trial',
    });
    expect(captureMock).toHaveBeenNthCalledWith(2, 'trial_checklist_step_completed', {
      step: 'invite_students',
      step_index: 2,
      locale: 'he',
      plan: 'trial',
    });
  });

  it('fires trial_checklist_all_completed once and skips if completed_at was already set on load', () => {
    expect(
      captureTrialChecklistAllCompletedOnce('t-1', {
        locale: 'en',
        alreadyCompleted: true,
      }),
    ).toBe(false);
    expect(captureMock).not.toHaveBeenCalled();

    expect(captureTrialChecklistAllCompletedOnce('t-1', { locale: 'en' })).toBe(true);
    expect(captureTrialChecklistAllCompletedOnce('t-1', { locale: 'en' })).toBe(false);
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('trial_checklist_all_completed', {
      locale: 'en',
      plan: 'trial',
    });
    expect(growthMock).toHaveBeenCalledWith('trial_checklist_all_completed', {
      locale: 'en',
      plan: 'trial',
    });
  });
});
