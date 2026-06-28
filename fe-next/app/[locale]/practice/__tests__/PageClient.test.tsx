import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PracticeHubClient from '@/app/[locale]/practice/PageClient';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { savePendingRoomInvite } from '@/utils/onboardingStorage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: () => {} }),
}));
vi.mock('@/utils/haptics', () => ({ haptics: { tap: () => {} } }));

// Spy on the in-game lever. The hub flips isInGame=true so the body scroll-locks
// (no page scroll) and the footer + bottom-nav hide — a focused mode-select.
const mockSetIsInGame = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => mockSetIsInGame,
}));

// A non-zero streak so any lingering streak chip would actually render —
// proves the chip is gone by design, not just hidden by a zero-state guard.
vi.mock('@/hooks/usePracticeStreak', () => ({
  usePracticeStreak: () => ({ current: 5, longest: 5 }),
  getPracticeStreak: () => ({ current: 5, longest: 5 }),
}));

// Mutable completed-set so individual tests can simulate progress.
const mockCompleted = { current: new Set<string>() };
vi.mock('@/components/practice/usePracticeProgress', () => ({
  usePracticeProgress: () => mockCompleted.current,
}));

beforeEach(() => {
  // Mark FTUE complete so the gate lets the hub render in tests.
  window.localStorage.setItem('lexiclash_onboarding_completed', 'true');
  mockCompleted.current = new Set();
  sessionStorage.clear();
  mockSetIsInGame.mockClear();
});

const wrap = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('PracticeHubClient invite banner', () => {
  it('shows PendingRoomBanner when invite pending', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('pending-room-banner')).toBeInTheDocument();
  });

  it('hides banner when no invite', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.queryByTestId('pending-room-banner')).not.toBeInTheDocument();
  });
});

describe('PracticeHubClient tutorial simplification', () => {
  it('offers a clear way back to the homepage', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('practice-hub-back')).toHaveAttribute('href', '/en');
  });

  it('does not show a streak chip — the tutorial just teaches, it is not scored play', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.queryByTestId('practice-streak-chip')).toBeNull();
  });

  it('renders an incomplete mode as a clickable link', () => {
    wrap(<PracticeHubClient locale="en" />);
    const tile = screen.getByTestId('practice-tile-classic');
    expect(tile.tagName).toBe('A');
    expect(tile).toHaveAttribute('href', '/en/practice/classic');
  });

  it('renders a completed mode as a replayable link (tapping a finished mode replays it, never a dead no-op)', () => {
    // Root-cause fix for rage-clicks: completed tiles used to be inert <div>s, so
    // a player who finished a mode and tapped it again got ZERO response. It now
    // links back into the mode with ?play=1 (skip the tutorial they already saw).
    mockCompleted.current = new Set(['classic']);
    wrap(<PracticeHubClient locale="en" />);
    const tile = screen.getByTestId('practice-tile-classic');
    expect(tile.tagName).toBe('A');
    expect(tile).toHaveAttribute('href', '/en/practice/classic?play=1');
    expect(tile).toHaveAttribute('data-complete', 'true');
  });

  it('flags the next mode to play so the path through the tutorial is obvious', () => {
    mockCompleted.current = new Set(['classic']);
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('practice-tile-wordHunt')).toHaveAttribute('data-next', 'true');
    expect(screen.getByTestId('practice-tile-classic')).toHaveAttribute('data-next', 'false');
  });
});

describe('PracticeHubClient completed-tile celebration', () => {
  it('renders a finished mode as a celebratory, REPLAYABLE trophy card — not a dead no-op tile', () => {
    mockCompleted.current = new Set(['classic']);
    wrap(<PracticeHubClient locale="en" />);
    const tile = screen.getByTestId('practice-tile-classic');
    // Replayable (a finished mode that does nothing on tap = rage-click bait).
    expect(tile.tagName).toBe('A');
    expect(tile).toHaveAttribute('data-complete', 'true');
    // Satisfying, not greyed-out: no dimming, and a trophy badge celebrates it.
    expect(tile.className).not.toContain('opacity-80');
    expect(within(tile).getByTestId('practice-tile-trophy-classic')).toBeInTheDocument();
  });
});

describe('PracticeHubClient all-complete celebration', () => {
  beforeEach(() => {
    mockCompleted.current = new Set(['classic', 'wordHunt', 'wheelRush']);
  });

  it('shows the all-complete celebration once every mode is finished', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('practice-all-complete')).toBeInTheDocument();
  });

  it('gives players a clear button CTA into the real game (homepage)', () => {
    wrap(<PracticeHubClient locale="en" />);
    const cta = screen.getByTestId('practice-all-complete-cta');
    expect(cta.tagName).toBe('A');
    expect(cta).toHaveAttribute('href', '/en');
  });

  it('does not style the celebration message itself as a button (no solid hard-shadow fill)', () => {
    // The headline used to be a filled bg-neo-cozy box with a hard shadow, which
    // read as a tappable button. The celebration message must look like a banner,
    // not a CTA — the only button is the real-game CTA below it.
    wrap(<PracticeHubClient locale="en" />);
    const celebration = screen.getByTestId('practice-all-complete');
    expect(celebration.className).not.toContain('bg-neo-cozy');
    expect(celebration.className).not.toContain('shadow-hard');
  });

  it('hides the celebration while any mode is still incomplete', () => {
    mockCompleted.current = new Set(['classic']);
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.queryByTestId('practice-all-complete')).toBeNull();
    expect(screen.queryByTestId('practice-all-complete-cta')).toBeNull();
  });
});

describe('PracticeHubClient focused-screen chrome', () => {
  it('flips isInGame=true on mount so the hub scroll-locks and drops the footer', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(mockSetIsInGame).toHaveBeenCalledWith(true);
  });

  it('restores isInGame=false on unmount so chrome returns when leaving practice', () => {
    const { unmount } = wrap(<PracticeHubClient locale="en" />);
    mockSetIsInGame.mockClear();
    unmount();
    expect(mockSetIsInGame).toHaveBeenCalledWith(false);
  });

  it('does not page-scroll: the root fills its locked parent instead of min-h-[100dvh]', () => {
    const { container } = wrap(<PracticeHubClient locale="en" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('min-h-[100dvh]');
    expect(root.className).toContain('h-full');
  });
});

describe('PracticeHubClient first-time welcome', () => {
  it('greets a brand-new player with the welcome banner (no modes complete)', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('practice-hub-welcome')).toBeInTheDocument();
  });

  it('retires the welcome banner once any mode is complete', () => {
    mockCompleted.current = new Set(['classic']);
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.queryByTestId('practice-hub-welcome')).toBeNull();
  });
});
