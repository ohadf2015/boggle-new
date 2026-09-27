import { describe, it, expect } from 'vitest';
import { selectWheelSignupOffer } from '../wheelSignupOffer';

/**
 * Pure decision logic for the post-Word-Wheel signup offer.
 *
 * This selector is the nightly-measurable, deterministic core: given a guest's
 * post-game state it returns WHICH value-led offer to surface (or null to stay
 * silent). The A/B experiment only decides whether to render the CTA at all;
 * this function decides the framing. Non-predatory: never fires for a weak,
 * streak-less first-less run, and respects the dismissal cooldown.
 */
describe('selectWheelSignupOffer', () => {
  const base = {
    isAuthenticated: false,
    isPractice: false,
    streakDays: 0,
    isFirstCompletion: false,
    dismissedRecently: false,
    score: 40,
  };

  it('returns null for authenticated users (already converted)', () => {
    expect(selectWheelSignupOffer({ ...base, isAuthenticated: true })).toBeNull();
  });

  it('returns null in practice mode (no real stakes to save)', () => {
    expect(selectWheelSignupOffer({ ...base, isPractice: true, isFirstCompletion: true })).toBeNull();
  });

  it('returns null when the signup modal was dismissed recently (no nagging)', () => {
    expect(
      selectWheelSignupOffer({ ...base, isFirstCompletion: true, dismissedRecently: true }),
    ).toBeNull();
  });

  it('prioritizes first-completion (onboarding welcome moment)', () => {
    // Even with a streak forming, the very first completion gets the welcome.
    expect(
      selectWheelSignupOffer({ ...base, isFirstCompletion: true, streakDays: 1 }),
    ).toBe('first-completion');
  });

  it('offers the streak-value framing for an active streak (>= 2 days)', () => {
    expect(selectWheelSignupOffer({ ...base, streakDays: 2 })).toBe('streak-value');
    expect(selectWheelSignupOffer({ ...base, streakDays: 9 })).toBe('streak-value');
  });

  it('offers the board-spot framing for a solid run when no streak yet', () => {
    expect(selectWheelSignupOffer({ ...base, streakDays: 1, score: 30 })).toBe('board-spot');
  });

  it('stays silent for a weak, streak-less, non-first run (do not pester)', () => {
    expect(
      selectWheelSignupOffer({ ...base, streakDays: 0, isFirstCompletion: false, score: 5 }),
    ).toBeNull();
  });
});
