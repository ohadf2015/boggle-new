import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { pushMock, joinMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  joinMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/en/student/join',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, loading: false }),
}));
vi.mock('@/hooks/useJoinClassroom', () => ({
  useJoinClassroom: () => ({ joinClassroom: joinMock }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('@/utils/profileStorage', () => ({ setStoredUsername: vi.fn() }));

import { useJoinFlow } from '../useJoinFlow';

const CODE = 'K7MQ2P';

async function submitWith(result: unknown) {
  joinMock.mockResolvedValue(result);
  const hook = renderHook(() => useJoinFlow(CODE));
  await act(async () => {
    hook.result.current.submit('Sam');
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return hook;
}

describe('useJoinFlow destinations', () => {
  beforeEach(() => {
    pushMock.mockClear();
    joinMock.mockReset();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) })));
  });

  it('a join that resolves to a live game walks into that room with classroom context', async () => {
    await submitWith({ success: true, gameCode: CODE, classroomId: 'c1' });
    expect(pushMock).toHaveBeenCalledWith(`/en/multiplayer?room=${CODE}&classroom=true`);
  });

  it('a join that resolves to no game lands on the student hub', async () => {
    await submitWith({ success: true, gameCode: null, classroomId: 'c1' });
    expect(pushMock).toHaveBeenCalledWith('/en/student');
  });

  it('a full classroom stays on the join form with an inline error and never navigates', async () => {
    const hook = await submitWith({ success: false, code: 'STUDENT_LIMIT_REACHED' });
    expect(pushMock).not.toHaveBeenCalled();
    expect(hook.result.current.formErrorKey).toBe('education.student.join.classroomFull');
  });

  it('a rejected code sends the student back to the code field and never navigates', async () => {
    const hook = await submitWith({ success: false, code: 'INVALID_CODE' });
    expect(pushMock).not.toHaveBeenCalled();
    expect(hook.result.current.step).toBe('code');
    expect(hook.result.current.codeErrorKey).toBe('education.student.join.invalidCode');
  });

  it('a network fault shows a retry-able error on the form and never navigates', async () => {
    joinMock.mockRejectedValue(new Error('offline'));
    const hook = renderHook(() => useJoinFlow(CODE));
    await act(async () => {
      hook.result.current.submit('Sam');
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(hook.result.current.formErrorKey).toBe('common.error');
  });
});
