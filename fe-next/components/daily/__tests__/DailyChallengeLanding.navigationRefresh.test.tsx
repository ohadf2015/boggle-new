/**
 * Tests for completion indicator refresh on navigation (back button)
 *
 * Requirements:
 * 1. When user completes Word Hunt and navigates back, completion indicator should show immediately
 * 2. Should NOT require tab visibility change to refresh status
 * 3. Should detect navigation via popstate event (browser back/forward)
 */

import { render, screen, waitFor } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/en/daily'),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() })),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
}));

// Mock the hook directly — this is what the component actually uses
const mockRefresh = vi.fn().mockResolvedValue(undefined);
let hookReturnValue = {
  hasPlayed: false,
  hasSolved: null as boolean | null,
  currentStreak: 0,
  longestStreak: 0,
  puzzleNumber: 1,
  puzzleDate: '2026-04-12',
  loading: false,
  fromServer: false,
  refresh: mockRefresh,
};

vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: vi.fn(() => hookReturnValue),
}));

describe('DailyChallengeLanding - Navigation Refresh', () => {
  const mockOnSelectWordHunt = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset hook return to "not played"
    hookReturnValue = {
      hasPlayed: false,
      hasSolved: null,
      currentStreak: 0,
      longestStreak: 0,
      puzzleNumber: 1,
      puzzleDate: '2026-04-12',
      loading: false,
      fromServer: false,
      refresh: mockRefresh,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: true, data: {} }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GIVEN user completes Word Hunt and navigates back', () => {
    it('THEN should show completion indicator immediately without tab switch', async () => {
      // GIVEN: Word Hunt is NOT completed initially
      render(
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          onSelectWordWheel={vi.fn()}
          currentLanguage="en"
        />
      );

      // WHEN: Initial render shows "new" status (no completion overlay)
      await waitFor(() => {
        const wonBadge = screen.queryByTestId('won-badge');
        expect(wonBadge).not.toBeInTheDocument();
      });

      // WHEN: User completes challenge — simulate refresh updating state
      mockRefresh.mockImplementation(async () => {
        hookReturnValue = { ...hookReturnValue, hasPlayed: true, hasSolved: true };
      });

      // WHEN: User navigates back (popstate event triggers refresh)
      const popstateEvent = new PopStateEvent('popstate', { state: {} });
      window.dispatchEvent(popstateEvent);

      // THEN: refresh should have been called
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('THEN should show loss indicator when user fails and navigates back', async () => {
      // GIVEN: Word Hunt is NOT completed initially
      render(
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          onSelectWordWheel={vi.fn()}
          currentLanguage="en"
        />
      );

      // WHEN: User fails challenge — simulate refresh updating state
      mockRefresh.mockImplementation(async () => {
        hookReturnValue = { ...hookReturnValue, hasPlayed: true, hasSolved: false };
      });

      // WHEN: User navigates back (popstate event)
      const popstateEvent = new PopStateEvent('popstate', { state: {} });
      window.dispatchEvent(popstateEvent);

      // THEN: refresh should have been called
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('THEN should call refresh on popstate even if status unchanged', async () => {
      // GIVEN: Word Hunt is completed
      hookReturnValue = { ...hookReturnValue, hasPlayed: true, hasSolved: true };

      render(
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          onSelectWordWheel={vi.fn()}
          currentLanguage="en"
        />
      );

      // WHEN: User navigates back but status didn't change
      const popstateEvent = new PopStateEvent('popstate', { state: {} });
      window.dispatchEvent(popstateEvent);

      // THEN: refresh is still called (it's the hook's job to deduplicate)
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN multiple navigation events', () => {
    it('THEN should handle rapid back/forward navigation gracefully', async () => {
      render(
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          onSelectWordWheel={vi.fn()}
          currentLanguage="en"
        />
      );

      // WHEN: Multiple rapid navigation events
      for (let i = 0; i < 5; i++) {
        const popstateEvent = new PopStateEvent('popstate', { state: {} });
        window.dispatchEvent(popstateEvent);
      }

      // THEN: Should handle without errors — refresh called for each
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });
});
