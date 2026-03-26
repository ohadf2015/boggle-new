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
import { getWordHuntStatusToday } from '@/utils/dailyChallenge/storage';

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/en/daily'),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
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

vi.mock('@/utils/dailyChallenge/storage');
vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
}));

const mockGetWordHuntStatusToday = getWordHuntStatusToday as jest.MockedFunction<typeof getWordHuntStatusToday>;

describe('DailyChallengeLanding - Navigation Refresh', () => {
  const mockOnSelectWordHunt = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockGetWordHuntStatusToday.mockReturnValueOnce(null);

      render(
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          currentLanguage="en"
        />
      );

      // WHEN: Initial render shows "new" status (no completion overlay)
      await waitFor(() => {
        // No completion overlay for "new" status
        const completionOverlay = screen.queryByTestId('completion-overlay-wordHunt');
        expect(completionOverlay).not.toBeInTheDocument();
      });

      // WHEN: User completes challenge (localStorage now has completed status)
      // Use mockReturnValue (not mockReturnValueOnce) so ALL future calls return the completed status
      mockGetWordHuntStatusToday.mockReturnValue({ solved: true });

      // WHEN: User navigates back (popstate event)
      const popstateEvent = new PopStateEvent('popstate', { state: {} });
      window.dispatchEvent(popstateEvent);

      // THEN: Completion indicator should appear immediately
      await waitFor(() => {
        // Check for won badge (using data-testid)
        const wonBadge = screen.queryByTestId('won-badge');
        expect(wonBadge).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('THEN should show loss indicator when user fails and navigates back', async () => {
      // GIVEN: Word Hunt is NOT completed initially
      mockGetWordHuntStatusToday.mockReturnValueOnce(null);

      render(
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          currentLanguage="en"
        />
      );

      // WHEN: User fails challenge (localStorage now has failed status)
      // Use mockReturnValue so ALL future calls return the failed status
      mockGetWordHuntStatusToday.mockReturnValue({ solved: false });

      // WHEN: User navigates back (popstate event)
      const popstateEvent = new PopStateEvent('popstate', { state: {} });
      window.dispatchEvent(popstateEvent);

      // THEN: Failed/loss indicator should appear
      await waitFor(() => {
        // Check for lost badge (using data-testid)
        const lostBadge = screen.queryByTestId('lost-badge');
        expect(lostBadge).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('THEN should NOT refresh if localStorage status unchanged', async () => {
      // GIVEN: Word Hunt is completed
      mockGetWordHuntStatusToday.mockReturnValue({ solved: true });

      render(
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          currentLanguage="en"
        />
      );

      // WHEN: User navigates back but status didn't change
      const popstateEvent = new PopStateEvent('popstate', { state: {} });
      window.dispatchEvent(popstateEvent);

      // THEN: getWordHuntStatusToday should have been called multiple times:
      // 1. Initial mount (useEffect #1)
      // 2. Pathname detection (useEffect #2 - pathname='daily')
      // 3. Popstate event (navigation listener)
      await waitFor(() => {
        expect(mockGetWordHuntStatusToday).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('GIVEN multiple navigation events', () => {
    it('THEN should handle rapid back/forward navigation gracefully', async () => {
      mockGetWordHuntStatusToday.mockReturnValue(null);

      render(
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          currentLanguage="en"
        />
      );

      // WHEN: Multiple rapid navigation events
      for (let i = 0; i < 5; i++) {
        const popstateEvent = new PopStateEvent('popstate', { state: {} });
        window.dispatchEvent(popstateEvent);
      }

      // THEN: Should handle without errors
      await waitFor(() => {
        expect(mockGetWordHuntStatusToday).toHaveBeenCalled();
      });
    });
  });
});
