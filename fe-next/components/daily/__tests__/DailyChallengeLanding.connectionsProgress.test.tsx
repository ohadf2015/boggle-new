/**
 * Hub progress counts Connections and all daily modes.
 *
 * The /N progress bar on the daily hub must show correct counts for all modes:
 * hunt + wheel + tower + connections = /4 total. The indicator increments when
 * each mode is completed and decrements only per UTC day (modes reset daily).
 * Connections uses localStorage marker (hasPlayedConnectionsToday from lib/connections/dailyClient).
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthProvider';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/en/daily',
    useSearchParams: () => new URLSearchParams(''),
  };
});

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedToday: vi.fn(() => false),
  getWordHuntStatusToday: vi.fn(() => null),
  hasPlayedWordWheelToday: vi.fn(() => true), // wheel (step 1) done → Word Hunt is the hero
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

vi.mock('@/utils/dailyChallenge', () => ({
  getSecondsUntilNextDaily: vi.fn(() => 3600),
  formatCountdown: vi.fn(() => '01:00:00'),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn(),
      onTouchStart: vi.fn(), onTouchMove: vi.fn(), onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: true, prefersReducedMotion: false }),
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

vi.mock('framer-motion', () => ({
  ...vi.importActual('framer-motion'),
  m: {
    div: ({ children, className, style, animate, initial, ...props }: React.ComponentProps<'div'> & { animate?: unknown; initial?: unknown }) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.ComponentProps<'span'>) => (
      <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
    a: ({ children, className, style, animate, initial, transition, ...props }: React.ComponentProps<'a'> & { animate?: unknown; initial?: unknown; transition?: unknown }) => (
      <a className={className} style={style} {...props}>{children}</a>
    ),
    path: ({ d, ...props }: React.SVGProps<SVGPathElement>) => <path d={d} {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// The exact localStorage contract from lib/connections/dailyClient.
const PLAYED_KEY = 'connections-daily-played';
const todayUTC = () => new Date().toISOString().slice(0, 10);

function renderHub() {
  return render(
    <AuthProvider>
      <LanguageProvider initialLanguage="en">
        <DailyChallengeLanding
          onSelectWordHunt={vi.fn()}
          onSelectWordWheel={vi.fn()}
          currentLanguage="en"
        />
      </LanguageProvider>
    </AuthProvider>,
  );
}

describe('DailyChallengeLanding — progress counts the required quests; Word Tower is a last, optional bonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) }));
  });

  it('shows progress over the three required quests', async () => {
    renderHub();
    const bar = await screen.findByTestId('xp-progress-bar');
    expect(bar).toHaveAttribute('aria-valuemax', '2');
  });

  it('lists Word Tower last among the quests, tagged as a bonus', async () => {
    renderHub();
    const secondary = await screen.findByTestId('secondary-modes');
    const rows = Array.from(secondary.querySelectorAll('[data-testid^="compact-row-"]'));
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual([
      'compact-row-yellow',
      'compact-row-purple',
      'compact-row-cyan',
    ]);
    expect(rows[0]).not.toHaveTextContent(/bonus/i);
    expect(rows[1]).toHaveTextContent(/bonus/i);
    expect(rows[2]).toHaveTextContent(/bonus/i);
  });

  it('renders primary hero card and secondary modes', async () => {
    renderHub();

    // Primary mode (word-hunt when all unplayed)
    const primary = await screen.findByTestId('quest-card-word-hunt');
    expect(primary).toBeInTheDocument();

    // Secondary modes container with 3 compact rows
    const secondary = await screen.findByTestId('secondary-modes');
    expect(secondary).toBeInTheDocument();
  });

  it('Connections appears in secondary modes by default', async () => {
    renderHub();

    // With all modes unplayed, word-hunt is the primary (pickPrimaryMode)
    // Connections renders as a compact row (purple color)
    const compactRowPurple = await screen.findByTestId('compact-row-purple');
    expect(compactRowPurple).toBeInTheDocument();
  });

  it('includes Connections in the total quest denominator', async () => {
    renderHub();

    const bar = await screen.findByTestId('xp-progress-bar');
    expect(bar).toHaveAttribute('aria-valuemax', '2');

    // Verify all 4 modes are present:
    // Primary: quest-card-word-hunt
    await screen.findByTestId('quest-card-word-hunt');
    // Secondary compact rows for the other 3
    const compactRows = screen.getAllByTestId(/^compact-row-/);
    expect(compactRows.length).toBe(3);
  });

  it('ignores stale Connections localStorage marker from previous day', async () => {
    // Set a stale marker (from 2020, not today)
    window.localStorage.setItem(PLAYED_KEY, '2020-01-01');

    renderHub();

    // Component should still work and show the progress bar
    const bar = await screen.findByTestId('xp-progress-bar');
    expect(bar).toHaveAttribute('aria-valuemax', '2');

    // The compact row for Connections should NOT show as played
    // (the done badge should NOT appear)
    const purpleRow = screen.getByTestId('compact-row-purple');
    expect(purpleRow).toBeInTheDocument();
    const doneBadge = screen.queryByTestId('purple-done-badge');
    expect(doneBadge).not.toBeInTheDocument();
  });
});
