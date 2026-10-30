import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DailyReadyScreen from '../DailyReadyScreen';

vi.mock('../TabbedDailyLeaderboard', () => ({ __esModule: true, default: () => <div data-testid="daily-board" /> }));


vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    preloadMusicTrack: vi.fn(),
    TRACKS: { BOSSA_ARCADE: 'bossaArcade', IN_GAME: 'inGame' },
    currentTrack: null, volume: 0.5, isMuted: false, isPlaying: false,
    audioUnlocked: false, playTrack: vi.fn(), stopMusic: vi.fn(),
    fadeToTrack: vi.fn(), setVolume: vi.fn(), toggleMute: vi.fn(), unlockAudio: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: false, loading: false, signIn: vi.fn(), signOut: vi.fn() }),
}));

function viewport(desktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: desktop && query.includes('1024'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('DailyReadyScreen — leaderboard mounts once, only where it is seen', () => {
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

  afterEach(() => vi.unstubAllGlobals());

  it('on a phone, mounts no hidden desktop board (it would poll unseen)', async () => {
    viewport(false);
    await act(async () => { render(<DailyReadyScreen {...defaultProps} />); });
    expect(screen.queryByTestId('daily-board')).not.toBeInTheDocument();
  });

  it('on desktop, mounts the sidebar board once', async () => {
    viewport(true);
    await act(async () => { render(<DailyReadyScreen {...defaultProps} />); });
    expect(screen.getAllByTestId('daily-board')).toHaveLength(1);
  });
});
