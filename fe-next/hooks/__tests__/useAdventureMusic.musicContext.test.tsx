/**
 * useAdventureMusic MusicContext Integration Tests
 *
 * Tests that adventure music respects global MusicContext volume and mute settings.
 * This is critical for the MusicControls component to work in adventure mode.
 */

import { vi } from 'vitest';
import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAdventureMusic } from '../useAdventureMusic';
import { MusicProvider, useMusic } from '@/contexts/MusicContext';

// Mock Howler.js with volume tracking — use vi.hoisted for mock factory access
const { mockPlay, mockStop, mockPause, mockFade, mockVolumeSet, mockSeek, mockUnload, mockLoad, mockState, mockPlaying, mockHowlInstance, resetLastVolume } = vi.hoisted(() => {
  const mockPlay = vi.fn();
  const mockStop = vi.fn();
  const mockPause = vi.fn();
  const mockFade = vi.fn();
  const mockVolumeSet = vi.fn();
  const mockSeek = vi.fn();
  const mockUnload = vi.fn();
  const mockLoad = vi.fn();
  const mockState = vi.fn().mockReturnValue('loaded');
  const mockPlaying = vi.fn().mockReturnValue(false);
  const volumeState = { value: 0 };
  const mockHowlInstance = {
    play: mockPlay, stop: mockStop, pause: mockPause, fade: mockFade,
    volume: (vol?: number) => {
      if (vol !== undefined) { volumeState.value = vol; mockVolumeSet(vol); }
      return volumeState.value;
    },
    seek: mockSeek, unload: mockUnload, load: mockLoad,
    state: mockState, playing: mockPlaying,
  };
  const resetLastVolume = () => { volumeState.value = 0; };
  return { mockPlay, mockStop, mockPause, mockFade, mockVolumeSet, mockSeek, mockUnload, mockLoad, mockState, mockPlaying, mockHowlInstance, resetLastVolume };
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

// Mock logger
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

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test wrapper with MusicProvider
const createWrapper = () => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MusicProvider>{children}</MusicProvider>;
  };
};

describe('useAdventureMusic MusicContext Integration', () => {
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
    resetLastVolume();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('volume control integration', () => {
    it('should use MusicContext volume when playing adventure music', () => {
      // GIVEN - MusicContext with volume pre-set to 0.8
      localStorageMock.setItem('boggle_music_settings', JSON.stringify({ volume: 0.8, isMuted: false }));

      vi.clearAllMocks();

      // WHEN - adventure music starts with isPlaying: true
      renderHook(
        () => {
          const music = useMusic();
          const adventure = useAdventureMusic({ ...defaultProps, isPlaying: true });
          return { music, adventure };
        },
        { wrapper: createWrapper() }
      );

      // THEN - adventure music should use the MusicContext volume (0.8), not hardcoded 0.5
      // Check the fade target volume
      const fadeCall = mockFade.mock.calls.find(
        (call) => call[1] === 0.8 // Target volume should be 0.8
      );

      // The key assertion: adventure music should respect MusicContext volume
      expect(fadeCall).toBeDefined();
    });

    it('should update volume when MusicContext volume changes', async () => {
      // GIVEN - adventure music is playing
      mockPlaying.mockReturnValue(true);

      const { result } = renderHook(
        () => {
          const music = useMusic();
          const adventure = useAdventureMusic({ ...defaultProps, isPlaying: true });
          return { music, adventure };
        },
        { wrapper: createWrapper() }
      );

      vi.clearAllMocks();

      // WHEN - user changes volume via MusicControls (which uses MusicContext)
      act(() => {
        result.current.music.setVolume(0.3);
      });

      // THEN - adventure music volume should update to match
      // Currently this will FAIL because useAdventureMusic ignores MusicContext
      expect(mockVolumeSet).toHaveBeenCalledWith(0.3);
    });
  });

  describe('mute control integration', () => {
    it('should pause Howl when MusicContext is muted', () => {
      // GIVEN - adventure music is playing
      mockPlaying.mockReturnValue(true);

      const { result } = renderHook(
        () => {
          const music = useMusic();
          const adventure = useAdventureMusic({ ...defaultProps, isPlaying: true });
          return { music, adventure };
        },
        { wrapper: createWrapper() }
      );

      vi.clearAllMocks();

      // WHEN - user mutes via MusicControls
      act(() => {
        result.current.music.toggleMute();
      });

      // THEN - Howl should be paused (not just volume-0'd) so decoding stops
      expect(mockPause).toHaveBeenCalled();
    });

    it('should resume Howl at saved volume when MusicContext is unmuted', () => {
      // GIVEN - MusicContext is initially muted
      localStorageMock.setItem('boggle_music_settings', JSON.stringify({ volume: 0.7, isMuted: true }));

      // Initially Howl is paused (not playing) because we muted it.
      // After unmute, resumeAudio calls play() which restarts decoding.
      mockPlaying.mockReturnValue(false);

      const { result } = renderHook(
        () => {
          const music = useMusic();
          const adventure = useAdventureMusic({ ...defaultProps, isPlaying: true });
          return { music, adventure };
        },
        { wrapper: createWrapper() }
      );

      vi.clearAllMocks();

      // WHEN - user unmutes via MusicControls
      act(() => {
        result.current.music.toggleMute();
      });

      // THEN - Howl should be resumed (play called) and volume restored to 0.7
      expect(mockPlay).toHaveBeenCalled();
      expect(mockVolumeSet).toHaveBeenCalledWith(0.7);
    });
  });

  describe('initial state integration', () => {
    it('should respect initial muted state from MusicContext', () => {
      // GIVEN - MusicContext starts muted (from localStorage)
      localStorageMock.setItem('boggle_music_settings', JSON.stringify({ volume: 0.6, isMuted: true }));

      // WHEN - adventure music starts
      renderHook(
        () => {
          const music = useMusic();
          const adventure = useAdventureMusic({ ...defaultProps, isPlaying: true });
          return { music, adventure };
        },
        { wrapper: createWrapper() }
      );

      // THEN - adventure music should NOT play sound (volume 0) because context is muted
      // Check that any fade call has target volume 0 (muted)
      const fadeCalls = mockFade.mock.calls;
      const hasPlayAttemptWithVolume = fadeCalls.some(
        (call) => call[1] > 0 // Any fade with non-zero target volume
      );

      // Currently this will FAIL because useAdventureMusic ignores MusicContext muted state
      expect(hasPlayAttemptWithVolume).toBe(false);
    });

    it('should respect initial volume from MusicContext', () => {
      // GIVEN - MusicContext has custom volume (from localStorage)
      localStorageMock.setItem('boggle_music_settings', JSON.stringify({ volume: 0.25, isMuted: false }));

      vi.clearAllMocks();

      // WHEN - adventure music starts
      renderHook(
        () => {
          const music = useMusic();
          const adventure = useAdventureMusic({ ...defaultProps, isPlaying: true });
          return { music, adventure };
        },
        { wrapper: createWrapper() }
      );

      // THEN - adventure music should use the saved volume (0.25)
      const fadeCall = mockFade.mock.calls.find(
        (call) => call[1] === 0.25 // Target volume should match saved
      );

      // Currently this will FAIL because useAdventureMusic uses hardcoded DEFAULT_VOLUME = 0.5
      expect(fadeCall).toBeDefined();
    });
  });
});
