import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthState } from '../useAuthState';
import { getStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { getRandomAvatarConfig } from '@/shared/types/customAvatar';
import type { ProfileData } from '../../authTypes';

// Lobbies (host/player) seed their own avatar + editor from localStorage.
// A save on the profile page only writes profiles.avatar_config, so without a
// mirror the lobby kept showing — and re-editing — the previous avatar.
describe('useAuthState avatar mirror', () => {
  beforeEach(() => localStorage.clear());

  it('writes the signed-in profile avatar to local storage, and follows edits', () => {
    // Given a stale local avatar from an earlier session
    const stale = getRandomAvatarConfig();
    setStoredCustomAvatar(stale);
    const saved = { ...getRandomAvatarConfig(), skinColor: '#aa0000' };
    const edited = { ...saved, skinColor: '#00aa00' };
    const { result } = renderHook(() => useAuthState());

    // When the profile loads, then the player saves a new avatar
    act(() => result.current.setters.setProfile({ id: 'u1', avatar_config: saved } as unknown as ProfileData));
    expect(getStoredCustomAvatar()).toEqual(saved);
    act(() => result.current.setters.setProfile({ id: 'u1', avatar_config: edited } as unknown as ProfileData));

    // Then local storage carries the latest profile avatar
    expect(getStoredCustomAvatar()).toEqual(edited);
  });

  it('leaves a guest avatar alone when there is no profile avatar', () => {
    const guest = getRandomAvatarConfig();
    setStoredCustomAvatar(guest);
    const { result } = renderHook(() => useAuthState());
    act(() => result.current.setters.setProfile(null));
    expect(getStoredCustomAvatar()).toEqual(guest);
  });
});
