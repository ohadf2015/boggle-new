/**
 * Tests for useShareHandlers - challenge share functionality
 * RED phase: written before implementation of handleChallengeShare
 */

import { renderHook, act } from '@testing-library/react';
import { useShareHandlers } from '../useShareHandlers';
import type { WordHuntResult, GuestDailyPlayer } from '@/utils/dailyChallenge';

// Mock generateWordHuntShareableResult and image utilities
vi.mock('@/utils/dailyChallenge', () => ({
  generateWordHuntShareableResult: vi.fn().mockReturnValue('Shared result text'),
}));

vi.mock('@/utils/dailyShareImage', () => ({
  generateDailyShareImage: vi.fn(),
  downloadDailyShareImage: vi.fn(),
}));

const mockShare = vi.fn();
Object.defineProperty(window, 'navigator', {
  value: { share: mockShare },
  writable: true,
});

const mockResult: WordHuntResult = {
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en',
  solved: true,
  attemptsUsed: 3,
  targetWord: 'PLANT',
  attempts: [],
  streakDays: 5,
  completedAt: '2026-02-22T10:00:00.000Z',
  efficiencyScore: 87,
};

const baseProps = {
  result: mockResult,
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en' as const,
  displayName: 'TestPlayer',
  avatarEmoji: '🌟',
  stats: null,
  isAuthenticated: false,
  profile: null,
  guestPlayer: null as GuestDailyPlayer | null,
  t: (key: string) => {
    const map: Record<string, string> = {
      'wordHunt.title': 'Word Hunt',
      'wordHunt.gauntlet.shareText': 'Can you beat my score of {score}? Challenge from {name}!',
    };
    return map[key] ?? key;
  },
};

describe('useShareHandlers - challenge share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns handleChallengeShare function', () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    expect(typeof result.current.handleChallengeShare).toBe('function');
  });

  it('returns challengeUrl string', () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    expect(typeof result.current.challengeUrl).toBe('string');
  });

  it('challenge URL contains whChallenger param', async () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    mockShare.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleChallengeShare();
    });

    expect(mockShare).toHaveBeenCalled();
    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.url).toContain('whChallenger=');
    expect(callArg.url).toContain('whChallengeScore=');
  });

  it('challenge URL contains the correct challenger name', async () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    mockShare.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleChallengeShare();
    });

    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.url).toContain('whChallenger=TestPlayer');
  });

  it('challenge URL contains whChallengeScore with efficiencyScore', async () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    mockShare.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleChallengeShare();
    });

    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.url).toContain('whChallengeScore=87');
  });

  it('challenge URL contains whChallengeEmoji param', async () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    mockShare.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleChallengeShare();
    });

    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.url).toContain('whChallengeEmoji=');
  });

  it('challenge URL contains whChallengeDate param', async () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    mockShare.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleChallengeShare();
    });

    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.url).toContain('whChallengeDate=2026-02-22');
  });

  it('calls navigator.share with title and text', async () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    mockShare.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleChallengeShare();
    });

    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.title).toBeDefined();
    expect(callArg.text).toBeDefined();
    expect(callArg.url).toBeDefined();
  });

  it('falls back to setShowSharePanel when navigator.share is unavailable', async () => {
    // Remove share from navigator
    Object.defineProperty(window, 'navigator', {
      value: {},
      writable: true,
    });

    const { result } = renderHook(() => useShareHandlers(baseProps));

    await act(async () => {
      await result.current.handleChallengeShare();
    });

    // showSharePanel should be true after fallback
    expect(result.current.showSharePanel).toBe(true);

    // Restore navigator.share for other tests
    Object.defineProperty(window, 'navigator', {
      value: { share: mockShare },
      writable: true,
    });
  });

  it('does not throw when navigator.share rejects (user cancel)', async () => {
    Object.defineProperty(window, 'navigator', {
      value: { share: mockShare },
      writable: true,
    });
    mockShare.mockRejectedValue(new Error('AbortError'));

    const { result } = renderHook(() => useShareHandlers(baseProps));

    await expect(
      act(async () => {
        await result.current.handleChallengeShare();
      })
    ).resolves.not.toThrow();
  });

  it('challengeUrl includes language segment', () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));
    expect(result.current.challengeUrl).toContain('/en/daily');
  });
});
