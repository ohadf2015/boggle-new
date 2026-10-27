import React from 'react';
import { render, screen } from '@testing-library/react';
import DailyReadyScreen from '../DailyReadyScreen';

const params = vi.hoisted(() => ({ practice: null as string | null }));

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
  useSearchParams: () => ({ get: (k: string) => (k === 'practice' ? params.practice : null) }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
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

describe('DailyReadyScreen - one explanation, plus a practice board', () => {
  beforeEach(() => { params.practice = null; });

  it.each([false, true])('given auth=%s, then the ready screen no longer carries the intro carousel', (isAuthenticated) => {
    render(<DailyReadyScreen {...baseProps} isAuthenticated={isAuthenticated} />);
    expect(screen.queryByText('daily.carousel.header')).toBeNull();
    expect(screen.queryAllByLabelText(/Go to step/)).toHaveLength(0);
    expect(screen.getByRole('button', { name: /daily\.howToPlay/ })).toBeInTheDocument();
  });

  it.each([false, true])('given auth=%s, then a Practice board link opens the same page in practice for the UI locale', (isAuthenticated) => {
    render(<DailyReadyScreen {...baseProps} isAuthenticated={isAuthenticated} />);
    const link = screen.getByRole('link', { name: /daily\.practiceBoard/ });
    expect(link.getAttribute('href')).toBe('/he/daily/word-hunt?practice=1');
  });

  it('given the page is already in practice, then the Practice board link is hidden', () => {
    params.practice = '1';
    render(<DailyReadyScreen {...baseProps} />);
    expect(screen.queryByRole('link', { name: /daily\.practiceBoard/ })).toBeNull();
  });

  it('given a phone, then the scroller reserves room so the sticky PLAY never covers the last actions', () => {
    const { container } = render(<DailyReadyScreen {...baseProps} />);
    const scroller = container.querySelector('[data-daily-ready-content]') as HTMLElement;
    const spacer = screen.getByTestId('ready-sticky-cta-spacer');
    expect(scroller.lastElementChild).toBe(spacer);
    expect(spacer.className).toContain('sm:hidden');
  });
});
