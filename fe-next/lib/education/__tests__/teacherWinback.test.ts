import { describe, expect, it } from 'vitest';
import {
  TEACHER_WINBACK_DISMISS_KEY,
  isTeacherWinbackDismissed,
  persistTeacherWinbackDismissed,
  teacherWinbackEligible,
} from '../teacherWinback';

const open = {
  approved: true,
  hasPro: false,
  trialUsed: false,
  activeTrial: false,
  dismissed: false,
};

describe('teacherWinbackEligible', () => {
  it('shows for an approved teacher who never started a trial and has none running', () => {
    expect(teacherWinbackEligible(open)).toBe(true);
  });

  it('stays off for anyone who was not approved', () => {
    expect(teacherWinbackEligible({ ...open, approved: false })).toBe(false);
  });

  it('stays off while a trial is active, already used, or they already pay', () => {
    expect(teacherWinbackEligible({ ...open, activeTrial: true })).toBe(false);
    expect(teacherWinbackEligible({ ...open, trialUsed: true })).toBe(false);
    expect(teacherWinbackEligible({ ...open, hasPro: true })).toBe(false);
  });

  it('stays off after they dismiss it, and that dismiss sticks', () => {
    expect(teacherWinbackEligible({ ...open, dismissed: true })).toBe(false);
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    expect(isTeacherWinbackDismissed(storage)).toBe(false);
    persistTeacherWinbackDismissed(storage);
    expect(store.get(TEACHER_WINBACK_DISMISS_KEY)).toBe('true');
    expect(isTeacherWinbackDismissed(storage)).toBe(true);
  });
});
