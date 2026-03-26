/**
 * useAdventureMusic Ambient Mode Tests
 *
 * Tests for ambient music playback on adventure screens (WorldMap, LevelGrid).
 * World music should play on ALL adventure screens, not just during gameplay.
 */

import { vi } from 'vitest';
import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAdventureMusic } from '../useAdventureMusic';
import { MusicProvider } from '@/contexts/MusicContext';

// ==============================================
// MOCKS
// ==============================================

const { mockPlay, mockStop, mockPause, mockFade, mockVolume, mockSeek, mockUnload, mockLoad, mockState, mockPlaying, mockHowlInstance } = vi.hoisted(() => {
  const mockPlay = vi.fn();
  const mockStop = vi.fn();
  const mockPause = vi.fn();
  const mockFade = vi.fn();
  const mockVolume = vi.fn();
  const mockSeek = vi.fn();
  const mockUnload = vi.fn();
  const mockLoad = vi.fn();
  const mockState = vi.fn().mockReturnValue('loaded');
  const mockPlaying = vi.fn().mockReturnValue(false);
  const mockHowlInstance = {
    play: mockPlay, stop: mockStop, pause: mockPause, fade: mockFade,
    volume: mockVolume, seek: mockSeek, unload: mockUnload, load: mockLoad,
    state: mockState, playing: mockPlaying,
  };
  return { mockPlay, mockStop, mockPause, mockFade, mockVolume, mockSeek, mockUnload, mockLoad, mockState, mockPlaying, mockHowlInstance };
});

vi.mock('howler', () => ({
  Howl: vi.fn(function() { return mockHowlInstance; }),
  Howler: {
    ctx: {
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('@/utils/logger', () => {
  const mockLogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Test wrapper with MusicProvider
const createWrapper = () => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(MusicProvider, null, children);
  };
};

// ==============================================
// TESTS
// ==============================================

describe('useAdventureMusic - Ambient Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockPlaying.mockReturnValue(false);
    mockState.mockReturnValue('loaded');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ambient mode for WorldMap/LevelGrid', () => {
    it('plays track 1 in ambient mode (no timer tracking)', () => {
      // GIVEN - ambient mode props (no gameplay timer)
      const ambientProps = {
        worldNumber: 1,
        isPlaying: true,
        isPaused: false,
        enabled: true,
        // No timeRemaining/totalTime = ambient mode
      };

      // WHEN
      renderHook(() =>
        useAdventureMusic({
          ...ambientProps,
          timeRemaining: 0,
          totalTime: 0,
        }),
        { wrapper: createWrapper() }
      );

      // THEN - should play track 1 immediately
      expect(mockPlay).toHaveBeenCalled();
      expect(mockFade).toHaveBeenCalled();
    });

    it('does NOT switch to track 2 in ambient mode', () => {
      // GIVEN - ambient mode (no timer)
      const { rerender } = renderHook(
        () =>
          useAdventureMusic({
            worldNumber: 1,
            isPlaying: true,
            isPaused: false,
            timeRemaining: 0,
            totalTime: 0,
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      vi.clearAllMocks();

      // WHEN - rerender (simulate time passing in ambient mode)
      rerender();

      // THEN - should NOT switch to track 2 (track 1 loops)
      // The key indicator is that play should not be called for a new track
      // after initial playback
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('loops track 1 continuously in ambient mode', async () => {
      // GIVEN
      const { Howl } = await import('howler');

      renderHook(() =>
        useAdventureMusic({
          worldNumber: 1,
          isPlaying: true,
          isPaused: false,
          timeRemaining: 0,
          totalTime: 0,
          enabled: true,
        }),
        { wrapper: createWrapper() }
      );

      // THEN - Howl should be created with manual loop handling
      // (loop: false because we use crossfade for seamless looping)
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          loop: false, // Manual looping for crossfade
        })
      );
    });

    it('pauses music when isPaused is true in ambient mode', () => {
      // GIVEN
      mockPlaying.mockReturnValue(true);

      const { rerender } = renderHook(
        ({ isPaused }) =>
          useAdventureMusic({
            worldNumber: 1,
            isPlaying: true,
            isPaused,
            timeRemaining: 0,
            totalTime: 0,
            enabled: true,
          }),
        { initialProps: { isPaused: false }, wrapper: createWrapper() }
      );

      // WHEN
      rerender({ isPaused: true });

      // THEN
      expect(mockPause).toHaveBeenCalled();
    });

    it('changes world music when worldNumber changes in ambient mode', async () => {
      // GIVEN
      const { Howl } = await import('howler');

      const { rerender } = renderHook(
        ({ worldNumber }) =>
          useAdventureMusic({
            worldNumber,
            isPlaying: true,
            isPaused: false,
            timeRemaining: 0,
            totalTime: 0,
            enabled: true,
          }),
        { initialProps: { worldNumber: 1 }, wrapper: createWrapper() }
      );

      vi.clearAllMocks();

      // WHEN - change to world 2
      rerender({ worldNumber: 2 });

      // THEN - should load world 2 tracks
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/music/adventure/2_level_1.mp3'],
        })
      );
    });
  });

  describe('transition from ambient to gameplay mode', () => {
    it('continues playing when transitioning from map to gameplay', () => {
      // GIVEN - start in ambient mode
      const { rerender } = renderHook(
        ({ timeRemaining, totalTime }) =>
          useAdventureMusic({
            worldNumber: 1,
            isPlaying: true,
            isPaused: false,
            timeRemaining,
            totalTime,
            enabled: true,
          }),
        { initialProps: { timeRemaining: 0, totalTime: 0 }, wrapper: createWrapper() }
      );

      // Music should be playing
      expect(mockPlay).toHaveBeenCalled();
      vi.clearAllMocks();

      // WHEN - transition to gameplay (timer starts)
      rerender({ timeRemaining: 120, totalTime: 120 });

      // THEN - music should continue (not restart)
      // Play might be called but fade should not restart from 0
      // The key is that we don't unload/reload tracks
      expect(mockUnload).not.toHaveBeenCalled();
    });

    it('switches to track 2 at 50% time during gameplay', () => {
      // GIVEN - start in ambient mode
      const { rerender } = renderHook(
        ({ timeRemaining, totalTime }) =>
          useAdventureMusic({
            worldNumber: 1,
            isPlaying: true,
            isPaused: false,
            timeRemaining,
            totalTime,
            enabled: true,
          }),
        { initialProps: { timeRemaining: 0, totalTime: 0 }, wrapper: createWrapper() }
      );

      // Transition to gameplay
      rerender({ timeRemaining: 120, totalTime: 120 });
      vi.clearAllMocks();

      // WHEN - time passes to 50%
      rerender({ timeRemaining: 60, totalTime: 120 });

      // THEN - should switch to track 2
      expect(mockFade).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe('return to ambient mode after gameplay', () => {
    it('continues playing track 1 when returning to map after gameplay', () => {
      // GIVEN - gameplay mode with time
      const { rerender } = renderHook(
        ({ timeRemaining, totalTime }) =>
          useAdventureMusic({
            worldNumber: 1,
            isPlaying: true,
            isPaused: false,
            timeRemaining,
            totalTime,
            enabled: true,
          }),
        { initialProps: { timeRemaining: 60, totalTime: 120 }, wrapper: createWrapper() }
      );

      vi.clearAllMocks();

      // WHEN - return to ambient mode (timer reset to 0)
      rerender({ timeRemaining: 0, totalTime: 0 });

      // THEN - should reset to track 1 (ambient mode loops track 1)
      // This ensures fresh music state when returning to map
      expect(mockPlay).toHaveBeenCalled();
    });
  });
});
