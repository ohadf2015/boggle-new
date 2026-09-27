import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * The style picker opened full-screen over a student's "YOU WON! 257 POINTS"
 * round-end recap on a phone — the third auto-opening overlay to bury a payoff
 * moment in this module. Two halves matter and only both together are a fix:
 *
 *  1. it must not open while the quiet zone is up, AND it must not write its
 *     one-shot "shown" marker either — this wrapper marks at SHOW time and
 *     latches for the session, so a marker written during a show nobody saw
 *     suppresses the picker for ever (pitfalls class 1, inverted);
 *  2. it must open once the zone clears. A prompt that never comes back is a
 *     dropped prompt, not a deferred one.
 */

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

let pathname = '/en/leaderboard';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import PlayerStyleOnboardingWrapper from '../PlayerStyleOnboardingWrapper';
import { useGameStore } from '@/hooks/gameState/store';
import {
  OVERLAY_QUIET_ZONE_GRACE_MS,
  claimOverlayQuietZone,
  resetOverlayQuietZoneForTests,
} from '@/lib/overlayQuietZone';

describe('PlayerStyleOnboardingWrapper — overlay quiet zone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().resetAll();
    resetOverlayQuietZoneForTests();
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
    // A route with NO other gate in the way, so these cases fail if the quiet
    // zone is the thing not working (a gameplay route would pass vacuously).
    pathname = '/en/leaderboard';
  });
  afterEach(() => {
    resetOverlayQuietZoneForTests();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    useGameStore.getState().resetAll();
  });

  it('does not open over a round-end recap, and does not burn the one-shot marker', () => {
    const release = claimOverlayQuietZone('classroom-results');
    const { queryByTestId } = render(<PlayerStyleOnboardingWrapper />);
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(queryByTestId('style-popup')).not.toBeInTheDocument();
    expect(markPlayerStyleModalShown).not.toHaveBeenCalled();
    release();
  });

  it('opens once the recap releases the zone and the grace window ends', () => {
    const release = claimOverlayQuietZone('classroom-results');
    const { queryByTestId } = render(<PlayerStyleOnboardingWrapper />);
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(queryByTestId('style-popup')).not.toBeInTheDocument();

    act(() => {
      release();
      vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(queryByTestId('style-popup')).toBeInTheDocument();
    expect(markPlayerStyleModalShown).toHaveBeenCalledTimes(1);
  });
});
