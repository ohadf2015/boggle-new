import { describe, it, expect } from 'vitest';
import { selectAvatarNudge, withAvatarCustomizedFlag } from '../avatarNudge';

const NOW = 1_000_000_000_000;
const base = {
  isAuthenticated: true,
  avatarCustomized: false,
  enabled: true,
  dismissedUntil: null as number | null,
  now: NOW,
};

describe('selectAvatarNudge', () => {
  it('shows for an authed, never-customized, non-dismissed user with the flag on', () => {
    expect(selectAvatarNudge(base)).toBe(true);
  });

  it('hides for guests (personalization-that-persists is an authed concept)', () => {
    expect(selectAvatarNudge({ ...base, isAuthenticated: false })).toBe(false);
  });

  it('hides once the user has deliberately customized', () => {
    expect(selectAvatarNudge({ ...base, avatarCustomized: true })).toBe(false);
  });

  it('fail-safe: undefined customized flag is treated as customized (suppress)', () => {
    // e.g. a profile loaded via a projection that did not fetch the column —
    // never nudge a possible customizer.
    expect(selectAvatarNudge({ ...base, avatarCustomized: undefined })).toBe(false);
  });

  it('hides when the remote kill-switch is off', () => {
    expect(selectAvatarNudge({ ...base, enabled: false })).toBe(false);
  });

  it('hides while inside the dismissal snooze window', () => {
    expect(selectAvatarNudge({ ...base, dismissedUntil: NOW + 1 })).toBe(false);
  });

  it('shows again after the snooze window has elapsed', () => {
    expect(selectAvatarNudge({ ...base, dismissedUntil: NOW - 1 })).toBe(true);
  });
});

describe('withAvatarCustomizedFlag', () => {
  it('flags a deliberate avatar_config save as customized', () => {
    const out = withAvatarCustomizedFlag({ avatar_config: { base: 'round' } as never });
    expect(out.avatar_customized).toBe(true);
    expect(out.avatar_config).toEqual({ base: 'round' });
  });

  it('leaves unrelated updates untouched (no avatar_config → no flag)', () => {
    const out = withAvatarCustomizedFlag({ display_name: 'Ohad' });
    expect(out.avatar_customized).toBeUndefined();
    expect(out).toEqual({ display_name: 'Ohad' });
  });

  it('respects an explicit caller-provided flag', () => {
    const out = withAvatarCustomizedFlag({
      avatar_config: { base: 'round' } as never,
      avatar_customized: false,
    });
    expect(out.avatar_customized).toBe(false);
  });

  it('does not mutate the input object', () => {
    const input = { avatar_config: { base: 'round' } as never };
    withAvatarCustomizedFlag(input);
    expect('avatar_customized' in input).toBe(false);
  });
});
