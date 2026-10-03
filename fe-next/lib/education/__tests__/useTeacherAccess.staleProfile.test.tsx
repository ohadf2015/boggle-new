import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const refreshProfile = vi.fn();
const authState: { profile: unknown; user: unknown; loading: boolean; refreshProfile?: () => Promise<void> } = {
  profile: { user_role: 'player' },
  user: { id: 'u1' },
  loading: false,
  refreshProfile,
};

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: vi.fn(async () => ({ ok: true, json: async () => ({ row: { status: 'approved' } }) })),
}));

import { useTeacherAccess } from '../useTeacherAccess';

async function drain() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

describe('useTeacherAccess — approved request, profile not yet promoted', () => {
  beforeEach(() => {
    refreshProfile.mockReset();
    authState.profile = { user_role: 'player' };
    authState.refreshProfile = refreshProfile;
  });

  it('refreshes the profile once and stays loading meanwhile, instead of handing TeacherGate a "no access"', async () => {
    let resolve: () => void = () => {};
    refreshProfile.mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    const { result } = renderHook(() => useTeacherAccess());
    await drain();
    expect(refreshProfile).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasAccess).toBe(false);
    await act(async () => { resolve(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(refreshProfile).toHaveBeenCalledTimes(1);
  });

  it('ends the wait even when the refresh fails (never a silent spinner)', async () => {
    refreshProfile.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useTeacherAccess());
    await drain();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(refreshProfile).toHaveBeenCalledTimes(1);
  });

  it('does nothing extra for a teacher whose profile already says so', async () => {
    authState.profile = { user_role: 'teacher' };
    const { result } = renderHook(() => useTeacherAccess());
    await drain();
    expect(refreshProfile).not.toHaveBeenCalled();
    expect(result.current.hasAccess).toBe(true);
  });

  it('tolerates an auth context without refreshProfile', async () => {
    authState.refreshProfile = undefined;
    const { result } = renderHook(() => useTeacherAccess());
    await drain();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
