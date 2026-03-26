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

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useDevicePerformance
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: false,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
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


// Mock RewardedAdButton (uses ThemeProvider internally)
vi.mock('@/components/ads/RewardedAdButton', () => ({
  RewardedAdButton: ({ children }: any) => children || null,
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
vi.mock('../DailyLeaderboard', () => {
  return { default: function MockDailyLeaderboard({ onCurrentUserRankChange, onParticipantCountChange }: {
    onCurrentUserRankChange?: (rank: number | null) => void;
    onParticipantCountChange?: (count: number) => void;
  }) {
    React.useEffect(() => {
      onCurrentUserRankChange?.(5);
      onParticipantCountChange?.(100);
    }, [onCurrentUserRankChange, onParticipantCountChange]);
    return <div data-testid="daily-leaderboard">Leaderboard</div>;
  }
});

// Mock useAuth - will be overridden per test
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
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
    mockFetch.mockReset();

    // Default: successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/geolocation') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ countryCode: 'US' }),
        });
      }
      if (url === '/api/daily-challenge/submit') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, rank: 5 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
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
      // This is the exact bug Ohad experienced - authenticated users should NOT need fingerprint
      mockGetGuestFingerprint.mockReturnValue(new Promise(() => {
        // Never resolves - simulates ad blocker blocking fingerprint or timeout
      }));

      // WHEN: Rendering results with isNewCompletion=true for authenticated user
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

      // THEN: Score should STILL be submitted with playerId (not guestFingerprint)
      // BUG: Before fix, this would NEVER happen because canSubmit required guestFingerprint
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/daily-challenge/submit',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }, { timeout: 2000 });

      // Verify the submission includes playerId
      const submitCall = mockFetch.mock.calls.find(
        (call) => call[0] === '/api/daily-challenge/submit'
      );
      expect(submitCall).toBeDefined();

      const body = JSON.parse(submitCall[1].body);
      expect(body.playerId).toBe('user-123-uuid');
      expect(body.displayName).toBe('Ohad Fisher');
      expect(body.avatarEmoji).toBe('🏆');
      expect(body.score).toBe(500);
      // For authenticated users, guestFingerprint should be null
      expect(body.guestFingerprint).toBeNull();
    });

    it('should include null guestFingerprint for authenticated users', async () => {
      // GIVEN: Authenticated user with profile
      mockGetGuestFingerprint.mockResolvedValue('some-fingerprint');

      // WHEN: Rendering results
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

      // THEN: Submission should have playerId and null guestFingerprint
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/daily-challenge/submit',
          expect.anything()
        );
      }, { timeout: 3000 });

      const submitCall = mockFetch.mock.calls.find(
        (call) => call[0] === '/api/daily-challenge/submit'
      );
      const body = JSON.parse(submitCall[1].body);

      expect(body.playerId).toBe('user-123-uuid');
      expect(body.guestFingerprint).toBeNull();
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
      // GIVEN: Guest user with fingerprint
      mockGetGuestFingerprint.mockResolvedValue('guest-fp-12345');
      mockGetGuestDailyPlayer.mockResolvedValue({
        displayName: 'Test Guest',
        avatarEmoji: '🎯',
        avatarColor: '#6366f1',
      });

      // WHEN: Rendering results for guest
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

      // THEN: Score should be submitted with guestFingerprint
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/daily-challenge/submit',
          expect.anything()
        );
      }, { timeout: 3000 });

      const submitCall = mockFetch.mock.calls.find(
        (call) => call[0] === '/api/daily-challenge/submit'
      );
      const body = JSON.parse(submitCall[1].body);

      expect(body.playerId).toBeNull();
      expect(body.guestFingerprint).toBe('guest-fp-12345');
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
      await new Promise((resolve) => setTimeout(resolve, 500));

      const submitCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === '/api/daily-challenge/submit'
      );
      expect(submitCalls).toHaveLength(0);
    });
  });
});
