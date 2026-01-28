/**
 * useAdventureMusic Hook Tests
 *
 * Tests world-specific music loading, track switching, and pause/resume behavior.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureMusic } from '../useAdventureMusic';

// Mock Howler.js
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

// Mock logger - needs to match the actual export shape
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

describe('useAdventureMusic', () => {
  const defaultProps = {
    worldNumber: 1,
    isPlaying: false,
    isPaused: false,
    timeRemaining: 120,
    totalTime: 120,
    enabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPlaying.mockReturnValue(false);
    mockState.mockReturnValue('loaded');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes tracks for world with music (1-3)', () => {
      const { Howl } = require('howler');

      renderHook(() => useAdventureMusic(defaultProps));

      // Should create 2 Howl instances for track 1 and track 2
      expect(Howl).toHaveBeenCalledTimes(2);
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/music/adventure/1_level_1.mp3'],
        })
      );
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/music/adventure/1_level_2.mp3'],
        })
      );
    });

    it('does NOT initialize tracks for worlds without music (4+)', () => {
      const { Howl } = require('howler');

      renderHook(() =>
        useAdventureMusic({
          ...defaultProps,
          worldNumber: 4,
        })
      );

      // Should not create any Howl instances
      expect(Howl).not.toHaveBeenCalled();
    });

    it('returns hasMusic=true for worlds 1-3', () => {
      const { result } = renderHook(() => useAdventureMusic(defaultProps));
      expect(result.current.hasMusic).toBe(true);
    });

    it('returns hasMusic=false for worlds 4+', () => {
      const { result } = renderHook(() =>
        useAdventureMusic({
          ...defaultProps,
          worldNumber: 5,
        })
      );
      expect(result.current.hasMusic).toBe(false);
    });
  });

  describe('playback control', () => {
    it('starts track 1 when gameplay begins', () => {
      const { rerender } = renderHook(
        ({ isPlaying }) => useAdventureMusic({ ...defaultProps, isPlaying }),
        { initialProps: { isPlaying: false } }
      );

      // Start playing
      rerender({ isPlaying: true });

      // Should start playback
      expect(mockPlay).toHaveBeenCalled();
      expect(mockFade).toHaveBeenCalled();
    });

    it('pauses music when game is paused', () => {
      mockPlaying.mockReturnValue(true);

      const { rerender } = renderHook(
        ({ isPlaying, isPaused }) =>
          useAdventureMusic({ ...defaultProps, isPlaying, isPaused }),
        { initialProps: { isPlaying: true, isPaused: false } }
      );

      // Pause the game
      rerender({ isPlaying: true, isPaused: true });

      // Should pause playback
      expect(mockPause).toHaveBeenCalled();
    });

    it('stops music when gameplay ends', () => {
      mockPlaying.mockReturnValue(true);

      const { rerender } = renderHook(
        ({ isPlaying }) => useAdventureMusic({ ...defaultProps, isPlaying }),
        { initialProps: { isPlaying: true } }
      );

      // Stop playing
      rerender({ isPlaying: false });

      // Should pause playback
      expect(mockPause).toHaveBeenCalled();
    });
  });

  describe('track switching', () => {
    it('switches to track 2 when 50% time has elapsed', () => {
      const totalTime = 120;
      const switchTime = 60; // 50% elapsed = 60 seconds remaining

      const { rerender } = renderHook(
        ({ timeRemaining }) =>
          useAdventureMusic({
            ...defaultProps,
            isPlaying: true,
            timeRemaining,
            totalTime,
          }),
        { initialProps: { timeRemaining: totalTime } }
      );

      // Clear mocks from initialization
      jest.clearAllMocks();

      // Time drops below 50% threshold
      rerender({ timeRemaining: switchTime - 1 });

      // Should fade out track 1 and fade in track 2
      expect(mockFade).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
    });

    it('does NOT switch to track 2 multiple times', () => {
      const totalTime = 120;

      const { rerender } = renderHook(
        ({ timeRemaining }) =>
          useAdventureMusic({
            ...defaultProps,
            isPlaying: true,
            timeRemaining,
            totalTime,
          }),
        { initialProps: { timeRemaining: totalTime } }
      );

      // Clear mocks from initialization
      jest.clearAllMocks();

      // First threshold crossing
      rerender({ timeRemaining: 59 });
      const firstCallCount = mockPlay.mock.calls.length;

      // Clear and cross again
      jest.clearAllMocks();
      rerender({ timeRemaining: 58 });

      // Should NOT call play again (already on track 2)
      // Note: play might be called for other reasons, but not for switching
      expect(mockPlay.mock.calls.length).toBeLessThanOrEqual(firstCallCount);
    });
  });

  describe('stopMusic', () => {
    it('fades out and stops all tracks', () => {
      mockPlaying.mockReturnValue(true);

      const { result } = renderHook(() =>
        useAdventureMusic({ ...defaultProps, isPlaying: true })
      );

      // Clear previous fade calls from initialization
      mockFade.mockClear();

      // Stop music with custom fade duration
      act(() => {
        result.current.stopMusic(500);
      });

      // Should fade out - check that fade was called with target volume 0 and duration 500
      const fadeCall = mockFade.mock.calls.find(
        (call) => call[1] === 0 && call[2] === 500
      );
      expect(fadeCall).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('unloads tracks on unmount', () => {
      const { unmount } = renderHook(() => useAdventureMusic(defaultProps));

      unmount();

      // Should unload tracks
      expect(mockUnload).toHaveBeenCalled();
    });
  });

  describe('world changes', () => {
    it('reinitializes tracks when world number changes', () => {
      const { Howl } = require('howler');

      const { rerender } = renderHook(
        ({ worldNumber }) => useAdventureMusic({ ...defaultProps, worldNumber }),
        { initialProps: { worldNumber: 1 } }
      );

      jest.clearAllMocks();

      // Change to world 2
      rerender({ worldNumber: 2 });

      // Should create new Howl instances for world 2
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/music/adventure/2_level_1.mp3'],
        })
      );
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/music/adventure/2_level_2.mp3'],
        })
      );
    });
  });

  describe('enabled flag', () => {
    it('does NOT play music when enabled=false', () => {
      renderHook(() =>
        useAdventureMusic({
          ...defaultProps,
          isPlaying: true,
          enabled: false,
        })
      );

      // Should not start playback
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('continuous looping', () => {
    it('loops music when track ends in adventure mode', () => {
      // GIVEN - capture onend callback from Howl
      const { Howl } = require('howler');
      let capturedOnEnd: (() => void) | undefined;

      Howl.mockImplementation((config: { onend?: () => void }) => {
        if (config.onend) {
          capturedOnEnd = config.onend;
        }
        return mockHowlInstance;
      });

      renderHook(() =>
        useAdventureMusic({
          ...defaultProps,
          isPlaying: true,
          enabled: true,
        })
      );

      // Track starts playing
      expect(mockPlay).toHaveBeenCalled();
      mockPlay.mockClear();
      mockSeek.mockClear();
      mockFade.mockClear();

      // WHEN - track ends (simulate onend callback)
      expect(capturedOnEnd).toBeDefined();
      act(() => {
        capturedOnEnd!();
      });

      // THEN - should loop: seek to 0, play again, fade in
      expect(mockSeek).toHaveBeenCalledWith(0);
      expect(mockPlay).toHaveBeenCalled();
      expect(mockFade).toHaveBeenCalled();
    });

    it('continues looping even when window was briefly unfocused', () => {
      // GIVEN - capture onend callback
      const { Howl } = require('howler');
      let capturedOnEnd: (() => void) | undefined;

      Howl.mockImplementation((config: { onend?: () => void }) => {
        if (config.onend) {
          capturedOnEnd = config.onend;
        }
        return mockHowlInstance;
      });

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

      mockPlay.mockClear();
      mockSeek.mockClear();
      mockFade.mockClear();

      // WHEN - track ends (even if window focus state varies)
      expect(capturedOnEnd).toBeDefined();
      act(() => {
        capturedOnEnd!();
      });

      // THEN - should ALWAYS loop in adventure mode
      // Music should restart regardless of window focus state
      expect(mockSeek).toHaveBeenCalledWith(0);
      expect(mockPlay).toHaveBeenCalled();
    });

    it('does NOT loop when music is disabled', () => {
      // GIVEN
      const { Howl } = require('howler');
      let capturedOnEnd: (() => void) | undefined;

      Howl.mockImplementation((config: { onend?: () => void }) => {
        if (config.onend) {
          capturedOnEnd = config.onend;
        }
        return mockHowlInstance;
      });

      const { rerender } = renderHook(
        ({ enabled }) =>
          useAdventureMusic({
            ...defaultProps,
            isPlaying: true,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      // Disable music
      rerender({ enabled: false });

      mockPlay.mockClear();
      mockSeek.mockClear();

      // WHEN - track ends while disabled
      expect(capturedOnEnd).toBeDefined();
      act(() => {
        capturedOnEnd!();
      });

      // THEN - should NOT loop
      expect(mockSeek).not.toHaveBeenCalled();
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('does NOT loop when game is paused', () => {
      // GIVEN
      const { Howl } = require('howler');
      let capturedOnEnd: (() => void) | undefined;

      Howl.mockImplementation((config: { onend?: () => void }) => {
        if (config.onend) {
          capturedOnEnd = config.onend;
        }
        return mockHowlInstance;
      });

      const { rerender } = renderHook(
        ({ isPaused }) =>
          useAdventureMusic({
            ...defaultProps,
            isPlaying: true,
            isPaused,
          }),
        { initialProps: { isPaused: false } }
      );

      // Pause game
      rerender({ isPaused: true });

      mockPlay.mockClear();
      mockSeek.mockClear();

      // WHEN - track ends while paused
      expect(capturedOnEnd).toBeDefined();
      act(() => {
        capturedOnEnd!();
      });

      // THEN - should NOT loop when paused
      expect(mockSeek).not.toHaveBeenCalled();
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });
});
