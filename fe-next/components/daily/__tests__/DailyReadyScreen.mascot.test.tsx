import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    preloadMusicTrack: vi.fn(),
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
    playTrack: vi.fn(),
    stopMusic: vi.fn(),
    fadeToTrack: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    unlockAudio: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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

vi.mock('@/components/daily/TabbedDailyLeaderboard', () => ({ default: () => null }));
vi.mock('@/components/daily/DailyIntroCarousel', () => ({ default: () => null }));
vi.mock('@/components/daily/CreateChallengeModal', () => ({ CreateChallengeModal: () => null }));
vi.mock('@/components/daily/UnauthenticatedCreateChallengeSection', () => ({
  UnauthenticatedCreateChallengeSection: () => null,
}));
vi.mock('@/components/auth/AuthModal', () => ({ default: () => null }));
vi.mock('@/utils/dailyChallenge', () => ({
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
  onLanguageChange: vi.fn(),
  onStart: vi.fn(),
  onBack: vi.fn(),
  onShowTutorial: vi.fn(),
  t: (k: string) => k,
};

describe('DailyReadyScreen - explorer mascot', () => {
  it('renders explorer mascot', () => {
    render(<DailyReadyScreen {...baseProps} />);
    expect(screen.getByTestId('mascot-explorer')).toBeInTheDocument();
  });
});
