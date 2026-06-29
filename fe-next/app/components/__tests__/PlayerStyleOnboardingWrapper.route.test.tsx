import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Guest who finished onboarding but hasn't seen the style popup → shouldShowStylePopup → true.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    profile: null,
    needsProfileCustomization: false,
    updateProfile: vi.fn(),
    loading: false,
  }),
}));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));
vi.mock('@/lib/playerStyle/playerStyleStorage', () => ({
  getStoredPlayerStyle: () => null,
  hasPlayerStyleModalBeenShown: () => false,
  markPlayerStyleModalShown: vi.fn(),
}));
// The modal is dynamically imported — stub it so we just detect render.
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = () => <div data-testid="style-popup" />;
    Stub.displayName = 'PlayerStyleModalStub';
    return Stub;
  },
}));

// FTUE gate: the popup only surfaces once the player has ≥1 game under their
// belt. These route-gate tests are all about a returning/post-game user, so
// report a played game; without this every "should show" case is suppressed by
// the FTUE gate before the route logic under test is reached.
vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => ({ userStats: { totalGamesPlayed: 1 }, isLoading: false }),
}));

let pathname = '/en/practice';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import PlayerStyleOnboardingWrapper from '../PlayerStyleOnboardingWrapper';
import { useGameStore } from '@/hooks/gameState/store';

describe('PlayerStyleOnboardingWrapper route gate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().resetAll();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    useGameStore.getState().resetAll();
  });

  function renderAndSettle() {
    render(<PlayerStyleOnboardingWrapper />);
    // Mount effect + the 800ms settle timer that decides `show`.
    act(() => {
      vi.advanceTimersByTime(900);
    });
  }

  it('does NOT render the style popup on the marketing landing route', () => {
    pathname = '/en';
    renderAndSettle();
    expect(screen.queryByTestId('style-popup')).not.toBeInTheDocument();
  });

  it('does NOT render the style popup on an SEO/education landing page', () => {
    // Reported: the full-screen popup buried the /education hero for search
    // visitors. Education is an SEO doorway, not an in-app route.
    pathname = '/en/education/esl-word-games';
    renderAndSettle();
    expect(screen.queryByTestId('style-popup')).not.toBeInTheDocument();
  });

  it('does NOT render on a gameplay route before a game is played (pre-game/lobby)', () => {
    // The "wrong moment" fix: on /practice etc. the popup must not open over the
    // pre-game setup. It waits for the game to finish (results screen).
    pathname = '/en/practice';
    renderAndSettle();
    expect(screen.queryByTestId('style-popup')).not.toBeInTheDocument();
  });

  it('renders on a gameplay route once a game has ended (results screen)', () => {
    pathname = '/en/practice';
    render(<PlayerStyleOnboardingWrapper />);
    act(() => {
      vi.advanceTimersByTime(900); // pre-game decision → stays hidden
    });
    expect(screen.queryByTestId('style-popup')).not.toBeInTheDocument();
    // A game is played, then ends → results screen is the natural break.
    act(() => {
      useGameStore.getState().setGameActive(true);
    });
    act(() => {
      useGameStore.getState().setGameActive(false);
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByTestId('style-popup')).toBeInTheDocument();
  });

  it('renders on a non-gameplay in-app screen when idle (menu/leaderboard)', () => {
    // Off gameplay routes the user is already at rest — nothing to interrupt — so
    // the popup may surface without waiting for a results screen.
    pathname = '/en/leaderboard';
    renderAndSettle();
    expect(screen.getByTestId('style-popup')).toBeInTheDocument();
  });

  it('does NOT render while a game is actively being played', () => {
    pathname = '/en/multiplayer';
    render(<PlayerStyleOnboardingWrapper />);
    act(() => {
      useGameStore.getState().setGameActive(true);
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.queryByTestId('style-popup')).not.toBeInTheDocument();
  });

  it('does NOT render when a style is already stored locally (e.g. /daily after picking)', async () => {
    pathname = '/en/daily';
    const storage = await import('@/lib/playerStyle/playerStyleStorage');
    vi.spyOn(storage, 'getStoredPlayerStyle').mockReturnValue('rock');
    renderAndSettle();
    expect(screen.queryByTestId('style-popup')).not.toBeInTheDocument();
  });
});
