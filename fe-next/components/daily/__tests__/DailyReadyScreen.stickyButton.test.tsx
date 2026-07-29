/**
 * Tests for DailyReadyScreen mobile sticky play button safe-area handling.
 *
 * Regression: sticky CTA used `fixed bottom-16` (64px) which clipped on iOS
 * notch and Android nav bars. Must use `--bottom-stack-height` CSS var
 * (nav height + admob banner height + safe-area) to clear device chrome
 * AND the AdMob banner when it's shown above the bottom nav.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('DailyReadyScreen - Mobile sticky button safe area', () => {
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
    tutorialCompleted: true,
    onLanguageChange: vi.fn(),
    onStart: vi.fn(),
    onBack: vi.fn(),
    onShowTutorial: vi.fn(),
    t: (key: string) => key,
  };

  it('mobile sticky play button uses --bottom-stack-height CSS var (clears nav + banner)', () => {
    render(<DailyReadyScreen {...defaultProps} />);

    const playButtons = screen.getAllByRole('button', { name: /daily\.playButton/i });
    expect(playButtons.length).toBeGreaterThan(0);

    const stickyContainer = playButtons
      .map(btn => btn.closest('div.sm\\:hidden.fixed'))
      .find(el => el !== null) as HTMLElement | undefined;

    expect(stickyContainer).toBeTruthy();
    const cls = stickyContainer!.className;

    expect(cls).not.toMatch(/\bbottom-16\b/);
    expect(cls).toMatch(/bottom-\[var\(--bottom-stack-height,0px\)\]/);
  });
});
