import { describe, it, expect } from 'vitest';
import { homeNextStep, homeOnboarding } from '../homeOnboarding';
import type { TrialChecklistState } from '../trialChecklistProgress';

const fresh = homeOnboarding({ classroomCount: 0, inviteCopied: false, liveStarted: false, dismissed: false });
const needsShare = homeOnboarding({ classroomCount: 1, inviteCopied: false, liveStarted: false, dismissed: false });
const done = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: true, dismissed: false });

function trial(current: TrialChecklistState['current'], visible = true): TrialChecklistState {
  const order = ['create_classroom', 'invite_students', 'first_assignment'] as const;
  const at = current ? order.indexOf(current) : 3;
  return {
    steps: order.map((id, i) => ({
      id,
      index: (i + 1) as 1 | 2 | 3,
      status: i < at ? 'done' : i === at ? 'current' : 'todo',
      done: i < at,
    })),
    current,
    doneCount: at,
    allStepsDone: current === null,
    complete: current === null,
    visible,
  };
}

describe('homeNextStep', () => {
  it('Given a brand-new teacher, Then the one next step is creating a class and it cannot be dismissed', () => {
    expect(homeNextStep({ onboarding: fresh })).toEqual({
      source: 'onboarding',
      id: 'createClass',
      done: 0,
      total: 3,
      awaitingPlayers: false,
      dismissible: false,
    });
  });

  it('Given a trialing teacher, Then Home keeps the one 3-step list, so the step never flips when the plan loads', () => {
    const withTrial = { onboarding: needsShare, trial: trial('first_assignment') } as Parameters<typeof homeNextStep>[0];
    expect(homeNextStep(withTrial)).toEqual(homeNextStep({ onboarding: needsShare }));
    expect(homeNextStep(withTrial)).toMatchObject({ source: 'onboarding', id: 'shareCode' });
  });

  it('Given the get-students-in card is already on Home, Then no second share card appears', () => {
    expect(homeNextStep({ onboarding: needsShare, shareCardShown: true })).toBeNull();
  });

  it('Given every step is done, Then there is no next-step card', () => {
    expect(homeNextStep({ onboarding: done })).toBeNull();
  });

  it('Given a dismissed onboarding with a class, Then nothing shows', () => {
    const dismissed = homeOnboarding({ classroomCount: 1, inviteCopied: false, liveStarted: false, dismissed: true });
    expect(homeNextStep({ onboarding: dismissed })).toBeNull();
  });

  it('Given a room open with nobody in, Then the step says so', () => {
    const waiting = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: false, roomOpened: true, dismissed: false });
    expect(homeNextStep({ onboarding: waiting })).toMatchObject({ id: 'tryDemo', awaitingPlayers: true });
  });
});
