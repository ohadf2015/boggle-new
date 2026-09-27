/**
 * Test: Challenge quest cards should render properly with new hero + compact layout
 *
 * After redesign: one primary hero card + three compact secondary rows.
 * Layout is no longer grid-based with equal heights — each card type has its own sizing.
 */

import { render, screen } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/daily',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock Image component
vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock hooks
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

// Mock framer-motion to avoid animation delays
vi.mock('framer-motion', () => ({
  m: {
    a: ({ children, className, style, ...props }: React.ComponentProps<'a'> & { animate?: unknown; initial?: unknown; transition?: unknown; whileHover?: unknown; whileTap?: unknown }) => (
      <a className={className} style={style} {...props}>{children}</a>
    ),
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    span: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
    path: 'path',
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock fetch for API calls
global.fetch = vi.fn((url: string) => {
  if (typeof url === 'string' && url.includes('daily-streak')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ streak: 0 }) });
  }
  if (typeof url === 'string' && url.includes('daily-challenge/leaderboard')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ available: true, data: { played: false } }),
  });
}) as jest.Mock;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <LanguageProvider>{children}</LanguageProvider>
  </AuthProvider>
);

describe('DailyChallengeLanding - Quest Card Layout', () => {
  const mockProps = {
    onSelectWordHunt: vi.fn(),
    onSelectWordWheel: vi.fn(),
    currentLanguage: 'en' as const,
  };

  it('should render primary hero quest card (word-hunt when unplayed)', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    // With all modes unplayed, pickPrimaryMode selects word-hunt
    expect(screen.getByTestId('quest-card-word-hunt')).toBeInTheDocument();
  });

  it('should render three secondary compact rows', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    // After redesign, the secondary modes render as compact rows
    // There should be 3 secondary rows (all except the primary)
    const compactRows = screen.getAllByTestId(/^compact-row-/);
    expect(compactRows.length).toBe(3);
  });

  it('should NOT constrain primary card to a fixed height — sizing is flexible', () => {
    render(
      <Wrapper>
        <DailyChallengeLanding {...mockProps} />
      </Wrapper>
    );

    const wordHuntCard = screen.getByTestId('quest-card-word-hunt');

    // Under the new design, the primary card is sized by its content + optional image,
    // not by a fixed min-height rule that forces all cards equal.
    // The old rule was a grid constraint; this checks it's not there.
    expect(wordHuntCard.className).not.toMatch(/\bmin-h-\[420px\]/);
  });
});
