import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockUseAuth = vi.fn();
const mockFlag = vi.fn();
const mockTrack = vi.fn();
const mockDismiss = vi.fn();
const mockGetDismissed = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/usePostHogFlag', () => ({ usePostHogFlag: () => mockFlag() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (e: string) => mockTrack(e) }));
vi.mock('@/lib/avatar/avatarNudgeStorage', () => ({
  getAvatarNudgeDismissedUntil: () => mockGetDismissed(),
  dismissAvatarNudge: (n: number) => mockDismiss(n),
}));

import { useAvatarCustomizationNudge } from '../useAvatarCustomizationNudge';

describe('useAvatarCustomizationNudge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlag.mockReturnValue(true);
    mockGetDismissed.mockReturnValue(null);
  });

  it('shows for an authed user whose avatar is still un-customized', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, profile: { avatar_customized: false } });
    const { result } = renderHook(() => useAvatarCustomizationNudge());
    expect(result.current.show).toBe(true);
  });

  it('stays hidden once the avatar has been customized', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, profile: { avatar_customized: true } });
    const { result } = renderHook(() => useAvatarCustomizationNudge());
    expect(result.current.show).toBe(false);
  });

  it('fires the shown telemetry once when it becomes visible', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, profile: { avatar_customized: false } });
    renderHook(() => useAvatarCustomizationNudge());
    expect(mockTrack).toHaveBeenCalledWith('avatar_nudge_shown');
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('persists, hides, and tracks on dismiss', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, profile: { avatar_customized: false } });
    const { result } = renderHook(() => useAvatarCustomizationNudge());
    act(() => result.current.dismiss());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('avatar_nudge_dismissed');
    expect(result.current.show).toBe(false);
  });

  it('tracks the click without hiding (consumer opens the builder)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, profile: { avatar_customized: false } });
    const { result } = renderHook(() => useAvatarCustomizationNudge());
    act(() => result.current.markClicked());
    expect(mockTrack).toHaveBeenCalledWith('avatar_nudge_clicked');
  });
});
