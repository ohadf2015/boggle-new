/**
 * useAdventureMusic Ambient Mode Tests
 *
 * Tests for ambient music playback on adventure screens (WorldMap, LevelGrid).
 * World music should play on ALL adventure screens, not just during gameplay.
 */

import { vi } from 'vitest';
import React, { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { useAdventureMusic } from '../useAdventureMusic';
import { MusicProvider } from '@/contexts/MusicContext';

// ==============================================
// MOCKS
// ==============================================

const { mockPlay, mockPause, mockFade, mockUnload, mockPlaying, mockHowlInstance } = vi.hoisted(() => {
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
  return { mockPlay, mockPause, mockFade, mockUnload, mockPlaying, mockHowlInstance };
});

vi.mock('howler', () => ({
  Howl: vi.fn(function() { return mockHowlInstance; }),
  Howler: {
    ctx: { state: 'running', resume: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(MusicProvider, null, children);

// ==============================================
// TESTS
// ==============================================

describe('useAdventureMusic - Ambient Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockPlaying.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ambient mode for WorldMap/LevelGrid', () => {
    it('plays track 1 in ambient mode (no timer tracking)', () => {
      renderHook(() =>
        useAdventureMusic({
          worldNumber: 1,
          isPlaying: true,
          isPaused: false,
          timeRemaining: 0,
          totalTime: 0,
          enabled: true,
        }),
        { wrapper }
      );

      expect(mockPlay).toHaveBeenCalled();
      expect(mockFade).toHaveBeenCalled();
    });

    it('does NOT switch to track 2 in ambient mode', () => {
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
        { wrapper }
      );

      vi.clearAllMocks();
      rerender();

      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('loops track 1 continuously in ambient mode', async () => {
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
        { wrapper }
      );

      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({ loop: false })
      );
    });

    it('pauses music when isPaused is true in ambient mode', () => {
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
        { initialProps: { isPaused: false }, wrapper }
      );

      rerender({ isPaused: true });
      expect(mockPause).toHaveBeenCalled();
    });

    it('changes world music when worldNumber changes in ambient mode', async () => {
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
        { initialProps: { worldNumber: 1 }, wrapper }
      );

      vi.clearAllMocks();
      rerender({ worldNumber: 2 });

      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/music/adventure/2_level_1.mp3'],
        })
      );
    });
  });

  describe('transition from ambient to gameplay mode', () => {
    it('continues playing when transitioning from map to gameplay', () => {
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
        { initialProps: { timeRemaining: 0, totalTime: 0 }, wrapper }
      );

      expect(mockPlay).toHaveBeenCalled();
      vi.clearAllMocks();

      rerender({ timeRemaining: 120, totalTime: 120 });

      expect(mockUnload).not.toHaveBeenCalled();
    });

    it('switches to track 2 at 50% time during gameplay', () => {
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
        { initialProps: { timeRemaining: 0, totalTime: 0 }, wrapper }
      );

      rerender({ timeRemaining: 120, totalTime: 120 });
      vi.clearAllMocks();

      rerender({ timeRemaining: 59, totalTime: 120 });

      expect(mockFade).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe('return to ambient mode after gameplay', () => {
    it('resets hasSwitchedToTrack2 when returning to ambient', () => {
      mockPlaying.mockReturnValue(true);

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
        { initialProps: { timeRemaining: 60, totalTime: 120 }, wrapper }
      );

      // Switch to track 2
      rerender({ timeRemaining: 59, totalTime: 120 });
      vi.clearAllMocks();

      // Return to ambient
      rerender({ timeRemaining: 0, totalTime: 0 });

      expect(mockPlay).toHaveBeenCalled();
    });
  });
});
