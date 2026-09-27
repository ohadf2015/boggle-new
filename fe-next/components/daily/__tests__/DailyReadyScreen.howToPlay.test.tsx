/**
 * The Word Hunt tutorial popup auto-shows once, then a localStorage flag hides
 * it forever. To let players re-watch the (redesigned, image-led) tutorial, the
 * ready screen must expose a "How to play" trigger that calls onShowTutorial.
 * This is the only path back to the tutorial after first run.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyReadyScreen from '../DailyReadyScreen';

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

describe('DailyReadyScreen - How to play trigger', () => {
  it('renders a How to play button for guests and invokes onShowTutorial on click', () => {
    const onShowTutorial = vi.fn();
    render(<DailyReadyScreen {...baseProps} isAuthenticated={false} onShowTutorial={onShowTutorial} />);

    const btn = screen.getByRole('button', { name: /daily\.howToPlay/i });
    fireEvent.click(btn);
    expect(onShowTutorial).toHaveBeenCalledTimes(1);
  });

  it('renders a How to play button for authenticated players too', () => {
    const onShowTutorial = vi.fn();
    render(<DailyReadyScreen {...baseProps} isAuthenticated={true} onShowTutorial={onShowTutorial} />);

    const btn = screen.getByRole('button', { name: /daily\.howToPlay/i });
    fireEvent.click(btn);
    expect(onShowTutorial).toHaveBeenCalledTimes(1);
  });
});
