import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/utils/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/education/guestStudent', () => ({ signInAsGuestStudent: vi.fn(), waitForProfile: vi.fn() }));
vi.mock('@/lib/education/joinGuestPreflight', () => ({ runGuestJoinPreflight: vi.fn() }));

import { useJoinClassroom } from '@/hooks/useJoinClassroom';

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body } as unknown as Response);

describe('useJoinClassroom — an ended game', () => {
  beforeEach(() => mockUseAuth.mockReturnValue({ user: { id: 'u1' } }));
  afterEach(() => vi.unstubAllGlobals());

  it('maps a 410 to SESSION_ENDED', async () => {
    vi.stubGlobal('fetch', reply(410, { error: 'ended' }));
    const { result } = renderHook(() => useJoinClassroom());
    await expect(result.current.joinClassroom('ABC123')).resolves.toMatchObject({
      success: false,
      code: 'SESSION_ENDED',
    });
  });

  it('maps a body code SESSION_ENDED to SESSION_ENDED, whatever the status', async () => {
    vi.stubGlobal('fetch', reply(400, { code: 'SESSION_ENDED' }));
    const { result } = renderHook(() => useJoinClassroom());
    await expect(result.current.joinClassroom('ABC123')).resolves.toMatchObject({ code: 'SESSION_ENDED' });
  });

  it('passes through a class join made off an ended game code', async () => {
    vi.stubGlobal('fetch', reply(200, { classroomId: 'c9', endedSessionCode: true }));
    const { result } = renderHook(() => useJoinClassroom());
    await expect(result.current.joinClassroom('ABC123')).resolves.toMatchObject({
      success: true,
      classroomId: 'c9',
      endedSessionCode: true,
    });
  });

  it('keeps a plain 400 as INVALID_CODE', async () => {
    vi.stubGlobal('fetch', reply(400, { error: 'nope' }));
    const { result } = renderHook(() => useJoinClassroom());
    await expect(result.current.joinClassroom('ABC123')).resolves.toMatchObject({ code: 'INVALID_CODE' });
  });
});
