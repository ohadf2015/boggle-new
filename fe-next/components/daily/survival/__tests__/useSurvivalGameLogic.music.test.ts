/**
 * Tests for Word Hunt survival music playback
 * Verifies that music starts automatically when game begins
 */

import { renderHook, act } from '@testing-library/react';
import { useSurvivalGameLogic } from '../useSurvivalGameLogic';
import * as MusicContextModule from '@/contexts/MusicContext';
import * as GameMusicModule from '@/hooks/useGameMusic';

// Mock contexts and hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));
vi.mock('@/contexts/MusicContext');
vi.mock('@/hooks/useGameMusic');

describe('useSurvivalGameLogic - Music', () => {
  const mockFadeToTrack = vi.fn();
  const mockUseGameMusic = vi.fn(() => ({
    resetUrgentMusic: vi.fn(),
  }));

  const defaultProps = {
    grid: Array(3).fill(null).map(() => Array(3).fill('A')),
    puzzleNumber: 1,
    language: 'en' as const,
    targetWord: 'TEST',
    onComplete: vi.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock MusicContext
    vi.spyOn(MusicContextModule, 'useMusic').mockReturnValue({
      currentTrack: null,
      volume: 0.5,
      isMuted: false,
      isPlaying: false,
      audioUnlocked: false,
      playTrack: vi.fn(),
      stopMusic: vi.fn(),
      fadeToTrack: mockFadeToTrack,
      setVolume: vi.fn(),
      toggleMute: vi.fn(),
      unlockAudio: vi.fn(),
      preloadMusicTrack: vi.fn(),
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
    vi.spyOn(GameMusicModule, 'useGameMusic').mockImplementation(mockUseGameMusic);
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
