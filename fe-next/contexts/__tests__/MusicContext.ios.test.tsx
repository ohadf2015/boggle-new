import { vi, type Mock, } from 'vitest';
/**
 * MusicContext iOS Safari Compatibility Tests
 *
 * Tests that audio is configured correctly for iOS Safari compatibility.
 * iOS Safari has strict requirements for Web Audio API that require special handling.
 *
 * Note: Howl instances are lazy-initialized (created on first use, not at mount).
 * Tests trigger track creation via playTrack() to verify configuration.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';

// Track Howl constructor calls and their options
const howlConstructorCalls: Array<{ src: string[]; html5: boolean }> = [];

// Mock Howler.js
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation((options) => {
    howlConstructorCalls.push({
      src: options.src,
      html5: options.html5,
    });
    return {
      play: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      fade: vi.fn(),
      volume: vi.fn(),
      seek: vi.fn(),
      unload: vi.fn(),
      load: vi.fn(),
      state: vi.fn().mockReturnValue('loaded'),
      playing: vi.fn().mockReturnValue(false),
    };
  }),
  Howler: {
    ctx: {
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock audioLoader to use mocked Howl constructor
vi.mock('@/lib/audio/audioLoader', () => {
  const { Howl } = require('howler');
  return {
    ensureHowl: vi.fn().mockResolvedValue(Howl),
    createLazyHowl: vi.fn((src: string | string[], options?: any) => {
      return new Howl({
        src: Array.isArray(src) ? src : [src],
        preload: false,
        html5: true,
        ...options,
      });
    }),
    preloadAudioOnDemand: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock useLocalStorageObject hook
vi.mock('@/hooks/useLocalStorageState', () => ({
  useLocalStorageObject: vi.fn(() => [
    { volume: 0.7, muted: false },
    vi.fn(),
    vi.fn(),
  ]),
}));

import { MusicProvider, useMusic } from '../MusicContext';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MusicProvider>{children}</MusicProvider>;
  };
}

describe('MusicContext iOS Safari Compatibility', () => {
  beforeEach(() => {
    howlConstructorCalls.length = 0;
    vi.clearAllMocks();
  });

  describe('Howl configuration for iOS', () => {
    it('should use html5: true for iOS Safari compatibility', () => {
      // Howl instances are lazy-initialized — unlock audio then trigger playTrack
      const { result } = renderHook(() => useMusic(), { wrapper: createWrapper() });

      act(() => {
        result.current.unlockAudio();
        result.current.playTrack('lobby');
      });

      expect(howlConstructorCalls.length).toBeGreaterThan(0);

      const hasHtml5False = howlConstructorCalls.some((call) => call.html5 === false);
      expect(hasHtml5False).toBe(false);
    });

    it('should configure all music tracks with html5: true', () => {
      const { result } = renderHook(() => useMusic(), { wrapper: createWrapper() });

      // Unlock audio then trigger lazy creation for all tracks
      const trackKeys = ['lobby', 'beforeGame', 'inGame', 'almostOutOfTime', 'bossaArcade', 'bossa'] as const;
      act(() => {
        result.current.unlockAudio();
        trackKeys.forEach((key) => result.current.playTrack(key));
      });

      const expectedTracks = [
        '/music/in_lobby.mp3',
        '/music/before_game.mp3',
        '/music/in_game.mp3',
        '/music/almost_out_of_time.mp3',
        '/music/bossa-arcade.mp3',
        '/music/bossa.mp3',
      ];

      expectedTracks.forEach((trackPath) => {
        const trackCall = howlConstructorCalls.find((call) =>
          call.src.includes(trackPath)
        );
        expect(trackCall).toBeDefined();
        expect(trackCall?.html5).toBe(true);
      });
    });
  });
});
