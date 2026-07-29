/**
 * Funnel parity: every mode that emits `game_completed` must also emit
 * `game_started` on mount. Adventure previously only tracked
 * `adventure_level_start`; PostHog funnel mode_started→game_completed
 * showed adventure at 0-started/13-completed.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGameStart = vi.fn();
const trackAdventureLevel = vi.fn();
const trackFeatureFirstUse = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackAdventureLevel: (...args: unknown[]) => trackAdventureLevel(...args),
  trackFeatureFirstUse: (...args: unknown[]) => trackFeatureFirstUse(...args),
}));

import { useAdventureAnalytics } from '../useAdventureSFXAndAnalytics';

const baseOpts = {
  isPlaying: true,
  entryPhase: 'playing',
  worldNumber: 2,
  levelNumber: 5,
  gameStars: 0,
  gameScore: 0,
  nonBossCompleted: false,
  showVictoryCinematic: false,
  showDefeatCinematic: false,
  consecutiveFailures: 0,
  isBossLevel: false,
};

describe('useAdventureAnalytics trackGameStart', () => {
  beforeEach(() => {
    trackGameStart.mockClear();
    trackAdventureLevel.mockClear();
  });

  it("emits trackGameStart('adventure', {world, level}) once when gameplay begins", () => {
    renderHook(() => useAdventureAnalytics(baseOpts));
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('adventure', { world: 2, level: 5 });
  });

  it("emits 'adventure-boss' when isBossLevel=true to match trackGameEnd label", () => {
    renderHook(() => useAdventureAnalytics({ ...baseOpts, isBossLevel: true }));
    expect(trackGameStart).toHaveBeenCalledWith('adventure-boss', { world: 2, level: 5 });
  });

  it("does not emit until entryPhase='playing' (suppress pre-game mounts)", () => {
    renderHook(() => useAdventureAnalytics({ ...baseOpts, entryPhase: 'intro' }));
    expect(trackGameStart).not.toHaveBeenCalled();
  });

  it("fires only once across re-renders with same level", () => {
    const { rerender } = renderHook((props: typeof baseOpts) => useAdventureAnalytics(props), {
      initialProps: baseOpts,
    });
    rerender(baseOpts);
    rerender({ ...baseOpts, gameScore: 100 });
    expect(trackGameStart).toHaveBeenCalledTimes(1);
  });
});
