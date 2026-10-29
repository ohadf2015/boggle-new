import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseAuth, mockSignInAsGuest, mockVerdict } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockSignInAsGuest: vi.fn(),
  mockVerdict: vi.fn(async () => 'game'),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() } }));
vi.mock('@/utils/supabase/client', () => ({ createClient: vi.fn(() => ({})) }));
vi.mock('@/lib/education/guestStudent', () => ({ signInAsGuestStudent: mockSignInAsGuest, waitForProfile: vi.fn() }));
vi.mock('@/lib/education/joinCodeVerdict', () => ({ resolveJoinCodeVerdict: mockVerdict }));

import { useJoinClassroom } from '../useJoinClassroom';
import { joinFailure } from '@/components/education/join/joinFailure';

const locked = { ok: false, status: 423, json: async () => ({ error: 'Room locked', code: 'ROOM_LOCKED' }) };

describe('useJoinClassroom — locked room', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => locked));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('maps the route 423 to code ROOM_LOCKED for a signed-in student', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' } });
    const { result } = renderHook(() => useJoinClassroom());

    await expect(result.current.joinClassroom('TZCOQ7')).resolves.toMatchObject({ success: false, code: 'ROOM_LOCKED' });
  });

  it('refuses a guest from the preflight without minting an account', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('TZCOQ7', { guestName: 'Dana' });

    expect(res).toMatchObject({ success: false, code: 'ROOM_LOCKED' });
    expect(mockSignInAsGuest).not.toHaveBeenCalled();
  });

  it('is recorded as room_locked, never as the class-cap "full" signal', () => {
    expect(joinFailure('ROOM_LOCKED')).toMatchObject({ outcome: 'room_locked', effect: 'locked' });
  });
});
