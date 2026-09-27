/**
 * usePracticeProgress.startSession — authed path returns the session id.
 *
 * PATCH /api/education/practice (session completion) needs the id the POST
 * created. `startSession` read `result.session` off the POST response and
 * then discarded it, returning only `{ success: true }` — nothing downstream
 * had a session id to complete, so solo practice never finished and students
 * got 0 XP forever. See CompletePracticeSessionData.sessionId in
 * PracticeSessionProvider.tsx for the consumer of this value.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { usePracticeProgress } from '../usePracticeSession';

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePracticeProgress.startSession — authed', () => {
  it('GIVEN the server creates a session WHEN startSession resolves THEN it returns that session id', async () => {
    stubFetch({ session: { id: 'session-abc', student_id: 's1', lesson_id: 'lesson-1' } });
    const { result } = renderHook(() => usePracticeProgress('lesson-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; sessionId?: string } | undefined;
    await act(async () => {
      outcome = await result.current.startSession('flashcard');
    });

    expect(outcome?.success).toBe(true);
    expect(outcome?.sessionId).toBe('session-abc');
  });

  it('GIVEN the server refuses to start a session WHEN startSession resolves THEN no session id is returned', async () => {
    stubFetch({ error: 'Not authorized to practice this lesson' }, false);
    const { result } = renderHook(() => usePracticeProgress('lesson-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; sessionId?: string } | undefined;
    await act(async () => {
      outcome = await result.current.startSession('flashcard');
    });

    expect(outcome?.success).toBe(false);
    expect(outcome?.sessionId).toBeUndefined();
  });
});

describe('usePracticeProgress.startSession — Word Craft variant', () => {
  it('GIVEN the wordcraft variant WHEN a solo_board session starts THEN the POST carries variant so the row records mode=wordcraft', async () => {
    const fetchMock = stubFetch({ session: { id: 'session-wc' } });
    const { result } = renderHook(() => usePracticeProgress('lesson-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startSession('solo_board', { variant: 'wordcraft' });
    });

    const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse((post?.[1] as RequestInit).body as string)).toEqual({
      lessonId: 'lesson-1',
      practiceType: 'solo_board',
      variant: 'wordcraft',
    });
  });
});
