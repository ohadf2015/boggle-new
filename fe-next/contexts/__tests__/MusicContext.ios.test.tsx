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
jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation((options) => {
    howlConstructorCalls.push({
      src: options.src,
      html5: options.html5,
    });
    return {
      play: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      fade: jest.fn(),
      volume: jest.fn(),
      seek: jest.fn(),
      unload: jest.fn(),
      load: jest.fn(),
      state: jest.fn().mockReturnValue('loaded'),
      playing: jest.fn().mockReturnValue(false),
    };
  }),
  Howler: {
    ctx: {
      state: 'running',
      resume: jest.fn().mockResolvedValue(undefined),
      suspend: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock useLocalStorageObject hook
jest.mock('@/hooks/useLocalStorageState', () => ({
  useLocalStorageObject: jest.fn(() => [
    { volume: 0.7, muted: false },
    jest.fn(),
    jest.fn(),
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
    jest.clearAllMocks();
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
