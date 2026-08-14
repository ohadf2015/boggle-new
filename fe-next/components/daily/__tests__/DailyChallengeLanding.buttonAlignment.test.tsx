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
vi.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: vi.fn(() => null),
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'test-fingerprint'),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/en/daily'),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    a: ({ children, className, style, ...props }: React.ComponentProps<'a'> & { animate?: unknown; initial?: unknown; transition?: unknown; whileHover?: unknown; whileTap?: unknown }) => (
      <a className={className} style={style} {...props}>{children}</a>
    ),
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
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock fetch for API calls
global.fetch = vi.fn((url: string) => {
  if (typeof url === 'string' && url.includes('daily-streak')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ streak: 0 }),
    });
  }
  if (typeof url === 'string' && url.includes('daily-challenge/leaderboard')) {
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
    onSelectWordHunt: vi.fn(),
    onSelectWordWheel: vi.fn(),
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
    vi.clearAllMocks();
  });

  it('should render quest card with CTA button', () => {
    renderComponent();

    const wordHuntCard = screen.getByTestId('quest-card-wordHunt');

    expect(wordHuntCard).toBeInTheDocument();

    // CTA buttons should be present (START QUEST for new cards)
    const startButtons = screen.getAllByText(/start quest/i);
    expect(startButtons.length).toBeGreaterThan(0);
  });

  it('should render clickable quest card with role="button"', () => {
    renderComponent();

    const wordHuntCard = screen.getByTestId('quest-card-wordHunt');

    // Quest card should be clickable (role="button")
    expect(wordHuntCard.querySelector('[role="button"]')).toBeTruthy();
  });
});
