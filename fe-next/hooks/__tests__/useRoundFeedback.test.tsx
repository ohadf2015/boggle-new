// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
}));

import { useRoundFeedback } from '../useRoundFeedback';

const base = {
  gameCode: 'ABCD',
  gameMode: 'classic',
  language: 'en',
  isMultiplayer: true,
};

beforeEach(() => {
  trackGrowthEvent.mockClear();
  window.sessionStorage.clear();
});

describe('useRoundFeedback', () => {
  it('shows between rounds in a multiplayer game', () => {
    const { result } = renderHook(() => useRoundFeedback(base));
    expect(result.current.shouldShow).toBe(true);
  });

  it('hides in single-player', () => {
    const { result } = renderHook(() => useRoundFeedback({ ...base, isMultiplayer: false }));
    expect(result.current.shouldShow).toBe(false);
  });

  it('hides without a game code', () => {
    const { result } = renderHook(() => useRoundFeedback({ ...base, gameCode: undefined }));
    expect(result.current.shouldShow).toBe(false);
  });

  it('hides on the final round of a best-of-three series', () => {
    const { result } = renderHook(() =>
      useRoundFeedback({ ...base, seriesRoundNumber: 3, seriesTotalGames: 3 }),
    );
    expect(result.current.shouldShow).toBe(false);
  });

  it('shows between rounds mid-series', () => {
    const { result } = renderHook(() =>
      useRoundFeedback({ ...base, seriesRoundNumber: 1, seriesTotalGames: 3 }),
    );
    expect(result.current.shouldShow).toBe(true);
  });

  it('records the rating to PostHog with rating value + round context', () => {
    const { result } = renderHook(() =>
      useRoundFeedback({ ...base, seriesRoundNumber: 1 }),
    );
    act(() => result.current.recordRating('great'));
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'mp_round_feedback',
      expect.objectContaining({
        rating: 'great',
        ratingValue: 3,
        gameMode: 'classic',
        gameCode: 'ABCD',
        language: 'en',
        seriesRound: 1,
      }),
    );
  });

  it('does not show again in the same room after answering (persisted)', () => {
    const first = renderHook(() => useRoundFeedback(base));
    act(() => first.result.current.recordRating('ok'));
    const second = renderHook(() => useRoundFeedback(base));
    expect(second.result.current.shouldShow).toBe(false);
  });

  it('dismiss hides the widget without firing an event', () => {
    const { result } = renderHook(() => useRoundFeedback(base));
    act(() => result.current.dismiss());
    expect(result.current.shouldShow).toBe(false);
    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });
});
