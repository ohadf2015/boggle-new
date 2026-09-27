/**
 * Tests for DailyReadyScreen music preloading
 *
 * Verifies that music tracks are preloaded while on the ready screen
 * so they play instantly when the game starts.
 */

import React from 'react';
import { render } from '@testing-library/react';
import DailyReadyScreen from '../DailyReadyScreen';

// Mock the MusicContext
const mockPreloadMusicTrack = vi.fn();
const mockTracks = {
  LOBBY: 'lobby',
  BEFORE_GAME: 'beforeGame',
  IN_GAME: 'inGame',
  ALMOST_OUT_OF_TIME: 'almostOutOfTime',
  BOSSA_ARCADE: 'bossaArcade',
  BOSSA: 'bossa',
};

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    preloadMusicTrack: mockPreloadMusicTrack,
    TRACKS: mockTracks,
    currentTrack: null,
    volume: 0.5,
    isMuted: false,
    isPlaying: false,
    audioUnlocked: false,
    playTrack: vi.fn(),
    stopMusic: vi.fn(),
    fadeToTrack: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    unlockAudio: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Mock ThemeContext
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

describe('DailyReadyScreen - Music Preloading', () => {
  const defaultProps = {
    puzzleNumber: 123,
    puzzleDate: '2025-01-28',
    language: 'en' as const,
    currentFlag: '🇺🇸',
    challengeData: null,
    isAuthenticated: false,
    targetWordLength: 5,
    currentPlayerId: null,
    guestFingerprint: null,
    onLanguageChange: vi.fn(),
    onStart: vi.fn(),
    onBack: vi.fn(),
    onShowTutorial: vi.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should preload BOSSA_ARCADE music track on mount', () => {
    render(<DailyReadyScreen {...defaultProps} />);

    expect(mockPreloadMusicTrack).toHaveBeenCalledWith('bossaArcade');
  });

  it('should preload IN_GAME music track on mount', () => {
    render(<DailyReadyScreen {...defaultProps} />);

    expect(mockPreloadMusicTrack).toHaveBeenCalledWith('inGame');
  });

  it('should preload both tracks (BOSSA_ARCADE and IN_GAME)', () => {
    render(<DailyReadyScreen {...defaultProps} />);

    // Verify both tracks are preloaded
    expect(mockPreloadMusicTrack).toHaveBeenCalledTimes(2);
    const calls = mockPreloadMusicTrack.mock.calls.map(call => call[0]);
    expect(calls).toContain('bossaArcade');
    expect(calls).toContain('inGame');
  });

  it('should only preload once (not on every render)', () => {
    const { rerender } = render(<DailyReadyScreen {...defaultProps} />);

    // First render
    expect(mockPreloadMusicTrack).toHaveBeenCalledTimes(2);

    // Clear mock and rerender
    mockPreloadMusicTrack.mockClear();
    rerender(<DailyReadyScreen {...defaultProps} puzzleNumber={456} />);

    // Should not preload again (useEffect deps are stable)
    expect(mockPreloadMusicTrack).toHaveBeenCalledTimes(0);
  });
});
