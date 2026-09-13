/**
 * Word Tower is HIDDEN from the daily hub (Ohad product directive 2026-09-13).
 *
 * It used to render as quest 3 — first through the generic registry card, then
 * with the shared `QuestCard` box next to Word Hunt and Word Wheel, counting in
 * the /4 progress bar. The mode is now off every consumer surface: no quest
 * card, no hero row, and the hub progress denominator drops back to the three
 * visible quests (Word Hunt + Word Wheel + Connections). The /daily/word-tower
 * route itself stays alive for direct links — this guards the hub only.
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

describe('DailyChallengeLanding — Word Tower hidden from the hub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) }));
  });

  it('renders NO Word Tower card in any form (quest card, hero row, or registry card)', async () => {
    renderHub();
    // Wait for the hub to settle on its real cards first so a bare "absent"
    // assertion can't pass on an unfinished render.
    await waitFor(() => {
      expect(screen.getByTestId('quest-card-wordHunt')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('quest-card-wordTower')).not.toBeInTheDocument();
    expect(screen.queryByTestId('daily-quest-card-word-tower')).not.toBeInTheDocument();
    expect(screen.queryByTestId('word-tower-hero')).not.toBeInTheDocument();
  });

  it('still renders the three visible quests: Word Hunt, Word Wheel, Connections', async () => {
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId('quest-card-wordHunt')).toBeInTheDocument();
    });
    expect(screen.getByTestId('quest-card-wordWheel')).toBeInTheDocument();
    expect(await screen.findByTestId('daily-quest-card-connections')).toBeInTheDocument();
  });

  it('counts only the three visible quests in the progress bar (/3, tower out of the denominator)', async () => {
    renderHub();
    const bar = await screen.findByTestId('xp-progress-bar');
    // Word Hunt + Word Wheel + Connections. Word Tower used to make this /4.
    expect(bar).toHaveAttribute('aria-valuemax', '3');
  });

  it('no rendered link points at the Word Tower routes', async () => {
    const { container } = renderHub();
    await waitFor(() => {
      expect(screen.getByTestId('quest-card-wordHunt')).toBeInTheDocument();
    });
    const hrefs = Array.from(container.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.includes('word-tower'))).toBe(false);
  });
});
