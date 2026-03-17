/**
 * SoundEffectsContext iOS Safari Compatibility Tests
 *
 * Tests that sound effects are configured correctly for iOS Safari.
 *
 * Note: SoundEffectsContext uses pitch shifting (rate) for combo sounds.
 * html5: true mode in Howler.js has LIMITED pitch control support.
 * However, iOS compatibility is more important than pitch shifting.
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
      play: jest.fn().mockReturnValue(1),
      stop: jest.fn(),
      pause: jest.fn(),
      fade: jest.fn(),
      volume: jest.fn(),
      seek: jest.fn(),
      unload: jest.fn(),
      load: jest.fn(),
      state: jest.fn().mockReturnValue('loaded'),
      playing: jest.fn().mockReturnValue(false),
      rate: jest.fn(),
      loop: jest.fn(),
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

// Mock audioLoader to use mocked Howl constructor
jest.mock('@/lib/audio/audioLoader', () => {
  const { Howl } = require('howler');
  return {
    ensureHowl: jest.fn().mockResolvedValue(Howl),
    createLazyHowl: jest.fn((src: string | string[], options?: any) => {
      return new Howl({
        src: Array.isArray(src) ? src : [src],
        preload: false,
        html5: true,
        ...options,
      });
    }),
    preloadAudioOnDemand: jest.fn().mockResolvedValue(undefined),
    preloadByPriority: jest.fn().mockResolvedValue(undefined),
    AUDIO_LOAD_PRIORITY: { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 },
  };
});

// Mock MusicContext - SoundEffectsProvider depends on it
jest.mock('../MusicContext', () => ({
  useMusic: jest.fn(() => ({
    audioUnlocked: true,
    isMuted: false,
    volume: 0.5,
  })),
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

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  hapticAchievement: jest.fn(),
  hapticForComboLevel: jest.fn(),
  hapticComboBreak: jest.fn(),
  hapticComboSaved: jest.fn(),
}));

// Mock useLocalStorageObject hook
jest.mock('@/hooks/useLocalStorageState', () => ({
  useLocalStorageObject: jest.fn(() => [
    { volume: 0.7, muted: false },
    jest.fn(),
    jest.fn(),
  ]),
}));

// Import after mocks
import { SoundEffectsProvider, useSoundEffects } from '../SoundEffectsContext';

// Helper wrapper
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <SoundEffectsProvider>{children}</SoundEffectsProvider>;
  };
}

describe('SoundEffectsContext iOS Safari Compatibility', () => {
  beforeEach(() => {
    howlConstructorCalls.length = 0;
    jest.clearAllMocks();
  });

  describe('Howl configuration for iOS', () => {
    it('should use html5: true for iOS Safari sound effects', async () => {
      renderHook(() => useSoundEffects(), { wrapper: createWrapper() });

      // Wait for ensureHowl().then() to resolve and create sound instances
      await new Promise((r) => setTimeout(r, 0));

      // Sound effects should be configured for iOS
      expect(howlConstructorCalls.length).toBeGreaterThan(0);

      // All sound effects should use html5: true for iOS compatibility
      const hasHtml5False = howlConstructorCalls.some((call) => call.html5 === false);

      // This test should FAIL with current implementation (html5: false)
      // and PASS after fix (html5: true)
      expect(hasHtml5False).toBe(false);
    });

    it('should configure all sound effects with html5: true', async () => {
      renderHook(() => useSoundEffects(), { wrapper: createWrapper() });

      // Wait for ensureHowl().then() to resolve and create sound instances
      await new Promise((r) => setTimeout(r, 0));

      // Expected sound effects
      const expectedSounds = [
        '/sounds/achievment.mp3',
        '/sounds/combo.wav',
        '/sounds/word-accepted.wav',
        '/sounds/countdown-beep.wav',
        '/sounds/message.mp3',
        '/sounds/combo-milestone.mp3',
        '/sounds/combo-break.mp3',
        '/sounds/combo-saved.mp3',
        '/sounds/earthquake-rumble.wav',
        '/sounds/earthquake-shake.wav',
        '/sounds/fire-round-start.wav',
        '/sounds/fire-crackle-loop.wav',
      ];

      // Verify all sounds are configured with html5: true
      expectedSounds.forEach((soundPath) => {
        const soundCall = howlConstructorCalls.find((call) =>
          call.src.includes(soundPath)
        );
        expect(soundCall).toBeDefined();
        expect(soundCall?.html5).toBe(true);
      });
    });
  });
});
