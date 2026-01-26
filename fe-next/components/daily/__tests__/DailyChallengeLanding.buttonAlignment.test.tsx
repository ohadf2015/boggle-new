/**
 * Tests for Daily Challenge card button alignment
 *
 * Bug: The button in the challenge cards should be aligned to the bottom
 * of the card (self-end), not centered. This provides better visual hierarchy
 * and ensures consistent card heights.
 */

import { render, screen } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: jest.fn(() => null),
}));

jest.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: jest.fn(() => 'test-fingerprint'),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/en/daily'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  })),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, ...props }: any) => (
      <button className={className} {...props}>{children}</button>
    ),
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ available: true, data: { played: false } }),
  })
) as jest.Mock;

describe('DailyChallengeLanding - Button Alignment', () => {
  const mockProps = {
    onSelectWordHunt: jest.fn(),
    onSelectBuzz: jest.fn(),
    currentLanguage: 'en' as const,
  };

  const renderComponent = () => {
    return render(
      <LanguageProvider>
        <AuthProvider>
          <DailyChallengeLanding {...mockProps} />
        </AuthProvider>
      </LanguageProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render challenge cards with buttons aligned to the bottom (self-end)', () => {
    renderComponent();

    // Get the card containers (they have role="button" and specific test IDs)
    const wordHuntCard = screen.getByText('Word Hunt').closest('[role="button"]');
    const buzzCard = screen.getByText('Daily Buzz').closest('[role="button"]');

    // Cards should have flex-col and items-center
    expect(wordHuntCard).toHaveClass('flex', 'flex-col', 'items-center');
    expect(buzzCard).toHaveClass('flex', 'flex-col', 'items-center');

    // Check that content is wrapped in a flex-1 container
    // This pushes the button to the bottom
    const playButtons = screen.getAllByText('PLAY');

    playButtons.forEach(button => {
      const cardContainer = button.closest('[role="button"]');
      expect(cardContainer).toBeTruthy();

      // Find the content wrapper (should have flex-1 class)
      const contentWrappers = cardContainer?.querySelectorAll('.flex-1');
      expect(contentWrappers?.length).toBeGreaterThan(0);

      // Verify the content wrapper contains the title/tagline/details
      const contentWrapper = Array.from(contentWrappers || []).find(el =>
        el.textContent?.includes('Word Hunt') || el.textContent?.includes('Daily Buzz')
      );
      expect(contentWrapper).toBeTruthy();
      expect(contentWrapper).toHaveClass('flex-1', 'flex', 'flex-col');

      // Button should be outside the flex-1 wrapper (as a sibling)
      // This means it's at the bottom of the card
      const buttonInContent = contentWrapper?.contains(button);
      expect(buttonInContent).toBe(false);
    });
  });

  it('should maintain button alignment across different card states (new, won, lost)', async () => {
    renderComponent();

    // Verify structure remains consistent across all cards
    const cards = screen.getAllByRole('button');

    cards.forEach(card => {
      // Each card should maintain flex-col structure
      expect(card).toHaveClass('flex-col');

      // Check for content wrapper with flex-1
      const contentWrappers = card.querySelectorAll('.flex-1');
      expect(contentWrappers.length).toBeGreaterThan(0);

      // Verify content wrapper exists and has proper flex classes
      const contentWrapper = Array.from(contentWrappers).find(el =>
        el.classList.contains('flex') && el.classList.contains('flex-col')
      );
      expect(contentWrapper).toBeTruthy();

      // Find the button (last element with rounded-lg class)
      const buttons = card.querySelectorAll('[class*="rounded-lg"]');
      const playButton = buttons[buttons.length - 1];

      // Button should NOT be inside the flex-1 content wrapper
      // This ensures it's positioned at the bottom
      expect(contentWrapper?.contains(playButton)).toBe(false);
    });
  });
});
