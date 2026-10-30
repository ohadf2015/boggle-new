import { renderHook, waitFor } from '@testing-library/react';
import { useResultSubmission } from '../useResultSubmission';
import type { WordHuntResult } from '@/utils/dailyChallenge';

const mockFetch = vi.fn();
const getSession = vi.fn();

vi.mock('@/utils/dailyChallenge', () => ({
  getTodaysWordHuntResult: vi.fn().mockReturnValue(null),
  markWordHuntResultSubmitted: vi.fn(),
}));
vi.mock('@/hooks/useNetworkState', () => ({ useNetworkState: () => ({ online: true }) }));
vi.mock('@/hooks/useOfflineModeFlag', () => ({ useOfflineModeFlag: () => false }));
vi.mock('@/lib/offline/scoreQueue', () => ({ enqueueScore: vi.fn() }));
vi.mock('@/lib/offline', () => ({ getOfflineStore: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { getSession } }) }));

const result = {
  puzzleNumber: 100,
  puzzleDate: '2025-01-19',
  language: 'en',
  solved: true,
  attemptsUsed: 1,
  targetWord: 'TESTS',
  attempts: [{ word: 'TESTS', feedback: [], timestamp: 1 }],
  streakDays: 0,
  completedAt: '2025-01-19T00:00:00.000Z',
} as unknown as WordHuntResult;

const profile = { id: 'user-1', username: 'u', display_name: 'U' };

function render(isAuthenticated: boolean) {
  renderHook(() =>
    useResultSubmission({
      result,
      puzzleNumber: 100,
      puzzleDate: '2025-01-19',
      language: 'en',
      isNewCompletion: true,
      guestFingerprint: isAuthenticated ? null : 'fp',
      isAuthenticated,
      profile: isAuthenticated ? profile : null,
      guestPlayer: null,
      countryCodeReady: true,
      onSubmitSuccess: vi.fn(),
    }),
  );
}

function submitHeaders() {
  const call = mockFetch.mock.calls.find((c) => c[0] === '/api/daily-challenge/word-hunt/submit');
  return call?.[1]?.headers as Record<string, string> | undefined;
}

describe('useResultSubmission auth header', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    getSession.mockReset();
  });

  it('given a signed-in session, when the result is submitted, then the bearer token is sent', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
    render(true);
    await waitFor(() => expect(submitHeaders()).toBeDefined());
    expect(submitHeaders()?.Authorization).toBe('Bearer tok-123');
  });

  it('given the session lookup throws, when submitted, then it still submits without the header', async () => {
    getSession.mockRejectedValue(new Error('storage blocked'));
    render(true);
    await waitFor(() => expect(submitHeaders()).toBeDefined());
    expect(submitHeaders()?.Authorization).toBeUndefined();
  });

  it('given a guest, when submitted, then no session lookup or header happens', async () => {
    render(false);
    await waitFor(() => expect(submitHeaders()).toBeDefined());
    expect(getSession).not.toHaveBeenCalled();
    expect(submitHeaders()?.Authorization).toBeUndefined();
  });
});
