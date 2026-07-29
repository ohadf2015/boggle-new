import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInviteContext } from '@/hooks/useInviteContext';
import { savePendingRoomInvite, consumePendingRoomInvite } from '@/utils/onboardingStorage';

describe('useInviteContext', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns null when no invite pending', () => {
    const { result } = renderHook(() => useInviteContext());
    expect(result.current).toBeNull();
  });

  it('returns invite when present at mount', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    const { result } = renderHook(() => useInviteContext());
    expect(result.current).toMatchObject({ code: 'ABC123', hostName: 'Alice' });
  });

  it('reacts to invite-changed event', () => {
    const { result } = renderHook(() => useInviteContext());
    expect(result.current).toBeNull();
    act(() => savePendingRoomInvite('XYZ789', 'Bob'));
    expect(result.current).toMatchObject({ code: 'XYZ789', hostName: 'Bob' });
    act(() => {
      consumePendingRoomInvite();
    });
    expect(result.current).toBeNull();
  });
});
