import { renderHook, waitFor } from '@testing-library/react';
import { useResultSubmission } from '../useResultSubmission';
import type { WordHuntResult } from '@/utils/dailyChallenge';

const mockFetch = vi.fn();
const publishLevelUp = vi.fn();
const onSubmitSuccess = vi.fn();

vi.mock('@/utils/dailyChallenge', () => ({
  getTodaysWordHuntResult: vi.fn().mockReturnValue(null),
  markWordHuntResultSubmitted: vi.fn(),
}));
vi.mock('@/hooks/useNetworkState', () => ({ useNetworkState: () => ({ online: true }) }));
vi.mock('@/hooks/useOfflineModeFlag', () => ({ useOfflineModeFlag: () => false }));
vi.mock('@/lib/offline/scoreQueue', () => ({ enqueueScore: vi.fn() }));
vi.mock('@/lib/offline', () => ({ getOfflineStore: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }) }));
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp: (...a: unknown[]) => publishLevelUp(...a) }));

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

function render() {
  renderHook(() =>
    useResultSubmission({
      result,
      puzzleNumber: 100,
      puzzleDate: '2025-01-19',
      language: 'en',
      isNewCompletion: true,
      guestFingerprint: null,
      isAuthenticated: true,
      profile: { id: 'user-1', username: 'u', display_name: 'U' },
      guestPlayer: null,
      countryCodeReady: true,
      onSubmitSuccess,
    }),
  );
}

describe('useResultSubmission level-up', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    publishLevelUp.mockReset();
    onSubmitSuccess.mockReset();
  });

  it('announces the level-up the submit response carries', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, levelUp: { oldLevel: 3, newLevel: 4 } }) });
    render();
    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalled());
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 3, newLevel: 4 }, 'dailyWordHunt');
  });

  it('announces nothing when the response has no level-up', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    render();
    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalled());
    expect(publishLevelUp).not.toHaveBeenCalled();
  });
});
