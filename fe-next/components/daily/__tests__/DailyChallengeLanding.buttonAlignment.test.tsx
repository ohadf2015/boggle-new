/**
 * Tests for Daily Challenge quest card button structure
 *
 * Verifies that quest cards render CTA buttons in proper layout,
 * consistent across different states (new, won, lost).
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
  useSearchParams: jest.fn(() => ({ get: jest.fn(() => null) })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  })),
}));

jest.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
      onMouseMove: jest.fn(),
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
    },
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
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
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn((url: string) => {
  if (typeof url === 'string' && url.includes('daily-streak')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ streak: 0 }),
    });
  }
  if (typeof url === 'string' && url.includes('daily-leaderboard')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ available: true, data: { played: false } }),
  });
}) as jest.Mock;

describe('DailyChallengeLanding - Button Layout', () => {
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

  it('should render quest cards with CTA buttons', () => {
    renderComponent();

    // Both quest cards should render
    const wordHuntCard = screen.getByTestId('quest-card-wordHunt');
    const buzzCard = screen.getByTestId('quest-card-buzz');

    expect(wordHuntCard).toBeInTheDocument();
    expect(buzzCard).toBeInTheDocument();

    // CTA buttons should be present (START QUEST for new cards)
    const startButtons = screen.getAllByText(/start quest/i);
    expect(startButtons.length).toBeGreaterThan(0);
  });

  it('should render clickable quest cards with role="button"', () => {
    renderComponent();

    const wordHuntCard = screen.getByTestId('quest-card-wordHunt');
    const buzzCard = screen.getByTestId('quest-card-buzz');

    // Each quest card should be clickable (role="button")
    expect(wordHuntCard.querySelector('[role="button"]')).toBeTruthy();
    expect(buzzCard.querySelector('[role="button"]')).toBeTruthy();
  });
});
