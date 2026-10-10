import { describe, it, expect } from 'vitest';
import {
  TEACHER_TRIAL_ENDED_DISMISS_KEY,
  TEACHER_TRIAL_ENDED_DISMISS_TTL_MS,
  isTeacherTrialEndedDismissed,
  persistTeacherTrialEndedDismissed,
} from './teacherTrialEndedDismiss';

describe('teacherTrialEndedDismiss', () => {
  it('is not dismissed when storage is empty', () => {
    expect(isTeacherTrialEndedDismissed({ getItem: () => null }, 1_000)).toBe(false);
  });

  it('stays quiet inside the TTL and re-surfaces after', () => {
    const store: Record<string, string> = {};
    persistTeacherTrialEndedDismissed(
      { setItem: (k, v) => { store[k] = v; } },
      1_000,
    );
    expect(store[TEACHER_TRIAL_ENDED_DISMISS_KEY]).toBe('1000');
    expect(isTeacherTrialEndedDismissed({ getItem: (k) => store[k] ?? null }, 1_000)).toBe(true);
    expect(
      isTeacherTrialEndedDismissed({ getItem: (k) => store[k] ?? null }, 1_000 + TEACHER_TRIAL_ENDED_DISMISS_TTL_MS - 1),
    ).toBe(true);
    expect(
      isTeacherTrialEndedDismissed({ getItem: (k) => store[k] ?? null }, 1_000 + TEACHER_TRIAL_ENDED_DISMISS_TTL_MS),
    ).toBe(false);
  });

  it('never throws when storage throws', () => {
    expect(() =>
      isTeacherTrialEndedDismissed({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
    expect(() =>
      persistTeacherTrialEndedDismissed({
        setItem: () => {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });
});
