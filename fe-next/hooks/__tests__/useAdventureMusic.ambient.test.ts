/**
 * useAdventureMusic Ambient Mode Tests
 *
 * Tests for ambient music playback on adventure screens (WorldMap, LevelGrid).
 * World music should play on ALL adventure screens, not just during gameplay.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureMusic } from '../useAdventureMusic';

// ==============================================
// MOCKS
// ==============================================

const mockPlay = jest.fn();
const mockStop = jest.fn();
const mockPause = jest.fn();
const mockFade = jest.fn();
const mockVolume = jest.fn();
const mockSeek = jest.fn();
const mockUnload = jest.fn();
const mockLoad = jest.fn();
const mockState = jest.fn().mockReturnValue('loaded');
const mockPlaying = jest.fn().mockReturnValue(false);

const mockHowlInstance = {
  play: mockPlay,
  stop: mockStop,
  pause: mockPause,
  fade: mockFade,
  volume: mockVolume,
  seek: mockSeek,
  unload: mockUnload,
  load: mockLoad,
  state: mockState,
  playing: mockPlaying,
};

jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation(() => mockHowlInstance),
  Howler: {
    ctx: {
      state: 'running',
      resume: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('@/utils/logger', () => {
  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// ==============================================
// TESTS
// ==============================================

describe('useAdventureMusic - Ambient Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPlaying.mockReturnValue(false);
    mockState.mockReturnValue('loaded');
  });

  afterEach(() => {
    jest.useRealTimers();
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
        })
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
          })
      );

      jest.clearAllMocks();

      // WHEN - rerender (simulate time passing in ambient mode)
      rerender();

      // THEN - should NOT switch to track 2 (track 1 loops)
      // The key indicator is that play should not be called for a new track
      // after initial playback
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('loops track 1 continuously in ambient mode', () => {
      // GIVEN
      const { Howl } = require('howler');

      renderHook(() =>
        useAdventureMusic({
          worldNumber: 1,
          isPlaying: true,
          isPaused: false,
          timeRemaining: 0,
          totalTime: 0,
          enabled: true,
        })
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
        { initialProps: { isPaused: false } }
      );

      // WHEN
      rerender({ isPaused: true });

      // THEN
      expect(mockPause).toHaveBeenCalled();
    });

    it('changes world music when worldNumber changes in ambient mode', () => {
      // GIVEN
      const { Howl } = require('howler');

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
        { initialProps: { worldNumber: 1 } }
      );

      jest.clearAllMocks();

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
        { initialProps: { timeRemaining: 0, totalTime: 0 } }
      );

      // Music should be playing
      expect(mockPlay).toHaveBeenCalled();
      jest.clearAllMocks();

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
        { initialProps: { timeRemaining: 0, totalTime: 0 } }
      );

      // Transition to gameplay
      rerender({ timeRemaining: 120, totalTime: 120 });
      jest.clearAllMocks();

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
        { initialProps: { timeRemaining: 60, totalTime: 120 } }
      );

      jest.clearAllMocks();

      // WHEN - return to ambient mode (timer reset to 0)
      rerender({ timeRemaining: 0, totalTime: 0 });

      // THEN - should reset to track 1 (ambient mode loops track 1)
      // This ensures fresh music state when returning to map
      expect(mockPlay).toHaveBeenCalled();
    });
  });
});
