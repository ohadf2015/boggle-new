import { describe, it, expect } from 'vitest';
import { shouldActivateRound } from '../roundActivation';

const fresh = {
  showModeReveal: false,
  showStartAnimation: false,
  hasBoard: true,
  remainingTime: 60,
  gameActive: false,
  waitingForResults: false,
  freshStartPending: true,
  countdownSeen: false,
};

describe('shouldActivateRound', () => {
  it('GIVEN a fresh start whose splash has not mounted yet WHEN the board and clock land first THEN the round waits (the clock must not run through the 3-2-1)', () => {
    expect(shouldActivateRound(fresh)).toBe(false);
  });

  it('GIVEN the splash and 3-2-1 have played WHEN the countdown ends THEN the round activates', () => {
    expect(shouldActivateRound({ ...fresh, countdownSeen: true })).toBe(true);
  });

  it('GIVEN the countdown is on screen WHEN anything else is ready THEN it still waits', () => {
    expect(shouldActivateRound({ ...fresh, countdownSeen: true, showStartAnimation: true })).toBe(false);
    expect(shouldActivateRound({ ...fresh, countdownSeen: true, showModeReveal: true })).toBe(false);
  });

  it('GIVEN a reconnect restore with no countdown to play WHEN board and clock are back THEN it resumes at once', () => {
    expect(shouldActivateRound({ ...fresh, freshStartPending: false })).toBe(true);
  });

  it('GIVEN no clock left or results pending WHEN checked THEN it never activates', () => {
    expect(shouldActivateRound({ ...fresh, countdownSeen: true, remainingTime: 0 })).toBe(false);
    expect(shouldActivateRound({ ...fresh, countdownSeen: true, waitingForResults: true })).toBe(false);
    expect(shouldActivateRound({ ...fresh, countdownSeen: true, hasBoard: false })).toBe(false);
  });
});
