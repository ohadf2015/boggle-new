/**
 * @jest-environment jsdom
 *
 * useCrazyGamesLifecycle — trackEvent instrumentation
 *
 * CG full-launch asks for analytics events at game_start/game_end. Wiring
 * these into the lifecycle hook auto-instruments every mode that already
 * uses it (daily, word-hunt, multiplayer), avoiding per-mode plumbing.
 */
import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCrazyGamesLifecycle } from '../useCrazyGamesLifecycle';

const { mockTrackEvent } = vi.hoisted(() => ({ mockTrackEvent: vi.fn() }));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    happyTime: vi.fn(),
    loadingStart: vi.fn(),
    loadingStop: vi.fn(),
    showMidgameAd: vi.fn(),
    trackEvent: mockTrackEvent,
    isAvailable: true,
    isOnCrazyGamesPlatform: true,
  }),
}));

describe('useCrazyGamesLifecycle — trackEvent instrumentation', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  it('fires trackEvent("game_start") when game becomes active', () => {
    const { rerender } = renderHook(
      ({ isGameActive, isGameOver }) => useCrazyGamesLifecycle({ isGameActive, isGameOver }),
      { initialProps: { isGameActive: false, isGameOver: false } }
    );
    expect(mockTrackEvent).not.toHaveBeenCalled();

    rerender({ isGameActive: true, isGameOver: false });

    expect(mockTrackEvent).toHaveBeenCalledWith('game_start');
  });

  it('fires trackEvent("game_end") when game ends', () => {
    const { rerender } = renderHook(
      ({ isGameActive, isGameOver }) => useCrazyGamesLifecycle({ isGameActive, isGameOver }),
      { initialProps: { isGameActive: true, isGameOver: false } }
    );
    mockTrackEvent.mockClear();

    rerender({ isGameActive: false, isGameOver: true });

    expect(mockTrackEvent).toHaveBeenCalledWith('game_end');
  });

  it('does not re-fire game_start on rerender while already active', () => {
    const { rerender } = renderHook(
      ({ isGameActive, isGameOver, score }) =>
        useCrazyGamesLifecycle({ isGameActive, isGameOver, score }),
      { initialProps: { isGameActive: true, isGameOver: false, score: 0 } }
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    rerender({ isGameActive: true, isGameOver: false, score: 50 });
    rerender({ isGameActive: true, isGameOver: false, score: 100 });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
