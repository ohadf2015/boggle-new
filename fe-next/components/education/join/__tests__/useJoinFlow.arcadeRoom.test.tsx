import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../endedJoinCode', () => ({ isEndedJoinCode: async () => false, endedJoinCodeStatus: async () => 'not_ended' }));

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  usePathname: () => '/he/join/B3Y98K',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: vi.fn() }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn(), trackJoinCodeStepRefused: vi.fn() }));
vi.mock('@/utils/profileStorage', () => ({ setStoredUsername: vi.fn() }));

import { useJoinFlow } from '../useJoinFlow';
import { resolveJoinTarget } from '../joinTarget';

const respond = (body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => body })));

describe('a multiplayer room code on the class join page', () => {
  beforeEach(() => replaceMock.mockClear());

  it('resolves to the arcade verdict', async () => {
    respond({ kind: 'arcade', roomCode: 'B3Y98K' });
    await expect(resolveJoinTarget('B3Y98K')).resolves.toEqual({ verdict: 'arcade', gameCode: 'B3Y98K' });
  });

  it('sends the player to the multiplayer room instead of "invalid code"', async () => {
    respond({ kind: 'arcade', roomCode: 'B3Y98K' });
    renderHook(() => useJoinFlow('B3Y98K'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/he/multiplayer?room=B3Y98K'));
  });

  it('leaves a classroom code on the join flow', async () => {
    respond({ kind: 'classroom', id: 'c1', name: 'Class', language: 'en' });
    const hook = renderHook(() => useJoinFlow('Q3UQ2J'));
    await waitFor(() => expect(hook.result.current.target?.verdict).toBe('classroom'));
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
