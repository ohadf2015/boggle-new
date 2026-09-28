import { describe, it, expect } from 'vitest';
import {
  TEACHER_TRIAL_OFFER_DISMISS_KEY,
  TEACHER_TRIAL_OFFER_DISMISS_TTL_MS,
  isTeacherTrialOfferDismissed,
  persistTeacherTrialOfferDismissed,
} from './teacherTrialOfferDismiss';

describe('teacherTrialOfferDismiss', () => {
  it('is not dismissed when storage is empty', () => {
    expect(isTeacherTrialOfferDismissed({ getItem: () => null }, 1_000)).toBe(false);
  });

  it('stays quiet inside the TTL and re-surfaces after', () => {
    const store: Record<string, string> = {};
    persistTeacherTrialOfferDismissed(
      { setItem: (k, v) => { store[k] = v; } },
      1_000,
    );
    expect(store[TEACHER_TRIAL_OFFER_DISMISS_KEY]).toBe('1000');
    expect(isTeacherTrialOfferDismissed({ getItem: (k) => store[k] ?? null }, 1_000)).toBe(true);
    expect(
      isTeacherTrialOfferDismissed({ getItem: (k) => store[k] ?? null }, 1_000 + TEACHER_TRIAL_OFFER_DISMISS_TTL_MS - 1),
    ).toBe(true);
    expect(
      isTeacherTrialOfferDismissed({ getItem: (k) => store[k] ?? null }, 1_000 + TEACHER_TRIAL_OFFER_DISMISS_TTL_MS),
    ).toBe(false);
  });

  it('never throws when storage throws', () => {
    expect(() =>
      isTeacherTrialOfferDismissed({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
    expect(() =>
      persistTeacherTrialOfferDismissed({
        setItem: () => {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });
});
