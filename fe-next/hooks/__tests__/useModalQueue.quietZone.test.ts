import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalQueue } from '../useModalQueue';
import {
  OVERLAY_QUIET_ZONE_GRACE_MS,
  claimOverlayQuietZone,
  resetOverlayQuietZoneForTests,
} from '@/lib/overlayQuietZone';

/**
 * Every post-game modal on the results screen is serialised through this queue —
 * the SHOW OFF / share prompt included. Gating here rather than at each call
 * site keeps `ResultsPage.tsx` (1494 lines, not ours to grow) untouched: its
 * `showShareModal` state stays true, only the DISPLAY waits.
 *
 * The suppression must land on `activeModalId` and nowhere near `isReady`:
 * zeroing the ready count trips the queue's own "new game cycle" reset, which
 * would clear `dismissedIds` and re-open a modal the user had already closed.
 */
describe('useModalQueue — overlay quiet zone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetOverlayQuietZoneForTests();
  });
  afterEach(() => {
    resetOverlayQuietZoneForTests();
    vi.useRealTimers();
  });

  const modals = [{ id: 'share', priority: 4, isReady: true }];

  it('shows the share prompt when nothing is being covered', () => {
    const { result } = renderHook(() => useModalQueue({ modals }));
    expect(result.current.activeModalId).toBe('share');
  });

  it('holds the share prompt back while a round-end recap owns the screen', () => {
    const release = claimOverlayQuietZone('classroom-results');
    const { result } = renderHook(() => useModalQueue({ modals }));
    expect(result.current.activeModalId).toBeNull();
    release();
  });

  it('releases it once the zone clears — deferred, not dropped', () => {
    const release = claimOverlayQuietZone('classroom-results');
    const { result } = renderHook(() => useModalQueue({ modals }));
    expect(result.current.activeModalId).toBeNull();

    act(() => {
      release();
      vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    });

    expect(result.current.activeModalId).toBe('share');
  });

  it('does not resurrect a modal the user already dismissed', () => {
    const { result } = renderHook(() => useModalQueue({ modals }));
    act(() => result.current.dismiss('share'));
    expect(result.current.activeModalId).toBeNull();

    const release = claimOverlayQuietZone('classroom-results');
    act(() => {
      release();
      vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    });

    expect(result.current.activeModalId).toBeNull();
  });

  // MP results keep `screen-fit-locked` on <body> for the whole results screen,
  // so the zone never clears there. A modal the player opened with their own tap
  // (Challenge / Share) was held back forever: 9 dead clicks on the MP results
  // Challenge button in one week. The zone guards against prompts covering a
  // payoff; it must never swallow the player's own request.
  it('opens a modal the player asked for even while the zone is up', () => {
    const release = claimOverlayQuietZone('classroom-results');
    const { result } = renderHook(() =>
      useModalQueue({ modals: [{ id: 'share', priority: 4, isReady: true, userRequested: true }] }),
    );
    expect(result.current.activeModalId).toBe('share');
    release();
  });

  it('still holds the automatic prompts back behind a requested one', () => {
    const release = claimOverlayQuietZone('classroom-results');
    const { result } = renderHook(() =>
      useModalQueue({
        modals: [
          { id: 'firstWin', priority: 3, isReady: true },
          { id: 'share', priority: 4, isReady: true, userRequested: true },
        ],
      }),
    );
    expect(result.current.activeModalId).toBe('share');
    act(() => result.current.dismiss('share'));
    expect(result.current.activeModalId).toBeNull();
    release();
  });
});
