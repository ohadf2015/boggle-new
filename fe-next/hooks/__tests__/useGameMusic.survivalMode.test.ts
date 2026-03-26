/**
 * Tests for useGameMusic with survival mode (fire-round earthquake state)
 * Verifies that bossa-arcade music plays automatically when game starts
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameMusic } from '../useGameMusic';
import * as MusicContextModule from '@/contexts/MusicContext';

// Mock MusicContext
vi.mock('@/contexts/MusicContext');

describe('useGameMusic - Survival Mode (fire-round)', () => {
  const mockFadeToTrack = vi.fn();
  const mockPlayTrack = vi.fn();

  const mockTracks: {
    LOBBY: 'lobby';
    BEFORE_GAME: 'beforeGame';
    IN_GAME: 'inGame';
    ALMOST_OUT_OF_TIME: 'almostOutOfTime';
    BOSSA_ARCADE: 'bossaArcade';
    BOSSA: 'bossa';
  } = {
    LOBBY: 'lobby',
    BEFORE_GAME: 'beforeGame',
    IN_GAME: 'inGame',
    ALMOST_OUT_OF_TIME: 'almostOutOfTime',
    BOSSA_ARCADE: 'bossaArcade',
    BOSSA: 'bossa',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock MusicContext with unlocked audio
    vi.spyOn(MusicContextModule, 'useMusic').mockReturnValue({
      currentTrack: null,
      volume: 0.5,
      isMuted: false,
      isPlaying: false,
      audioUnlocked: true, // Audio already unlocked
      playTrack: mockPlayTrack,
      stopMusic: vi.fn(),
      fadeToTrack: mockFadeToTrack,
      setVolume: vi.fn(),
      toggleMute: vi.fn(),
      unlockAudio: vi.fn(),
      preloadMusicTrack: vi.fn(),
      TRACKS: mockTracks,
    });
  });

  it('should play bossa-arcade when phase is playing and earthquakeState is fire-round', () => {
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

    // Should call fadeToTrack for both IN_GAME and BOSSA_ARCADE
    // The second call (BOSSA_ARCADE) should override the first
    expect(mockFadeToTrack).toHaveBeenCalled();

    // Get all calls to fadeToTrack
    const calls = mockFadeToTrack.mock.calls;

    // Should have at least one call for BOSSA_ARCADE
    const bossaArcadeCall = calls.find(
      (call) => call[0] === 'bossaArcade'
    );
    expect(bossaArcadeCall).toBeDefined();

    // BOSSA_ARCADE should be the last call (final music)
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe('bossaArcade');
  });

  it('should call fadeToTrack with correct fade durations for fire-round', () => {
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

    // Find the BOSSA_ARCADE call
    const bossaArcadeCall = mockFadeToTrack.mock.calls.find(
      (call) => call[0] === 'bossaArcade'
    );

    expect(bossaArcadeCall).toEqual(['bossaArcade', 800, 800]);
  });

  it('should NOT call fadeToTrack when disabled', () => {
    renderHook(() =>
      useGameMusic({
        phase: 'playing',
        remainingTime: null,
        totalTime: 180,
        isPaused: false,
        enabled: false, // Disabled
        earthquakeState: 'fire-round',
      })
    );

    expect(mockFadeToTrack).not.toHaveBeenCalled();
    expect(mockPlayTrack).not.toHaveBeenCalled();
  });

  it('should NOT trigger music when isPaused is true', () => {
    renderHook(() =>
      useGameMusic({
        phase: 'playing',
        remainingTime: null,
        totalTime: 180,
        isPaused: true, // Paused
        enabled: true,
        earthquakeState: 'fire-round',
      })
    );

    // Phase effect still runs but earthquake effect should not
    // So we might get IN_GAME but not BOSSA_ARCADE
    const bossaArcadeCall = mockFadeToTrack.mock.calls.find(
      (call) => call[0] === 'bossaArcade'
    );
    expect(bossaArcadeCall).toBeUndefined();
  });

  it('should still call fadeToTrack when audio not unlocked (queues for later)', () => {
    // Override mock to simulate audio not unlocked
    vi.spyOn(MusicContextModule, 'useMusic').mockReturnValue({
      currentTrack: null,
      volume: 0.5,
      isMuted: false,
      isPlaying: false,
      audioUnlocked: false, // Audio NOT unlocked
      playTrack: mockPlayTrack,
      stopMusic: vi.fn(),
      fadeToTrack: mockFadeToTrack,
      setVolume: vi.fn(),
      toggleMute: vi.fn(),
      unlockAudio: vi.fn(),
      preloadMusicTrack: vi.fn(),
      TRACKS: mockTracks,
    });

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

    // fadeToTrack should still be called - MusicContext handles the queueing
    expect(mockFadeToTrack).toHaveBeenCalled();

    // BOSSA_ARCADE should be called
    const bossaArcadeCall = mockFadeToTrack.mock.calls.find(
      (call) => call[0] === 'bossaArcade'
    );
    expect(bossaArcadeCall).toBeDefined();
  });
});
