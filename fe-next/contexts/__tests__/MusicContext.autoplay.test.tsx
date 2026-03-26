import { vi, type Mock, type MockedClass, } from 'vitest';
/**
 * Test for music auto-play and transition issue after lazy loading changes
 *
 * BUG: After commit 09ec1b5d (lazy loading), tracks no longer auto-play
 * or transition properly when they finish. The onend callback doesn't
 * await the async fadeToTrack function.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MusicProvider, useMusic } from '../MusicContext';
import { Howl, Howler } from 'howler';

// Mock Howler
vi.mock('howler', () => {
  const mockHowl = vi.fn().mockImplementation((options) => {
    const howlInstance = {
      _options: options,
      _state: 'unloaded',
      _playing: false,
      _volume: options.volume || 0,
      _onEndCallback: options.onend || null as (() => void) | null,
      _onLoadCallback: options.onload || null as (() => void) | null,
      _seekPosition: 0,

      state: vi.fn(function(this: any) {
        return this._state;
      }),

      load: vi.fn(function(this: any) {
        this._state = 'loading';
        // Simulate async load - call onload after delay
        setTimeout(() => {
          this._state = 'loaded';
          if (this._onLoadCallback) {
            this._onLoadCallback();
          }
        }, 10);
        return this;
      }),

      play: vi.fn(function(this: any) {
        this._playing = true;
        return 1; // sound ID
      }),

      playing: vi.fn(function(this: any) {
        return this._playing;
      }),

      pause: vi.fn(function(this: any) {
        this._playing = false;
        return this;
      }),

      stop: vi.fn(function(this: any) {
        this._playing = false;
        this._seekPosition = 0;
        return this;
      }),

      volume: vi.fn(function(this: any, vol?: number) {
        if (vol !== undefined) {
          this._volume = vol;
          return this;
        }
        return this._volume;
      }),

      fade: vi.fn(function(this: any) {
        return this;
      }),

      seek: vi.fn(function(this: any, position?: number) {
        if (position !== undefined) {
          this._seekPosition = position;
          return this;
        }
        return this._seekPosition;
      }),

      unload: vi.fn(function(this: any) {
        this._state = 'unloaded';
        return this;
      }),

      once: vi.fn(function(this: any, event: string, callback: () => void) {
        if (event === 'end') {
          this._onEndCallback = callback;
        } else if (event === 'load') {
          this._onLoadCallback = callback;
        } else if (event === 'loaderror') {
          // Ignore loaderror
        }
        return this;
      }),

      // Helper to trigger onend
      _triggerEnd: function(this: any) {
        if (this._onEndCallback) {
          this._onEndCallback();
        }
      }
    };

    return howlInstance;
  });

  return {
    Howl: mockHowl,
    Howler: {
      ctx: {
        state: 'running',
        resume: vi.fn().mockResolvedValue(undefined),
        suspend: vi.fn()
      }
    }
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock audio loader
vi.mock('@/lib/audio/audioLoader', () => ({
  createLazyHowl: vi.fn((src: string | string[], options?: any) => {
    const { Howl } = require('howler');
    return new Howl({
      src: Array.isArray(src) ? src : [src],
      preload: false,
      html5: true,
      ...options
    });
  }),
  preloadAudioOnDemand: vi.fn((howl: any) => {
    return new Promise<void>((resolve) => {
      // Simulate async load
      if (howl.state() === 'unloaded') {
        howl.load();
      }
      // Wait for load to complete
      setTimeout(() => resolve(), 20);
    });
  }),
  ensureHowl: vi.fn().mockResolvedValue(vi.fn()),
}));

describe('MusicContext - Auto-play and Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window focus and visibility
    Object.defineProperty(document, 'hasFocus', {
      writable: true,
      value: vi.fn(() => true)
    });

    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible'
    });
  });

  it('should use native looping (loop: true) for seamless playback', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MusicProvider>{children}</MusicProvider>
    );

    const { result } = renderHook(() => useMusic(), { wrapper });

    // Simulate user interaction to unlock audio
    act(() => {
      result.current.unlockAudio();
    });

    // Start playing inGame track
    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.IN_GAME, 100, 100);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Get the Howl instance for inGame track
    const HowlConstructor = Howl as MockedClass<typeof Howl>;
    const inGameHowl = HowlConstructor.mock.results.find(r =>
      r.value._options.src[0] === '/music/in_game.mp3'
    )?.value;

    expect(inGameHowl).toBeDefined();
    expect(inGameHowl._playing).toBe(true);

    // Verify native looping is enabled - this means Howler handles the loop
    // automatically without needing to call play() again
    expect(inGameHowl._options.loop).toBe(true);

    // With native loop: true, the track continues playing indefinitely
    // without needing to trigger onend manually
    expect(inGameHowl._playing).toBe(true);
  });

  it('should transition between tracks smoothly after initial load', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MusicProvider>{children}</MusicProvider>
    );

    const { result } = renderHook(() => useMusic(), { wrapper });

    // Unlock audio
    act(() => {
      result.current.unlockAudio();
    });

    // Start with lobby music
    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.LOBBY, 100, 100);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const HowlConstructor = Howl as MockedClass<typeof Howl>;
    const lobbyHowl = HowlConstructor.mock.results.find(r =>
      r.value._options.src[0] === '/music/in_lobby.mp3'
    )?.value;

    expect(lobbyHowl._playing).toBe(true);

    // Transition to inGame music
    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.IN_GAME, 100, 100);
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    const inGameHowl = HowlConstructor.mock.results.find(r =>
      r.value._options.src[0] === '/music/in_game.mp3'
    )?.value;

    // Track should be playing after preload completes
    expect(inGameHowl._playing).toBe(true);
    expect(result.current.currentTrack).toBe(result.current.TRACKS.IN_GAME);
  });
});
