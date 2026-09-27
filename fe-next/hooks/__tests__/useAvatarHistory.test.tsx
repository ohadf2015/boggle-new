// @vitest-environment happy-dom
/**
 * useAvatarHistory — persistent "previous avatar" so a player can ALWAYS revert
 * the last save, even across sessions (localStorage, per user).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAvatarHistory } from '../useAvatarHistory';
import { DEFAULT_AVATAR_CONFIG, getRandomAvatarConfig } from '@/shared/types/customAvatar';

beforeEach(() => {
  localStorage.clear();
});

describe('useAvatarHistory', () => {
  it('has no previous before anything is stashed', () => {
    const { result } = renderHook(() => useAvatarHistory('user-1'));
    expect(result.current.previousConfig).toBeNull();
    expect(result.current.hasPrevious).toBe(false);
  });

  it('exposes the stashed config as previous', () => {
    const cfg = getRandomAvatarConfig();
    const { result } = renderHook(() => useAvatarHistory('user-1'));
    act(() => result.current.stashCurrent(cfg));
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.previousConfig).toEqual(cfg);
  });

  it('persists across remounts for the same user', () => {
    const cfg = DEFAULT_AVATAR_CONFIG;
    const first = renderHook(() => useAvatarHistory('user-1'));
    act(() => first.result.current.stashCurrent(cfg));
    first.unmount();

    const second = renderHook(() => useAvatarHistory('user-1'));
    expect(second.result.current.previousConfig).toEqual(cfg);
  });

  it('is scoped per user', () => {
    const cfg = getRandomAvatarConfig();
    const a = renderHook(() => useAvatarHistory('user-a'));
    act(() => a.result.current.stashCurrent(cfg));

    const b = renderHook(() => useAvatarHistory('user-b'));
    expect(b.result.current.previousConfig).toBeNull();
  });

  it('ignores corrupt stored data', () => {
    localStorage.setItem('lc_prev_avatar_user-1', '{ not json');
    const { result } = renderHook(() => useAvatarHistory('user-1'));
    expect(result.current.previousConfig).toBeNull();
  });

  it('is inert without a userId', () => {
    const { result } = renderHook(() => useAvatarHistory(null));
    act(() => result.current.stashCurrent(DEFAULT_AVATAR_CONFIG));
    expect(result.current.previousConfig).toBeNull();
  });
});
