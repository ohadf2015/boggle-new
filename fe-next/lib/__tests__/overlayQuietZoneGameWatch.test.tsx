/**
 * The race this closes: a round ends, an auto-opening prompt starts its 800ms
 * timer, and the recap that would claim the quiet zone is still a `next/dynamic`
 * chunk in flight. Whoever wins decides whether a modal lands on a child's
 * podium — and for the style picker the loss is permanent, because it marks
 * itself shown at show time and latches for the session.
 *
 * So the zone has to open on the game-over transition itself, not on a mount.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useOverlayQuietZoneGameWatch } from '../overlayQuietZoneGameWatch';
import {
  OVERLAY_QUIET_ZONE_GRACE_MS,
  isOverlayQuietZoneActive,
  resetOverlayQuietZoneForTests,
} from '../overlayQuietZone';
import { useGameStore } from '@/hooks/gameState/store';

describe('useOverlayQuietZoneGameWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().resetAll();
    resetOverlayQuietZoneForTests();
  });
  afterEach(() => {
    resetOverlayQuietZoneForTests();
    useGameStore.getState().resetAll();
    vi.useRealTimers();
  });

  it('stays out of the way on a page where no game was ever played', () => {
    renderHook(() => useOverlayQuietZoneGameWatch());
    expect(isOverlayQuietZoneActive()).toBe(false);
  });

  it('opens the zone the moment a live game ends, before anything claims it', () => {
    renderHook(() => useOverlayQuietZoneGameWatch());
    act(() => {
      useGameStore.setState({ gameActive: true });
    });
    act(() => {
      useGameStore.setState({ gameActive: false });
    });

    expect(isOverlayQuietZoneActive()).toBe(true);
  });

  it('closes it again after the grace window if no recap takes over', () => {
    renderHook(() => useOverlayQuietZoneGameWatch());
    act(() => {
      useGameStore.setState({ gameActive: true });
    });
    act(() => {
      useGameStore.setState({ gameActive: false });
    });

    act(() => {
      vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    });
    expect(isOverlayQuietZoneActive()).toBe(false);
  });

  it('also opens it while results are still being computed', () => {
    renderHook(() => useOverlayQuietZoneGameWatch());
    act(() => {
      useGameStore.setState({ waitingForResults: true });
    });
    expect(isOverlayQuietZoneActive()).toBe(true);
  });
});
