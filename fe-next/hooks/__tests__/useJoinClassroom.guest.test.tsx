import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseAuth, mockJoinClassroomAPI, mockSignInAsGuest, mockWaitForProfile, mockCreateClient } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockJoinClassroomAPI: vi.fn(),
  mockSignInAsGuest: vi.fn(),
  mockWaitForProfile: vi.fn(),
  mockCreateClient: vi.fn(() => ({ __client: true })),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useMounted', () => ({ useMounted: () => true }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() } }));
vi.mock('@/utils/supabase/client', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/education/guestStudent', () => ({
  signInAsGuestStudent: mockSignInAsGuest,
  waitForProfile: mockWaitForProfile,
}));
vi.mock('@/lib/supabase/education', () => ({
  getClassrooms: vi.fn(),
  getClassroom: vi.fn(),
  createClassroom: vi.fn(),
  updateClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  joinClassroom: mockJoinClassroomAPI,
}));

import { useJoinClassroom } from '../useClassroom';

describe('useJoinClassroom — guest (account-less) path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoinClassroomAPI.mockResolvedValue({ data: { classroom_id: 'class-1' }, error: null });
    mockSignInAsGuest.mockResolvedValue({ user: { id: 'anon-1' }, error: null });
    mockWaitForProfile.mockResolvedValue(true);
  });

  it('logged-in student joins with their own id (no anonymous sign-in)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123');

    expect(mockSignInAsGuest).not.toHaveBeenCalled();
    expect(mockJoinClassroomAPI).toHaveBeenCalledWith('ABC123', 'real-1');
    expect(res).toEqual({ success: true, classroomId: 'class-1' });
  });

  it('logged-out student with a name signs in anonymously, awaits profile, then joins', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123', { guestName: 'Maya' });

    expect(mockSignInAsGuest).toHaveBeenCalledWith({ __client: true }, 'Maya');
    // Race-safe: profile awaited BEFORE join + navigation.
    expect(mockWaitForProfile).toHaveBeenCalledWith({ __client: true }, 'anon-1');
    expect(mockJoinClassroomAPI).toHaveBeenCalledWith('ABC123', 'anon-1');
    expect(res).toEqual({ success: true, classroomId: 'class-1' });
  });

  it('logged-out with NO name preserves the not-authenticated guard', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123');

    expect(mockSignInAsGuest).not.toHaveBeenCalled();
    expect(mockJoinClassroomAPI).not.toHaveBeenCalled();
    expect(res.success).toBe(false);
  });

  it('surfaces the anonymous sign-in error (e.g. feature disabled) and does not join', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockSignInAsGuest.mockResolvedValue({ user: null, error: 'Anonymous sign-ins are disabled' });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123', { guestName: 'Maya' });

    expect(mockJoinClassroomAPI).not.toHaveBeenCalled();
    expect(res.success).toBe(false);
    expect(res.error).toContain('disabled');
  });
});
