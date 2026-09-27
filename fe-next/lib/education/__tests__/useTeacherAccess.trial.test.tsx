import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u-1', user_role: 'teacher', is_admin: false },
    user: { id: 'u-1' },
    loading: false,
  }),
}));

const getWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ getWithAuth: (...a: any[]) => getWithAuth(...a) }));

import { useTeacherAccess } from '../useTeacherAccess';

const futureIso = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

describe('useTeacherAccess trial exposure', () => {
  beforeEach(() => getWithAuth.mockReset());

  it('exposes the trial countdown for an approved teacher', async () => {
    getWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ row: { status: 'approved', trial_expires_at: futureIso } }),
    });

    const { result } = renderHook(() => useTeacherAccess());
    expect(result.current.hasAccess).toBe(true);

    await waitFor(() => expect(result.current.trial).not.toBeNull());
    expect(result.current.trial?.daysLeft).toBe(10);
    expect(result.current.trial?.isExpired).toBe(false);
  });

  it('fetches the request even when the user already has access', async () => {
    getWithAuth.mockResolvedValue({ ok: true, json: async () => ({ row: null }) });
    renderHook(() => useTeacherAccess());
    await waitFor(() => expect(getWithAuth).toHaveBeenCalledWith('/api/education/access-request'));
  });

  it('leaves trial null when there is no expiry', async () => {
    getWithAuth.mockResolvedValue({ ok: true, json: async () => ({ row: { status: 'approved', trial_expires_at: null } }) });
    const { result } = renderHook(() => useTeacherAccess());
    await waitFor(() => expect(getWithAuth).toHaveBeenCalled());
    expect(result.current.trial).toBeNull();
  });
});
