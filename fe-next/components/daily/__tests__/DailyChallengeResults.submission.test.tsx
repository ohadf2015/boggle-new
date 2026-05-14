/**
 * Tests for DailyChallengeResults score submission
 *
 * Bug: Authenticated users were not able to submit scores to leaderboard
 * because the submission logic incorrectly required guestFingerprint for all users.
 *
 * Root cause: Line `const canSubmit = isNewCompletion && result && guestFingerprint && ...`
 * The `&& guestFingerprint` applies to ALL users, but authenticated users have profile.id
 * and should NOT need guestFingerprint.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Mock ResultsBannerSlot (added in 2026-05-05; pulls in useAdMob)
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));

// Mock useDevicePerformance
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: false,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <span {...props}>{children}</span>,
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<unknown>) => <>{children}</>,
  useReducedMotion: () => false,
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: () => {},
    on: () => () => {},
  }),
  useTransform: (_mv: any, fn: (v: number) => number) => ({
    get: () => fn(0),
    on: (_event: string, cb: (v: number) => void) => { cb(fn(0)); return () => {}; },
  }),
  animate: () => ({ stop: () => {} }),
}));

// Mock ResultsWinnerBanner dependencies
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => false,
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => null,
}));

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: () => null,
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
  fireRankConfetti: vi.fn(),
}));


vi.mock('@/components/ads/RewardedAdGoldButton', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: any) => children,
}));

// Mock share image utilities
vi.mock('@/utils/shareImageGenerator', () => ({
  shareImageWithNativeShare: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/utils/dailyShareImage', () => ({
  generateDailyShareImage: vi.fn().mockResolvedValue({ dataUrl: 'data:image/png;base64,test' }),
  downloadDailyShareImage: vi.fn(),
}));

// Mock dailyChallenge utilities
const mockGetGuestFingerprint = vi.fn().mockResolvedValue('test-guest-fingerprint');
const mockGetGuestDailyPlayer = vi.fn().mockResolvedValue({
  displayName: 'Test Guest',
  avatarEmoji: '🎯',
  avatarColor: '#6366f1',
});

vi.mock('@/utils/dailyChallenge', () => ({
  generateShareableResult: vi.fn().mockReturnValue('Test share text'),
  getGuestFingerprint: (...args: unknown[]) => mockGetGuestFingerprint(...args),
  getGuestDailyPlayer: (...args: unknown[]) => mockGetGuestDailyPlayer(...args),
}));

// Mock storage
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedToday: vi.fn().mockReturnValue(false),
  getWordHuntStatusToday: vi.fn().mockReturnValue(null), // null = not played yet
}));

// Mock NextStepPrompt
vi.mock('@/components/results/NextStepPrompt', () => {
  const MockNextStepPrompt = () => {
    return <div data-testid="next-step-prompt">Next Step</div>;
  };
  return { default: MockNextStepPrompt };
});

// Mock DailyLeaderboard
vi.mock('../DailyLeaderboard', () => ({
  default: function MockDailyLeaderboard({ onCurrentUserRankChange, onParticipantCountChange }: {
    onCurrentUserRankChange?: (rank: number | null) => void;
    onParticipantCountChange?: (count: number) => void;
  }) {
    React.useEffect(() => {
      onCurrentUserRankChange?.(5);
      onParticipantCountChange?.(100);
    }, [onCurrentUserRankChange, onParticipantCountChange]);
    return <div data-testid="daily-leaderboard">Leaderboard</div>;
  },
}));

// Mock useAuth - will be overridden per test
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    status: 'idle',
    isAdAvailable: false,
    isPlaceholderCooldown: false,
    showAd: vi.fn().mockResolvedValue(undefined),
    error: null,
    rewardAmount: 0,
    canShowAd: false,
    viewsToday: 0,
    maxViews: 3,
    isDailyLimitReached: false,
    isPlaceholder: false,
  }),
}));

import DailyChallengeResults from '../DailyChallengeResults';
import type { DailyChallengeResult, DailyStreak } from '@/utils/dailyChallenge';

describe('DailyChallengeResults score submission', () => {
  const mockResult: DailyChallengeResult = {
    puzzleDate: '2025-01-19',
    puzzleNumber: 100,
    language: 'en',
    score: 500,
    wordCount: 15,
    wordsByLength: { '3': 5, '4': 5, '5': 3, '6': 2 },
    timeSeconds: 120,
    streakDays: 5,
  };

  const mockStreak: DailyStreak = {
    currentStreak: 5,
    longestStreak: 10,
    lastPlayedDate: '2025-01-18',
    totalDailiesCompleted: 50,
  };

  const mockT = (key: string): string => key;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default MSW handlers
    server.use(
      http.get('*/api/geolocation*', () => HttpResponse.json({ countryCode: 'US' })),
      http.post('*/api/daily-challenge/submit*', () =>
        HttpResponse.json({ success: true, rank: 5 })
      )
    );
  });

  describe('Authenticated user submission', () => {
    const authenticatedProfile = {
      id: 'user-123-uuid',
      username: 'ohad',
      display_name: 'Ohad Fisher',
      avatar_emoji: '🏆',
      avatar_color: '#FFD700',
      avatar_image: null,
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        profile: authenticatedProfile,
      });
    });

    it('should submit score for authenticated user even when guestFingerprint NEVER loads (BUG FIX)', async () => {
      // GIVEN: getGuestFingerprint NEVER resolves (simulates blocked fingerprint scenario)
      mockGetGuestFingerprint.mockReturnValue(new Promise(() => {}));

      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post('*/api/daily-challenge/submit*', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ success: true, rank: 5 });
        })
      );

      render(
        <DailyChallengeResults
          result={mockResult}
          streak={mockStreak}
          streakMilestone={null}
          words={['TEST', 'WORD']}
          longestWord="TEST"
          countdown="23:59:59"
          isNewCompletion={true}
          onBack={vi.fn()}
          t={mockT}
        />
      );

      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      }, { timeout: 2000 });

      expect(capturedBody!.playerId).toBe('user-123-uuid');
      expect(capturedBody!.displayName).toBe('Ohad Fisher');
      expect(capturedBody!.avatarEmoji).toBe('🏆');
      expect(capturedBody!.score).toBe(500);
      expect(capturedBody!.guestFingerprint).toBeNull();
    });

    it('should include null guestFingerprint for authenticated users', async () => {
      mockGetGuestFingerprint.mockResolvedValue('some-fingerprint');

      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post('*/api/daily-challenge/submit*', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ success: true, rank: 5 });
        })
      );

      render(
        <DailyChallengeResults
          result={mockResult}
          streak={mockStreak}
          streakMilestone={null}
          words={['TEST']}
          longestWord="TEST"
          countdown="23:59:59"
          isNewCompletion={true}
          onBack={vi.fn()}
          t={mockT}
        />
      );

      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      }, { timeout: 3000 });

      expect(capturedBody!.playerId).toBe('user-123-uuid');
      expect(capturedBody!.guestFingerprint).toBeNull();
    });
  });

  describe('Guest user submission', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        profile: null,
      });
    });

    it('should submit score for guest user with guestFingerprint', async () => {
      mockGetGuestFingerprint.mockResolvedValue('guest-fp-12345');
      mockGetGuestDailyPlayer.mockResolvedValue({
        displayName: 'Test Guest',
        avatarEmoji: '🎯',
        avatarColor: '#6366f1',
      });

      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post('*/api/daily-challenge/submit*', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ success: true, rank: 5 });
        })
      );

      render(
        <DailyChallengeResults
          result={mockResult}
          streak={mockStreak}
          streakMilestone={null}
          words={['TEST']}
          longestWord="TEST"
          countdown="23:59:59"
          isNewCompletion={true}
          onBack={vi.fn()}
          t={mockT}
        />
      );

      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      }, { timeout: 3000 });

      expect(capturedBody!.playerId).toBeNull();
      expect(capturedBody!.guestFingerprint).toBe('guest-fp-12345');
    });
  });

  describe('No submission for already-played', () => {
    it('should NOT submit when isNewCompletion is false', async () => {
      // GIVEN: User viewing already-played results
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        profile: { id: 'user-123', display_name: 'Test' },
      });
      mockGetGuestFingerprint.mockResolvedValue('fingerprint');

      // WHEN: Rendering with isNewCompletion=false
      render(
        <DailyChallengeResults
          result={mockResult}
          streak={mockStreak}
          streakMilestone={null}
          words={['TEST']}
          longestWord="TEST"
          countdown="23:59:59"
          isNewCompletion={false}
          onBack={vi.fn()}
          t={mockT}
        />
      );

      // THEN: No submission should be made
      let submitCalled = false;
      server.use(
        http.post('*/api/daily-challenge/submit*', () => {
          submitCalled = true;
          return HttpResponse.json({ success: true });
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(submitCalled).toBe(false);
    });
  });
});
