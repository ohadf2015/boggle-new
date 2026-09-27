/**
 * Tests for useGameMusic automatic music playback when Word Hunt starts
 *
 * BUG: Music doesn't play automatically when Word Hunt starts, only after
 * user interacts with the sound controller.
 *
 * Expected flow:
 * 1. User clicks "Play" button
 * 2. handleStartGame calls unlockAudio() then setPhase('playing')
 * 3. DailyWordHuntSurvival mounts with useGameMusic(earthquakeState='fire-round')
 * 4. Music should play automatically
 *
 * Actual behavior: Music doesn't play until user clicks sound controller
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameMusic } from '../useGameMusic';

// Track all calls to MusicContext methods
const mockCalls = {
  fadeToTrack: [] as Array<{ trackKey: string; fadeOutMs: number; fadeInMs: number }>,
  playTrack: [] as Array<{ trackKey: string }>,
};

// Simulate MusicContext state
let mockAudioUnlocked = false;
let mockPendingTrack: { trackKey: string; fadeOutMs: number; fadeInMs: number } | null = null;

// Mock MusicContext
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    fadeToTrack: vi.fn((trackKey: string, fadeOutMs = 1000, fadeInMs = 1000) => {
      mockCalls.fadeToTrack.push({ trackKey, fadeOutMs, fadeInMs });

      // Simulate real MusicContext behavior
      if (!mockAudioUnlocked) {
        // Queue the track when audio is locked
        mockPendingTrack = { trackKey, fadeOutMs, fadeInMs };
        return;
      }

      // When audio is unlocked, "play" the track
      // (In real code, this calls newHowl.play())
    }),
    playTrack: vi.fn((trackKey: string) => {
      mockCalls.playTrack.push({ trackKey });
    }),
    TRACKS: {
      LOBBY: 'lobby',
      BEFORE_GAME: 'beforeGame',
      IN_GAME: 'inGame',
      ALMOST_OUT_OF_TIME: 'almostOutOfTime',
      BOSSA_ARCADE: 'bossaArcade',
      BOSSA: 'bossa',
    },
  }),
}));

describe('useGameMusic - Auto Play on Word Hunt Mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalls.fadeToTrack = [];
    mockCalls.playTrack = [];
    mockAudioUnlocked = false;
    mockPendingTrack = null;
  });

  describe('Production scenario: unlockAudio called BEFORE hook mounts', () => {
    it('should call fadeToTrack with bossaArcade when audio is already unlocked', () => {
      // GIVEN: Audio is already unlocked (simulates unlockAudio() called in handleStartGame)
      mockAudioUnlocked = true;

      // WHEN: useGameMusic hook mounts with fire-round state (Word Hunt)
      renderHook(() =>
        useGameMusic({
          phase: 'playing',
          remainingTime: null,
          totalTime: 180,
          isPaused: false,
          enabled: true,
          earthquakeState: 'fire-round',
        })
      );

      // THEN: fadeToTrack should be called with bossaArcade
      const bossaArcadeCalls = mockCalls.fadeToTrack.filter((c) => c.trackKey === 'bossaArcade');
      expect(bossaArcadeCalls).toHaveLength(1);

      // AND: inGame should NOT be called (earthquake takes priority)
      const inGameCalls = mockCalls.fadeToTrack.filter((c) => c.trackKey === 'inGame');
      expect(inGameCalls).toHaveLength(0);
    });

    it('should NOT queue the track when audio is already unlocked', () => {
      // GIVEN: Audio is already unlocked
      mockAudioUnlocked = true;

      // WHEN: useGameMusic hook mounts
      renderHook(() =>
        useGameMusic({
          phase: 'playing',
          remainingTime: null,
          totalTime: 180,
          isPaused: false,
          enabled: true,
          earthquakeState: 'fire-round',
        })
      );

      // THEN: Track should NOT be queued (it should play immediately)
      expect(mockPendingTrack).toBeNull();
    });
  });

  describe('Bug scenario: audio NOT unlocked when hook mounts', () => {
    it('should queue the track when audio is NOT unlocked', () => {
      // GIVEN: Audio is NOT unlocked (simulates race condition or timing issue)
      mockAudioUnlocked = false;

      // WHEN: useGameMusic hook mounts
      renderHook(() =>
        useGameMusic({
          phase: 'playing',
          remainingTime: null,
          totalTime: 180,
          isPaused: false,
          enabled: true,
          earthquakeState: 'fire-round',
        })
      );

      // THEN: fadeToTrack should still be called (by the hook)
      expect(mockCalls.fadeToTrack.length).toBeGreaterThan(0);

      // AND: The track should be queued (because audio is locked)
      expect(mockPendingTrack).not.toBeNull();
      expect(mockPendingTrack?.trackKey).toBe('bossaArcade');
    });
  });
});
