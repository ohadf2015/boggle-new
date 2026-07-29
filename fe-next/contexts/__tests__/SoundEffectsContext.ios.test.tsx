import { vi, type Mock, } from 'vitest';
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
import { renderHook, waitFor, act } from '@testing-library/react';

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
      play: vi.fn().mockReturnValue(1),
      stop: vi.fn(),
      pause: vi.fn(),
      fade: vi.fn(),
      volume: vi.fn(),
      seek: vi.fn(),
      unload: vi.fn(),
      load: vi.fn(),
      state: vi.fn().mockReturnValue('loaded'),
      playing: vi.fn().mockReturnValue(false),
      rate: vi.fn(),
      loop: vi.fn(),
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
vi.mock('@/lib/audio/audioLoader', async () => {
  const { Howl } = await import('howler');
  return {
    ensureHowl: vi.fn().mockResolvedValue(Howl),
    createLazyHowl: vi.fn((src: string | string[], options?: any) => {
      return Howl({
        src: Array.isArray(src) ? src : [src],
        preload: false,
        html5: true,
        ...options,
      });
    }),
    preloadAudioOnDemand: vi.fn().mockResolvedValue(undefined),
    preloadByPriority: vi.fn().mockResolvedValue(undefined),
    AUDIO_LOAD_PRIORITY: { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 },
  };
});

// Mock MusicContext - SoundEffectsProvider depends on it
vi.mock('../MusicContext', () => ({
  useMusic: vi.fn(() => ({
    audioUnlocked: true,
    isMuted: false,
    volume: 0.5,
  })),
}));

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

// Mock haptics
vi.mock('@/utils/haptics', () => ({
  hapticAchievement: vi.fn(),
  hapticForComboLevel: vi.fn(),
  hapticComboBreak: vi.fn(),
  hapticComboSaved: vi.fn(),
}));

// Mock useLocalStorageObject hook
vi.mock('@/hooks/useLocalStorageState', () => ({
  useLocalStorageObject: vi.fn(() => [
    { volume: 0.7, muted: false },
    vi.fn(),
    vi.fn(),
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
    vi.clearAllMocks();
  });

  describe('Howl configuration for iOS', () => {
    it('should use html5: true for iOS Safari sound effects', async () => {
      await act(async () => {
        renderHook(() => useSoundEffects(), { wrapper: createWrapper() });
      });

      // Wait for ensureHowl().then() to resolve and create sound instances
      await waitFor(() => {
        expect(howlConstructorCalls.length).toBeGreaterThan(0);
      });

      // All sound effects should use html5: true for iOS compatibility
      const hasHtml5False = howlConstructorCalls.some((call) => call.html5 === false);

      // This test should FAIL with current implementation (html5: false)
      // and PASS after fix (html5: true)
      expect(hasHtml5False).toBe(false);
    });

    it('should configure all sound effects with html5: true', async () => {
      await act(async () => {
        renderHook(() => useSoundEffects(), { wrapper: createWrapper() });
      });

      // Wait for ensureHowl().then() to resolve and create sound instances
      await waitFor(() => {
        expect(howlConstructorCalls.length).toBeGreaterThan(0);
      });

      // Expected sound effects
      const expectedSounds = [
        '/sounds/achievement.mp3',
        '/sounds/combo.mp3',
        '/sounds/word-accepted.mp3',
        '/sounds/countdown-beep.mp3',
        '/sounds/message.mp3',
        '/sounds/combo-milestone.mp3',
        '/sounds/combo-break.mp3',
        '/sounds/combo-saved.mp3',
        '/sounds/earthquake-rumble.mp3',
        '/sounds/earthquake-shake.mp3',
        '/sounds/fire-round-start.mp3',
        '/sounds/fire-crackle-loop.mp3',
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
