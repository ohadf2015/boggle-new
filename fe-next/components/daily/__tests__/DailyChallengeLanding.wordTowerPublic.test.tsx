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

  it('renders Word Tower as a first-class daily quest (primary QuestCard or secondary CompactModeRow)', async () => {
    renderHub();
    await waitFor(() => {
      // Word Tower is reachable as either a primary hero card (quest-card-word-tower)
      // or as a secondary CompactModeRow (compact-row-cyan, where cyan is its color).
      // At least one rendering must exist to confirm it's part of the daily quest chain.
      const heroCard = screen.queryByTestId('quest-card-word-tower');
      const compactRow = screen.queryByTestId('compact-row-cyan');
      expect(heroCard || compactRow).toBeTruthy();
    });
    // The three main daily quests are always reachable, whether as hero or compact
    const primaryOrHeroWordHunt =
      screen.queryByTestId('quest-card-word-hunt') ||
      screen.queryByTestId('compact-row-orange');
    expect(primaryOrHeroWordHunt).toBeInTheDocument();
  });

  it('renders Word Tower with the shared QuestCard (or CompactModeRow), not the generic registry card', async () => {
    renderHub();
    // Word Tower now uses the shared quest-card-word-tower testid (primary)
    // or compact-row-cyan testid (secondary), not the legacy DailyModeQuestCard
    const heroCard = screen.queryByTestId('quest-card-word-tower');
    const compactRow = screen.queryByTestId('compact-row-cyan');
    expect(heroCard || compactRow).toBeInTheDocument();
    // Confirm the generic registry card is NOT used for Word Tower
    expect(screen.queryByTestId('daily-quest-card-word-tower')).not.toBeInTheDocument();
  });

  it('routes to the daily Word Tower run via the SPA router', async () => {
    const user = userEvent.setup();
    renderHub();
    // Word Tower is either a primary hero card or a secondary compact row
    const heroCard = screen.queryByTestId('quest-card-word-tower');
    const compactRow = screen.queryByTestId('compact-row-cyan');
    const card = heroCard || compactRow;

    expect(card).toBeInTheDocument();
    // Click the button (either within the card or the button itself)
    const button = card?.querySelector('button');
    expect(button).toBeInTheDocument();
    await user.click(button!);
    expect(mockPush).toHaveBeenCalledWith('/en/daily/word-tower');
  });

  it('counts all four public quests in the progress bar', async () => {
    renderHub();
    await waitFor(() => {
      const bar = screen.getByTestId('xp-progress-bar');
      // Word Hunt + Word Wheel + Word Tower + Connections (graduated from beta).
      expect(bar).toHaveAttribute('aria-valuemax', '4');
    });
  });

  it('renders Word Tower as a public quest (reachable as primary or secondary)', async () => {
    renderHub();
    // Word Tower is reachable as a QuestCard (if primary) or CompactModeRow (if secondary).
    // The layout changed from "four equal cards" to "one hero + three compact rows",
    // so geometry assertions are no longer valid. Instead, verify Word Tower is
    // present and functional (button exists, not hidden, not broken).
    const heroCard = screen.queryByTestId('quest-card-word-tower');
    const compactRow = screen.queryByTestId('compact-row-cyan');

    expect(heroCard || compactRow).toBeInTheDocument();

    // If it's a hero card, verify it has the QuestCard structure
    if (heroCard) {
      const button = heroCard.querySelector('[role="button"]');
      expect(button).toBeInTheDocument();
      expect(button).toContain('min-h-[170px]');
    } else if (compactRow) {
      // If it's a compact row, verify it has the row structure
      const button = compactRow.querySelector('button');
      expect(button).toBeInTheDocument();
    }
  });

  it('renders Connections as a public quest (no BETA tag)', async () => {
    renderHub();
    // Connections graduated from the admin-gated registry card to a public
    // daily quest — present for ordinary players, no BETA tag.
    // It may render as a primary hero card (quest-card-connections) or
    // as a secondary compact row (compact-row-purple).
    await waitFor(() => {
      const heroCard = screen.queryByTestId('quest-card-connections');
      const compactRow = screen.queryByTestId('compact-row-purple');
      const legacyCard = screen.queryByTestId('daily-quest-card-connections');

      // At least one must be present
      expect(heroCard || compactRow || legacyCard).toBeInTheDocument();
    });

    // Verify no BETA tag is present (legacy registry card specific check)
    const legacyCard = screen.queryByTestId('daily-quest-card-connections');
    if (legacyCard) {
      expect(legacyCard.textContent).not.toMatch(/beta/i);
    }
  });
});
