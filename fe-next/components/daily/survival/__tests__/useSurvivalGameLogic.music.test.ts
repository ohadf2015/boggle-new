/**
 * Tests for Word Hunt survival music playback
 * Verifies that music starts automatically when game begins
 */

import { renderHook, act } from '@testing-library/react';
import { useSurvivalGameLogic } from '../useSurvivalGameLogic';
import * as MusicContextModule from '@/contexts/MusicContext';
import * as GameMusicModule from '@/hooks/useGameMusic';

// Mock contexts and hooks
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
  }),
}));
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    setGameActive: jest.fn(),
  }),
}));
jest.mock('@/contexts/MusicContext');
jest.mock('@/hooks/useGameMusic');

describe('useSurvivalGameLogic - Music', () => {
  const mockFadeToTrack = jest.fn();
  const mockUseGameMusic = jest.fn(() => ({
    resetUrgentMusic: jest.fn(),
  }));

  const defaultProps = {
    grid: Array(3).fill(null).map(() => Array(3).fill('A')),
    puzzleNumber: 1,
    language: 'en' as const,
    targetWord: 'TEST',
    onComplete: jest.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MusicContext
    jest.spyOn(MusicContextModule, 'useMusic').mockReturnValue({
      currentTrack: null,
      volume: 0.5,
      isMuted: false,
      isPlaying: false,
      audioUnlocked: false,
      playTrack: jest.fn(),
      stopMusic: jest.fn(),
      fadeToTrack: mockFadeToTrack,
      setVolume: jest.fn(),
      toggleMute: jest.fn(),
      unlockAudio: jest.fn(),
      preloadMusicTrack: jest.fn(),
      TRACKS: {
        LOBBY: 'lobby',
        BEFORE_GAME: 'beforeGame',
        IN_GAME: 'inGame',
        ALMOST_OUT_OF_TIME: 'almostOutOfTime',
        BOSSA_ARCADE: 'bossaArcade',
        BOSSA: 'bossa',
      },
    });

    // Mock useGameMusic
    jest.spyOn(GameMusicModule, 'useGameMusic').mockImplementation(mockUseGameMusic);
  });

  it('should use useGameMusic hook to play music automatically', () => {
    renderHook(() => useSurvivalGameLogic(defaultProps));

    // Should call useGameMusic with playing phase
    expect(mockUseGameMusic).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'playing',
        enabled: true,
      })
    );
  });

  it('should NOT directly call fadeToTrack on mount', () => {
    renderHook(() => useSurvivalGameLogic(defaultProps));

    // Should NOT call fadeToTrack directly (useGameMusic handles it)
    expect(mockFadeToTrack).not.toHaveBeenCalled();
  });

  it('should call useGameMusic with appropriate params', () => {
    renderHook(() => useSurvivalGameLogic(defaultProps));

    // Should call useGameMusic with correct initial params
    expect(mockUseGameMusic).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'playing',
        enabled: true,
        earthquakeState: 'fire-round', // Always fire-round for survival
        isPaused: false, // Initially not paused
      })
    );
  });
});
