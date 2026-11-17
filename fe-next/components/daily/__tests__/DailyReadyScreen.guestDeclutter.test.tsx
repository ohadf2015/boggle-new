import React from 'react';
import { render, screen } from '@testing-library/react';
import DailyReadyScreen from '../DailyReadyScreen';

vi.mock('@/components/quests/QuestGoalChip', () => ({ QuestGoalChip: () => null }));
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
  onLanguageChange: vi.fn(),
  onStart: vi.fn(),
  onBack: vi.fn(),
  onShowTutorial: vi.fn(),
  t: (key: string) => key,
};

describe('DailyReadyScreen - guest ready screen stays on today\'s puzzle', () => {
  it('Given a guest, Then no custom-challenge sign-up promo renders', () => {
    render(<DailyReadyScreen {...baseProps} isAuthenticated={false} />);
    expect(screen.queryByText(/daily\.createChallengeFeature\./)).not.toBeInTheDocument();
  });

  it('Given a guest, Then exactly one small save-progress line renders, with no "Playing as Guest" banner', () => {
    render(<DailyReadyScreen {...baseProps} isAuthenticated={false} />);
    expect(screen.queryByText('daily.guestModeNotice')).not.toBeInTheDocument();
    expect(screen.getAllByText('daily.guestModeBenefits')).toHaveLength(1);
    expect(screen.getByTestId('guest-save-line').tagName).toBe('BUTTON');
  });

  it('Given a signed-in player, Then no guest save line renders', () => {
    render(<DailyReadyScreen {...baseProps} isAuthenticated={true} />);
    expect(screen.queryByTestId('guest-save-line')).not.toBeInTheDocument();
  });
});
