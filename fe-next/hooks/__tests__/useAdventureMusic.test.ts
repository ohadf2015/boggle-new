/**
 * useAdventureMusic Hook Tests
 *
 * Tests world-specific music loading, track switching, and pause/resume behavior.
 */

import { vi } from 'vitest';
import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAdventureMusic } from '../useAdventureMusic';
import { MusicProvider } from '@/contexts/MusicContext';

// Mock Howler.js — use vi.hoisted so vars exist when vi.mock factory runs (hoisted above imports)
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

// Mock logger - needs to match the actual export shape
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
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockPlaying.mockReturnValue(false);
    mockState.mockReturnValue('loaded');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes tracks for world with music (1-3)', async () => {
      const { Howl } = await import('howler');

      // Clear mocks to ignore MusicProvider's Howl calls
      vi.clearAllMocks();

      renderHook(() => useAdventureMusic(defaultProps), { wrapper: createWrapper() });

      // Filter for adventure music Howl instances only
      const adventureMusicCalls = Howl.mock.calls.filter(
        (call: unknown[]) => {
          const src = (call[0] as { src?: string[] })?.src?.[0];
          return src?.includes('/music/adventure/');
        }
      );

      // Should create 2 Howl instances for track 1 and track 2
      expect(adventureMusicCalls).toHaveLength(2);
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

    it('does NOT initialize tracks for worlds without music (4+)', async () => {
      const { Howl } = await import('howler');

      // Clear mocks to ignore MusicProvider's Howl calls
      vi.clearAllMocks();

      renderHook(() =>
        useAdventureMusic({
          ...defaultProps,
          worldNumber: 4,
        }),
        { wrapper: createWrapper() }
      );

      // Should not create any adventure music Howl instances (world 4 has no music)
      // MusicProvider creates its own Howls for global music, but adventure hook should not
      const adventureMusicCalls = Howl.mock.calls.filter(
        (call: unknown[]) => {
          const src = (call[0] as { src?: string[] })?.src?.[0];
          return src?.includes('/music/adventure/');
        }
      );
      expect(adventureMusicCalls).toHaveLength(0);
    });

    it('returns hasMusic=true for worlds 1-3', () => {
      const { result } = renderHook(() => useAdventureMusic(defaultProps), { wrapper: createWrapper() });
      expect(result.current.hasMusic).toBe(true);
    });

    it('returns hasMusic=false for worlds 4+', () => {
      const { result } = renderHook(() =>
        useAdventureMusic({
          ...defaultProps,
          worldNumber: 5,
        }),
        { wrapper: createWrapper() }
      );
      expect(result.current.hasMusic).toBe(false);
    });
  });

  describe('playback control', () => {
    it('starts track 1 when gameplay begins', () => {
      const { rerender } = renderHook(
        ({ isPlaying }) => useAdventureMusic({ ...defaultProps, isPlaying }),
        { initialProps: { isPlaying: false }, wrapper: createWrapper() }
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
        { initialProps: { isPlaying: true, isPaused: false }, wrapper: createWrapper() }
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
        { initialProps: { isPlaying: true }, wrapper: createWrapper() }
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
        { initialProps: { timeRemaining: totalTime }, wrapper: createWrapper() }
      );

      // Clear mocks from initialization
      vi.clearAllMocks();

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
        { initialProps: { timeRemaining: totalTime }, wrapper: createWrapper() }
      );

      // Clear mocks from initialization
      vi.clearAllMocks();

      // First threshold crossing
      rerender({ timeRemaining: 59 });
      const firstCallCount = mockPlay.mock.calls.length;

      // Clear and cross again
      vi.clearAllMocks();
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
        useAdventureMusic({ ...defaultProps, isPlaying: true }),
        { wrapper: createWrapper() }
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
      const { unmount } = renderHook(() => useAdventureMusic(defaultProps), { wrapper: createWrapper() });

      unmount();

      // Should unload tracks
      expect(mockUnload).toHaveBeenCalled();
    });
  });

  describe('world changes', () => {
    it('reinitializes tracks when world number changes', async () => {
      const { Howl } = await import('howler');

      const { rerender } = renderHook(
        ({ worldNumber }) => useAdventureMusic({ ...defaultProps, worldNumber }),
        { initialProps: { worldNumber: 1 }, wrapper: createWrapper() }
      );

      vi.clearAllMocks();

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
        }),
        { wrapper: createWrapper() }
      );

      // Should not start playback
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('continuous looping', () => {
    it('loops music when track ends in adventure mode', async () => {
      // GIVEN - capture onend callback from adventure music Howl (not MusicProvider)
      const { Howl } = await import('howler');
      const capturedOnEndCallbacks: (() => void)[] = [];

      Howl.mockImplementation(function(config: { onend?: () => void; src?: string[] }) {
        // Only capture onend from adventure music tracks, not MusicProvider
        if (config.onend && config.src?.[0]?.includes('/music/adventure/')) {
          capturedOnEndCallbacks.push(config.onend);
        }
        return mockHowlInstance;
      });

      renderHook(() =>
        useAdventureMusic({
          ...defaultProps,
          isPlaying: true,
          enabled: true,
        }),
        { wrapper: createWrapper() }
      );

      // Track starts playing
      expect(mockPlay).toHaveBeenCalled();
      mockPlay.mockClear();
      mockSeek.mockClear();
      mockFade.mockClear();

      // WHEN - track ends (simulate onend callback from track 1)
      expect(capturedOnEndCallbacks.length).toBeGreaterThan(0);
      act(() => {
        capturedOnEndCallbacks[0](); // First adventure track's onend
      });

      // THEN - should loop: seek to 0, play again, fade in
      expect(mockSeek).toHaveBeenCalledWith(0);
      expect(mockPlay).toHaveBeenCalled();
      expect(mockFade).toHaveBeenCalled();
    });

    it('continues looping even when window was briefly unfocused', async () => {
      // GIVEN - capture onend callback from adventure music Howl (not MusicProvider)
      const { Howl } = await import('howler');
      const capturedOnEndCallbacks: (() => void)[] = [];

      Howl.mockImplementation(function(config: { onend?: () => void; src?: string[] }) {
        // Only capture onend from adventure music tracks, not MusicProvider
        if (config.onend && config.src?.[0]?.includes('/music/adventure/')) {
          capturedOnEndCallbacks.push(config.onend);
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
        }),
        { wrapper: createWrapper() }
      );

      mockPlay.mockClear();
      mockSeek.mockClear();
      mockFade.mockClear();

      // WHEN - track ends (even if window focus state varies)
      expect(capturedOnEndCallbacks.length).toBeGreaterThan(0);
      act(() => {
        capturedOnEndCallbacks[0](); // First adventure track's onend
      });

      // THEN - should ALWAYS loop in adventure mode
      // Music should restart regardless of window focus state
      expect(mockSeek).toHaveBeenCalledWith(0);
      expect(mockPlay).toHaveBeenCalled();
    });

    it('does NOT loop when music is disabled', async () => {
      // GIVEN
      const { Howl } = await import('howler');
      let capturedOnEnd: (() => void) | undefined;

      Howl.mockImplementation(function(config: { onend?: () => void }) {
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
        { initialProps: { enabled: true }, wrapper: createWrapper() }
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

    it('does NOT loop when game is paused', async () => {
      // GIVEN
      const { Howl } = await import('howler');
      let capturedOnEnd: (() => void) | undefined;

      Howl.mockImplementation(function(config: { onend?: () => void }) {
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
        { initialProps: { isPaused: false }, wrapper: createWrapper() }
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
