import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/utils/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/education/guestStudent', () => ({ signInAsGuestStudent: vi.fn(), waitForProfile: vi.fn() }));
vi.mock('@/lib/education/joinGuestPreflight', () => ({ runGuestJoinPreflight: vi.fn() }));

import { useJoinClassroom } from '@/hooks/useJoinClassroom';
import { joinFailure } from '../joinFailure';

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body } as unknown as Response);

describe('useJoinClassroom — join hardening', () => {
  beforeEach(() => mockUseAuth.mockReturnValue({ user: { id: 'u1' } }));
  afterEach(() => vi.unstubAllGlobals());

  it('Given the teacher opens their own class code, Then TEACHER_OWN_CLASS comes back and maps to a friendly inline line', async () => {
    vi.stubGlobal('fetch', reply(409, { code: 'TEACHER_OWN_CLASS', error: 'x' }));
    const { result } = renderHook(() => useJoinClassroom());
    const res = await result.current.joinClassroom('ABC123');
    expect(res).toMatchObject({ success: false, code: 'TEACHER_OWN_CLASS' });
    expect(joinFailure(res.code).formErrorKey).toBe('education.student.join.teacherOwnClass');
  });

  it('Given the server replaced a profane name, Then the replacement is handed back so the device stores it', async () => {
    vi.stubGlobal('fetch', reply(200, { classroomId: 'c1', displayName: 'Turbo Salmon' }));
    const { result } = renderHook(() => useJoinClassroom());
    await expect(result.current.joinClassroom('ABC123')).resolves.toMatchObject({ success: true, displayName: 'Turbo Salmon' });
  });
});
