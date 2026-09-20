/**
 * Tests for Daily Challenge hub button structure after redesign
 *
 * Verifies that the hub renders CTA buttons properly after redesign:
 * - One primary hero card (selected by pickPrimaryMode)
 * - Three secondary compact rows
 * Both must be clickable and have proper button states.
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

vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({
  getGuestFingerprint: vi.fn(() => Promise.resolve('test-fingerprint')),
}));

vi.mock('@/lib/connections/dailyClient', () => ({
  hasPlayedConnectionsToday: vi.fn(() => false),
}));

vi.mock('@/lib/wordTower/dailyBest', () => ({
  isDailyTowerPlayed: vi.fn(() => false),
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

vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({
    loading: false,
    hasPlayed: false,
    hasSolved: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({
    loading: false,
    today: {
      wordHunt: false,
      wordWheel: false,
      wordTower: false,
      connections: false,
    },
    streak: { current: 0, best: 0 },
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

  it('should render primary hero card with CTA button', () => {
    renderComponent();

    // In new design, the primary mode is selected by pickPrimaryMode
    // With all modes unplayed, word-hunt is the primary
    const wordHuntCard = screen.getByTestId('quest-card-word-hunt');
    expect(wordHuntCard).toBeInTheDocument();

    // CTA buttons should be present (START QUEST for new cards)
    const startButtons = screen.getAllByText(/start quest/i);
    expect(startButtons.length).toBeGreaterThan(0);
  });

  it('should render secondary compact rows with play buttons', () => {
    renderComponent();

    // Secondary modes should render as compact rows
    const secondaryModes = screen.getByTestId('secondary-modes');
    expect(secondaryModes).toBeInTheDocument();

    // There should be 3 secondary rows (all modes except the primary)
    const compactRows = screen.getAllByTestId(/^compact-row-/);
    expect(compactRows.length).toBe(3);
  });

  it('should render clickable primary card with role="button"', () => {
    renderComponent();

    const wordHuntCard = screen.getByTestId('quest-card-word-hunt');
    // Quest card should be clickable (role="button")
    expect(wordHuntCard.querySelector('[role="button"]')).toBeTruthy();
  });
});
