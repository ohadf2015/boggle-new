import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    preloadMusicTrack: jest.fn(),
    TRACKS: {
      LOBBY: 'lobby',
      BEFORE_GAME: 'beforeGame',
      IN_GAME: 'inGame',
      ALMOST_OUT_OF_TIME: 'almostOutOfTime',
      BOSSA_ARCADE: 'bossaArcade',
      BOSSA: 'bossa',
    },
    currentTrack: null,
    volume: 0.5,
    isMuted: false,
    isPlaying: false,
    audioUnlocked: false,
    playTrack: jest.fn(),
    stopMusic: jest.fn(),
    fadeToTrack: jest.fn(),
    setVolume: jest.fn(),
    toggleMute: jest.fn(),
    unlockAudio: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: jest.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock('@/components/daily/TabbedDailyLeaderboard', () => () => null);
jest.mock('@/components/daily/DailyIntroCarousel', () => () => null);
jest.mock('@/components/daily/CreateChallengeModal', () => ({ CreateChallengeModal: () => null }));
jest.mock('@/components/daily/UnauthenticatedCreateChallengeSection', () => ({
  UnauthenticatedCreateChallengeSection: () => null,
}));
jest.mock('@/components/auth/AuthModal', () => () => null);
jest.mock('@/utils/dailyChallenge', () => ({
  hasPlayedWordHuntToday: () => false,
}));

import DailyReadyScreen from '../DailyReadyScreen';

const baseProps = {
  puzzleNumber: 123,
  puzzleDate: '2025-01-28',
  language: 'en' as const,
  currentFlag: '🇺🇸',
  challengeData: null,
  isAuthenticated: false,
  targetWordLength: 5,
  currentPlayerId: null,
  guestFingerprint: null,
  tutorialCompleted: true,
  onLanguageChange: jest.fn(),
  onStart: jest.fn(),
  onBack: jest.fn(),
  onShowTutorial: jest.fn(),
  t: (k: string) => k,
};

describe('DailyReadyScreen - explorer mascot', () => {
  it('renders explorer mascot', () => {
    render(<DailyReadyScreen {...baseProps} />);
    expect(screen.getByTestId('mascot-explorer')).toBeInTheDocument();
  });
});
