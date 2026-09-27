import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  getPendingDailyResult: vi.fn(),
  clearPendingDailyResult: vi.fn(),
  getGuestDailyPlayer: vi.fn(() => Promise.resolve(null)),
  setWinnerOnboarding: vi.fn(),
}));

vi.mock('@/utils/profileStorage', () => ({
  getStoredProfile: vi.fn(() => ({ username: null, avatarId: null })),
  hasCompleteStoredProfile: vi.fn(() => false),
  clearStoredProfile: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/supabase', () => ({
  updateProfile: vi.fn(() => Promise.resolve({ error: null })),
}));

vi.mock('@/utils/avatarConfig', () => ({
  getAvatarEmojiAndColor: vi.fn(() => ({ emoji: '🎯', color: '#000' })),
}));

vi.mock('@/utils/posthogEngagement', () => ({
  trackDailySignupRank: vi.fn(),
}));

import { getPendingDailyResult, clearPendingDailyResult } from '@/utils/dailyChallenge';
import toast from 'react-hot-toast';
import { trackDailySignupRank } from '@/utils/posthogEngagement';
import { usePendingDailyResult } from '../usePendingDailyResult';

const makeProfile = (overrides = {}) => ({
  id: 'user-1',
  display_name: 'TestPlayer',
  username: 'testplayer',
  has_customized_profile: true,
  avatar_emoji: '🎯',
  avatar_color: '#000',
  avatar_image: null,
  ...overrides,
});

const makePending = (lang = 'en') => ({
  puzzleDate: '2026-05-13',
  puzzleNumber: 42,
  language: lang,
  trigger: null,
  savedAt: Date.now(),
  result: {
    solved: true,
    attemptsUsed: 3,
    targetWord: 'HELLO',
    attempts: [],
  },
});

describe('usePendingDailyResult — redirect + celebration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPendingDailyResult).mockReturnValue(makePending() as never);
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) } as Response),
    );
  });

  it('redirects to /<lang>/daily?showLeaderboard=true on success', async () => {
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(mockPush).toHaveBeenCalledWith('/en/daily?showLeaderboard=true');
  });

  it('uses the language from the pending result for the redirect', async () => {
    vi.mocked(getPendingDailyResult).mockReturnValue(makePending('he') as never);
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(mockPush).toHaveBeenCalledWith('/he/daily?showLeaderboard=true');
  });

  it('fires a success toast on successful submission', async () => {
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(toast.success).toHaveBeenCalled();
  });

  it('does not redirect when submission fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, text: () => Promise.resolve('error') } as Response),
    );
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not fire success toast when submission fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, text: () => Promise.resolve('error') } as Response),
    );
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('always clears pending result regardless of success or failure', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, text: () => Promise.resolve('error') } as Response),
    );
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(clearPendingDailyResult).toHaveBeenCalledOnce();
  });

  it('does not redirect when there is no pending result', async () => {
    vi.mocked(getPendingDailyResult).mockReturnValue(null);
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(mockPush).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

const mockFetchWithStats = (yourStats: object | null) => {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if ((url as string).includes('/stats/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ yourStats }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);
  });
};

describe('usePendingDailyResult — rank achievement copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPendingDailyResult).mockReturnValue(makePending() as never);
  });

  it('toasts with rank1 key when player is #1', async () => {
    mockFetchWithStats({ rank: 1, percentile: 99, solved: true, attemptsUsed: 3 });
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(vi.mocked(toast.success).mock.calls[0][0]).toContain('daily.achievementRank1');
  });

  it('toasts with topTen key when rank exists and percentile >= 90', async () => {
    mockFetchWithStats({ rank: 5, percentile: 92, solved: true, attemptsUsed: 2 });
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(vi.mocked(toast.success).mock.calls[0][0]).toContain('daily.achievementTopTen');
  });

  it('toasts with ranked key when rank exists and percentile < 90', async () => {
    mockFetchWithStats({ rank: 15, percentile: 60, solved: true, attemptsUsed: 3 });
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(vi.mocked(toast.success).mock.calls[0][0]).toContain('daily.achievementRanked');
  });

  it('falls back to youreOnTheBoard when stats returns no rank', async () => {
    mockFetchWithStats(null);
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(vi.mocked(toast.success).mock.calls[0][0]).toBe('daily.youreOnTheBoard');
  });

  it('falls back to youreOnTheBoard when stats fetch throws', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/stats/')) return Promise.reject(new Error('network'));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);
    });
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(vi.mocked(toast.success).mock.calls[0][0]).toBe('daily.youreOnTheBoard');
  });

  it('fires trackDailySignupRank with rank and percentile on success', async () => {
    mockFetchWithStats({ rank: 3, percentile: 85, solved: true, attemptsUsed: 2 });
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(trackDailySignupRank).toHaveBeenCalledWith({
      rank: 3,
      percentile: 85,
      puzzleDate: '2026-05-13',
      language: 'en',
    });
  });

  it('fires trackDailySignupRank with undefined rank when stats unavailable', async () => {
    mockFetchWithStats(null);
    const { result } = renderHook(() => usePendingDailyResult());
    await act(() => result.current.submitPendingDailyResult('user-1', makeProfile()));
    expect(trackDailySignupRank).toHaveBeenCalledWith({
      rank: undefined,
      percentile: 0,
      puzzleDate: '2026-05-13',
      language: 'en',
    });
  });
});
