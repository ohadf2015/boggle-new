/**
 * MusicContext iOS Safari Compatibility Tests
 *
 * Tests that audio is configured correctly for iOS Safari compatibility.
 * iOS Safari has strict requirements for Web Audio API that require special handling.
 *
 * Key iOS Safari Issues:
 * 1. Web Audio API (html5: false) doesn't play when device is in silent mode
 * 2. AudioContext requires user gesture to start
 * 3. Can throw InvalidStateError for device-related issues
 *
 * Solution:
 * Use html5: true for iOS Safari to ensure audio plays regardless of silent mode.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

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

// We need to import the actual module to test Howl configuration
// This must come after mocks are set up
import { MusicProvider, useMusic } from '../MusicContext';

// Helper wrapper for hooks
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
      // Render the provider to trigger Howl initialization
      renderHook(() => useMusic(), { wrapper: createWrapper() });

      // Check that all Howl instances are created with html5: true
      expect(howlConstructorCalls.length).toBeGreaterThan(0);

      // IMPORTANT: For iOS Safari, all audio should use html5: true
      // This ensures audio plays even when device is in silent mode
      const hasHtml5False = howlConstructorCalls.some((call) => call.html5 === false);

      // This test should FAIL with current implementation (html5: false)
      // and PASS after fix (html5: true)
      expect(hasHtml5False).toBe(false);
    });

    it('should configure all music tracks with html5: true', () => {
      renderHook(() => useMusic(), { wrapper: createWrapper() });

      // Expected music tracks
      const expectedTracks = [
        '/music/in_lobby.mp3',
        '/music/before_game.mp3',
        '/music/in_game.mp3',
        '/music/almost_out_of_time.mp3',
        '/music/bossa-arcade.mp3',
        '/music/bossa.mp3',
      ];

      // Verify all tracks are configured
      expectedTracks.forEach((trackPath) => {
        const trackCall = howlConstructorCalls.find((call) =>
          call.src.includes(trackPath)
        );
        expect(trackCall).toBeDefined();
        // Each track should use html5: true for iOS compatibility
        expect(trackCall?.html5).toBe(true);
      });
    });
  });
});
