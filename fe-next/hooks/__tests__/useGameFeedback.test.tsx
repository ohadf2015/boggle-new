// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
}));

import { useGameFeedback } from '../useGameFeedback';

const base = {
  surface: 'singleplayer' as const,
  gameMode: 'classic',
  language: 'en',
  eligible: true,
  throttleKey: 's1',
};

beforeEach(() => {
  trackGrowthEvent.mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Default: plenty of prior games so the min-games gate is satisfied.
  window.localStorage.setItem('lc_fb_games', '5');
});

describe('useGameFeedback', () => {
  it('shows when eligible, enough games played, and no recent prompt', () => {
    const { result } = renderHook(() => useGameFeedback(base));
    expect(result.current.shouldShow).toBe(true);
  });

  it('stays hidden when the caller marks it ineligible', () => {
    const { result } = renderHook(() => useGameFeedback({ ...base, eligible: false }));
    expect(result.current.shouldShow).toBe(false);
  });

  it('does not prompt a brand-new player (fewer than 2 games)', () => {
    window.localStorage.setItem('lc_fb_games', '0');
    const { result } = renderHook(() => useGameFeedback(base));
    // Mount counts this game (→ 1), still below the min-games threshold.
    expect(result.current.shouldShow).toBe(false);
  });

  it('respects the global cooldown — no prompt if one was shown recently', () => {
    window.localStorage.setItem('lc_fb_last', String(Date.now()));
    const { result } = renderHook(() => useGameFeedback(base));
    expect(result.current.shouldShow).toBe(false);
  });

  it('prompts again once the cooldown has elapsed', () => {
    const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem('lc_fb_last', String(fourDaysAgo));
    const { result } = renderHook(() => useGameFeedback(base));
    expect(result.current.shouldShow).toBe(true);
  });

  it('records game_feedback with the surface, rating value, and context', () => {
    const { result } = renderHook(() => useGameFeedback(base));
    act(() => result.current.recordRating('great'));
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'game_feedback',
      expect.objectContaining({
        surface: 'singleplayer',
        rating: 'great',
        ratingValue: 3,
        gameMode: 'classic',
        language: 'en',
      }),
    );
  });

  it('opens the global cooldown after answering, so other surfaces stay quiet', () => {
    const { result } = renderHook(() => useGameFeedback(base));
    act(() => result.current.recordRating('ok'));
    // A different surface should now be suppressed by the shared cooldown.
    const other = renderHook(() =>
      useGameFeedback({ ...base, surface: 'daily', throttleKey: 'd1' }),
    );
    expect(other.result.current.shouldShow).toBe(false);
  });

  it('dismiss opens the cooldown and hides, without firing an event', () => {
    const { result } = renderHook(() => useGameFeedback(base));
    act(() => result.current.dismiss());
    expect(result.current.shouldShow).toBe(false);
    expect(trackGrowthEvent).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('lc_fb_last')).not.toBeNull();
  });
});
