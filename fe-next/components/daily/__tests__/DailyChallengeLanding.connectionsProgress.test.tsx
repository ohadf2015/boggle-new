/**
 * Hub progress counts Connections (slice 3b of the 2026-09-13 directive).
 *
 * The /N progress bar on the daily hub must increment when today's Connections
 * (Word Bridge) daily is done — the marker is the same localStorage key both
 * connections daily flavors write on their terminal screens
 * (markConnectionsPlayedToday in lib/connections/dailyClient), read back via
 * hasPlayedConnectionsToday. Denominator stays /3 (hunt + wheel + connections;
 * Word Tower is hidden — see DailyChallengeLanding.wordTowerHidden.test.tsx).
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

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
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'test-fingerprint'),
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

describe('DailyChallengeLanding — Connections counts in hub progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) }));
  });

  it('starts at 0/3 when nothing was played today', async () => {
    renderHub();
    const bar = await screen.findByTestId('xp-progress-bar');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
    // aria-valuenow is the percent (see DailyMissionsHeader); the visible
    // label is the honest completedCount/total.
    await screen.findByText('0/3');
  });

  it('increments to 1/3 when today\'s Connections daily is marked played', async () => {
    window.localStorage.setItem(PLAYED_KEY, todayUTC());
    renderHub();
    const bar = await screen.findByTestId('xp-progress-bar');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
    // connectionsPlayed resolves in an effect after mount — wait for the flip.
    await screen.findByText('1/3');
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '33'));
  });

  it('ignores a stale Connections marker from a previous day', async () => {
    window.localStorage.setItem(PLAYED_KEY, '2020-01-01');
    renderHub();
    await screen.findByText('0/3');
    // Give the mount effect a beat to (not) flip the count.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('marks the Connections quest card played when the marker is set', async () => {
    window.localStorage.setItem(PLAYED_KEY, todayUTC());
    renderHub();
    const card = await screen.findByTestId('daily-quest-card-connections');
    expect(card).toBeInTheDocument();
  });
});
