import { describe, it, expect, beforeEach } from 'vitest';
import {
  AVATAR_NUDGE_DISMISS_DAYS,
  getAvatarNudgeDismissedUntil,
  dismissAvatarNudge,
} from '../avatarNudgeStorage';

describe('avatarNudgeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns null when nothing has been dismissed', () => {
    expect(getAvatarNudgeDismissedUntil()).toBeNull();
  });

  it('persists a snooze window 30 days out from dismissal', () => {
    const now = 1_000_000_000_000;
    dismissAvatarNudge(now);
    const expected = now + AVATAR_NUDGE_DISMISS_DAYS * 86_400_000;
    expect(getAvatarNudgeDismissedUntil()).toBe(expected);
  });

  it('round-trips through storage so a later read sees the snooze', () => {
    const now = 2_000_000_000_000;
    dismissAvatarNudge(now);
    expect(getAvatarNudgeDismissedUntil()).toBeGreaterThan(now);
  });
});
