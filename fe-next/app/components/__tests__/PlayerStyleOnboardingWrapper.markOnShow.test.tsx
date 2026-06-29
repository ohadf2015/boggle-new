import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mutable test doubles so each case can reshape auth / storage / route.
const markPlayerStyleModalShown = vi.fn();
const hasPlayerStyleModalBeenShown = vi.fn(() => false);
const getStoredPlayerStyle = vi.fn(() => null as string | null);
const updateProfile = vi.fn(async () => ({ error: null }));

let auth = {
  isAuthenticated: false,
  profile: null as null | { player_style: string | null; player_style_modal_shown_at: string | null },
  needsProfileCustomization: false,
  updateProfile,
  loading: false,
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));
vi.mock('@/lib/playerStyle/playerStyleStorage', () => ({
  getStoredPlayerStyle: () => getStoredPlayerStyle(),
  hasPlayerStyleModalBeenShown: () => hasPlayerStyleModalBeenShown(),
  markPlayerStyleModalShown: () => markPlayerStyleModalShown(),
}));
// FTUE gate: the popup only surfaces to players who have played ≥1 game.
vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => ({ userStats: { totalGamesPlayed: 1 }, isLoading: false }),
}));
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = () => <div data-testid="style-popup" />;
    Stub.displayName = 'PlayerStyleModalStub';
    return Stub;
  },
}));

let pathname = '/en/practice';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import PlayerStyleOnboardingWrapper from '../PlayerStyleOnboardingWrapper';
import { useGameStore } from '@/hooks/gameState/store';

function renderAndSettle() {
  render(<PlayerStyleOnboardingWrapper />);
  act(() => {
    vi.advanceTimersByTime(900); // mount effect + 800ms settle timer
  });
}

describe('PlayerStyleOnboardingWrapper — mark on show + migrate on login', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().resetAll();
    markPlayerStyleModalShown.mockClear();
    hasPlayerStyleModalBeenShown.mockReturnValue(false);
    getStoredPlayerStyle.mockReturnValue(null);
    updateProfile.mockClear();
    auth = {
      isAuthenticated: false,
      profile: null,
      needsProfileCustomization: false,
      updateProfile,
      loading: false,
    };
    // A non-gameplay in-app screen: the popup may surface here at once (no
    // results gate), keeping these mark-on-show cases independent of game state.
    pathname = '/en/leaderboard';
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    useGameStore.getState().resetAll();
  });

  it('writes the device-level "shown" flag the moment the popup is shown (not on dismiss)', () => {
    // The abandon path: a user who sees the popup then reloads / closes the tab
    // without clicking never reaches dismiss. Marking at show-time is what stops
    // the popup re-appearing on the next page load.
    renderAndSettle();
    expect(markPlayerStyleModalShown).toHaveBeenCalledTimes(1);
  });

  it('does NOT burn the one-shot when the decision lands on the marketing landing route', () => {
    // show=true but the wrapper renders null on /en — marking here would suppress
    // the popup forever for a user who never actually saw it.
    pathname = '/en';
    renderAndSettle();
    expect(markPlayerStyleModalShown).not.toHaveBeenCalled();
  });

  it('migrates the device flag to the account on login so it never re-pops cross-device', async () => {
    // Guest dismissed on device A (localStorage flag only). On login the authed
    // `player_style_modal_shown_at` column is still null → backfill it so another
    // device, which has no localStorage flag, also stays suppressed.
    hasPlayerStyleModalBeenShown.mockReturnValue(true);
    auth = {
      isAuthenticated: true,
      profile: { player_style: null, player_style_modal_shown_at: null },
      needsProfileCustomization: false,
      updateProfile,
      loading: false,
    };
    renderAndSettle();
    await act(async () => {});
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ player_style_modal_shown_at: expect.any(String) }),
    );
  });

  it('does not re-write the profile column when it is already set', async () => {
    hasPlayerStyleModalBeenShown.mockReturnValue(true);
    auth = {
      isAuthenticated: true,
      profile: { player_style: null, player_style_modal_shown_at: '2026-06-12T00:00:00Z' },
      needsProfileCustomization: false,
      updateProfile,
      loading: false,
    };
    renderAndSettle();
    await act(async () => {});
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
