import { vi, type Mock, } from 'vitest';
/**
 * Test for duplicate MusicProvider issue and music transition bugs
 *
 * BUG 1: Duplicate music playing in single player mode
 * ROOT CAUSE: providers.tsx wraps MusicProvider via AudioProviders, but
 * EssentialProviders already includes MusicProvider. When navigating from
 * landing page to game page, a second MusicProvider is created.
 *
 * BUG 2: Music doesn't transition to bossa-arcade except when touching music controller
 * ROOT CAUSE: Multiple MusicProvider instances mean fadeToTrack is called
 * on one provider while the other keeps playing its track.
 */

import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { MusicProvider, useMusic } from '../MusicContext';
import { Howl, Howler } from 'howler';

// Track all Howl instances created
const createdHowls: any[] = [];

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
      _instanceId: Math.random().toString(36).substring(7),

      state: vi.fn(function(this: any) {
        return this._state;
      }),

      load: vi.fn(function(this: any) {
        this._state = 'loading';
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
        return 1;
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
        }
        return this;
      }),

      _triggerEnd: function(this: any) {
        if (this._onEndCallback) {
          this._onEndCallback();
        }
      }
    };

    // Track this instance for test assertions
    createdHowls.push(howlInstance);

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
      if (howl.state() === 'unloaded') {
        howl.load();
      }
      setTimeout(() => resolve(), 20);
    });
  })
}));

describe('MusicContext - Duplicate Provider Issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdHowls.length = 0;

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

  describe('Single MusicProvider behavior', () => {
    it('should only create one set of Howl instances per track', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MusicProvider>{children}</MusicProvider>
      );

      renderHook(() => useMusic(), { wrapper });

      // Should create exactly 6 Howl instances (one per track)
      // lobby, beforeGame, inGame, almostOutOfTime, bossaArcade, bossa
      expect(createdHowls.length).toBe(6);
    });

    it('should transition from main music to bossa-arcade when playing', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MusicProvider>{children}</MusicProvider>
      );

      const { result } = renderHook(() => useMusic(), { wrapper });

      // Unlock audio
      act(() => {
        result.current.unlockAudio();
      });

      // Start with in-game music
      await act(async () => {
        result.current.fadeToTrack(result.current.TRACKS.IN_GAME, 100, 100);
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.current.currentTrack).toBe('inGame');

      // Transition to bossa-arcade
      await act(async () => {
        result.current.fadeToTrack(result.current.TRACKS.BOSSA_ARCADE, 100, 100);
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.currentTrack).toBe('bossaArcade');

      // Verify in-game track is stopped
      const inGameHowl = createdHowls.find(h =>
        h._options.src[0] === '/music/in_game.mp3'
      );
      const bossaArcadeHowl = createdHowls.find(h =>
        h._options.src[0] === '/music/bossa-arcade.mp3'
      );

      expect(bossaArcadeHowl._playing).toBe(true);
      // In-game should have been stopped via fade or stop
      expect(inGameHowl.stop).toHaveBeenCalled();
    });
  });

  describe('Duplicate MusicProvider detection', () => {
    it('should create duplicate Howl instances when MusicProvider is incorrectly nested (documents the issue)', () => {
      // This test documents what happens if someone incorrectly nests MusicProviders.
      // The architectural fix in conditional-providers.tsx prevents this from happening
      // in the app, but this test shows why nested MusicProviders are problematic.

      // Render with nested MusicProviders (the bug scenario)
      render(
        <MusicProvider>
          <MusicProvider>
            <TestConsumer />
          </MusicProvider>
        </MusicProvider>
      );

      // With nested MusicProviders, we get 12 Howl instances (6 per provider)
      // This is the BUG that our architectural fix prevents
      expect(createdHowls.length).toBe(12);

      // But we only have 6 unique tracks - they're duplicated
      const uniqueTracks = new Set(createdHowls.map(h => h._options.src[0]));
      expect(uniqueTracks.size).toBe(6);
    });

    it('should only have one MusicProvider instance when using EssentialProviders correctly', () => {
      // This test verifies that with the correct architecture (single MusicProvider),
      // we only get 6 Howl instances (one per track)

      // Reset the createdHowls array
      createdHowls.length = 0;

      // Render with a single MusicProvider (correct usage)
      render(
        <MusicProvider>
          <TestConsumer />
        </MusicProvider>
      );

      // Should have exactly 6 Howl instances (one per track)
      expect(createdHowls.length).toBe(6);
    });

    it('should ensure only one track plays at a time across all circumstances', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MusicProvider>{children}</MusicProvider>
      );

      const { result } = renderHook(() => useMusic(), { wrapper });

      // Unlock audio
      act(() => {
        result.current.unlockAudio();
      });

      // Play lobby music
      await act(async () => {
        result.current.fadeToTrack(result.current.TRACKS.LOBBY, 100, 100);
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Play in-game music
      await act(async () => {
        result.current.fadeToTrack(result.current.TRACKS.IN_GAME, 100, 100);
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Count how many tracks are currently playing
      const playingTracks = createdHowls.filter(h => h._playing);

      // Only ONE track should be playing at any time
      expect(playingTracks.length).toBe(1);
      expect(playingTracks[0]._options.src[0]).toBe('/music/in_game.mp3');
    });
  });
});

// Simple test consumer component
function TestConsumer() {
  const music = useMusic();
  return <div data-testid="track">{music.currentTrack || 'none'}</div>;
}
