/**
 * Word Tower is a PUBLIC daily quest — rendered with the SAME `QuestCard` box as
 * Word Hunt and Word Wheel, and wired into the quest chain the same way.
 *
 * Two regressions are guarded here:
 *  1. The original one: the card was rendered ONLY from `adminOnlyDailyModes()`
 *     behind `canSeeInWorkModes`, so every ordinary player saw a two-card hub.
 *  2. The follow-up: Word Tower rendered through the generic `DailyModeQuestCard`
 *     (a hard-nav `<a>` at `/word-tower?daily=1`), so it read as a detached
 *     afterthought instead of quest 3. It now uses `QuestCard` + `router.push`
 *     at `/daily/word-tower`, exactly like its two siblings.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

const mockPush = vi.fn();

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
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

describe('DailyChallengeLanding — Word Tower is a first-class daily quest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) }));
  });

  it('renders Word Tower in the same QuestCard box as Word Hunt and Word Wheel', async () => {
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId('quest-card-wordTower')).toBeInTheDocument();
    });
    // Same component as its two siblings — not the generic registry card.
    expect(screen.getByTestId('quest-card-wordHunt')).toBeInTheDocument();
    expect(screen.getByTestId('quest-card-wordWheel')).toBeInTheDocument();
  });

  it('no longer renders Word Tower through the generic hard-nav registry card', async () => {
    renderHub();
    await screen.findByTestId('quest-card-wordTower');
    expect(screen.queryByTestId('daily-quest-card-word-tower')).not.toBeInTheDocument();
  });

  it('routes to the daily Word Tower run via the SPA router', async () => {
    const user = userEvent.setup();
    renderHub();
    const card = await screen.findByTestId('quest-card-wordTower');
    await user.click(within(card).getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/en/daily/word-tower');
  });

  it('counts Word Tower as the third quest in the progress bar', async () => {
    renderHub();
    const bar = await screen.findByTestId('xp-progress-bar');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
  });

  it('renders the Word Tower box at exactly the size of its two siblings', async () => {
    renderHub();
    await screen.findByTestId('quest-card-wordTower');

    // The visible box is the inner role="button"; its class list carries every
    // size rule (min-h, padding, flex direction). Comparing the full string is
    // deliberate — "same size" regressions here come from a card silently taking
    // a different QuestCard branch (variant/preview), which shows up as a class
    // diff long before it shows up as a pixel diff any jsdom test could measure.
    const boxClasses = (id: string) => {
      const root = screen.getByTestId(`quest-card-${id}`);
      return (root.querySelector('[role="button"]') as HTMLElement).className;
    };

    expect(boxClasses('wordTower')).toBe(boxClasses('wordHunt'));
    expect(boxClasses('wordTower')).toBe(boxClasses('wordWheel'));
    expect(boxClasses('wordTower')).toContain('min-h-[170px]');
    expect(boxClasses('wordTower')).toContain('md:min-h-[130px]');
  });

  it('does NOT tag the public card as beta, and hides admin-only modes', async () => {
    renderHub();
    const card = await screen.findByTestId('quest-card-wordTower');
    expect(card.textContent).not.toMatch(/beta/i);
    expect(screen.queryByTestId('daily-quest-card-connections')).not.toBeInTheDocument();
  });
});
