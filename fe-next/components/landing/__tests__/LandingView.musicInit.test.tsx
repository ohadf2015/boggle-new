/**
 * RED test: LandingView must start ambient music via a single mount-time
 * call to playTrack(BOSSA). It must NOT register window pointerdown/keydown
 * listeners that duplicate MusicContext's own auto-unlock path (which caused
 * double playback of the Bossa track).
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LandingView from '../LandingView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';

vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/contexts/MusicContext');
vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), stopSound: vi.fn(), isSoundEnabled: true, toggleSound: vi.fn() }),
}));
vi.mock('@/contexts/CoinContext', () => ({ useCoin: () => ({ coins: 0, updateCoins: vi.fn() }) }));
vi.mock('@/contexts/HapticsContext', () => ({ useHapticsConfig: () => ({ isEnabled: true, toggle: vi.fn() }) }));
vi.mock('@/hooks/useLiveRoomStats', () => ({ useLiveRoomStats: () => ({ openRooms: 0, totalPlayers: 0, refresh: vi.fn() }) }));
vi.mock('@/hooks/useMobileLandscape', () => ({ useMobileLandscape: () => true }));
vi.mock('@/hooks/useMobilePortrait', () => ({ useMobilePortrait: () => false }));
vi.mock('@/hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({ x: 0, y: 0 }),
  useTiltEffect: () => ({ ref: { current: null }, style: {}, handlers: {} }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
}));
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
  hasSupabaseSession: () => false,
  markOnboardingComplete: vi.fn(),
  markOnboardingSkipped: vi.fn(),
}));
vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => false }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: false, prefersReducedMotion: true }),
}));
vi.mock('@/hooks/usePlayerStats', () => ({ usePlayerStats: () => ({ allTimeBest: null }) }));
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({
    hasPlayed: false, hasSolved: false, currentStreak: 0, puzzleNumber: 1, loading: false,
  }),
}));
vi.mock('@/hooks/useTopPlayers', () => ({ useTopPlayers: () => ({ players: [], loading: false }) }));
vi.mock('@/hooks/useLandingStats', () => ({
  useLandingStats: () => ({ activePlayers: 0, gamesToday: 0, gameModes: 0, languages: 5 }),
}));
vi.mock('@/hooks/useEvents', () => ({
  useEvents: () => ({ activeEvents: [], myEvents: [], joinEvent: vi.fn() }),
}));
vi.mock('@/utils/perfVariant', () => ({ getPerfVariant: () => 'low' }));
vi.mock('@/utils/growthTracking', () => ({ trackModeSelected: vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => () => <div /> }));
vi.mock('framer-motion', () => {
  const motionObj: Record<string, React.FC<React.PropsWithChildren<Record<string, unknown>>>> = new Proxy(
    {},
    { get: () => ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <div {...p}>{children}</div> }
  ) as never;
  return {
    m: motionObj, m: motionObj,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useMotionValue: () => ({ get: () => 0, set: () => {}, on: () => () => {} }),
    useSpring: (v: unknown) => v, useInView: () => true, useReducedMotion: () => false, animate: () => ({ stop: () => {} }),
  };
});
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('../LandingHero', () => ({ LandingHero: () => <div /> }));
vi.mock('../LandingChallengeCards', () => ({ LandingChallengeCards: () => <div /> }));
vi.mock('../LandingLeaderboardPreview', () => ({ LandingLeaderboardPreview: () => <div /> }));
vi.mock('../LandingSEOSection', () => ({ LandingSEOSection: () => <div />, ScrollIndicator: () => <div /> }));
vi.mock('@/components/ads', () => ({ AdPlaceholder: () => <div />, InlineBannerAd: () => <div /> }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('LandingView — music init', () => {
  const playTrack = vi.fn();
  const unlockAudio = vi.fn();

  beforeEach(() => {
    playTrack.mockClear();
    unlockAudio.mockClear();
    (useAuth as unknown as vi.Mock).mockReturnValue({ isAuthenticated: false, loading: false, profile: null });
    (useLanguage as unknown as vi.Mock).mockReturnValue({ t: (k: string) => k, language: 'en', dir: 'ltr' });
    (useMusic as unknown as vi.Mock).mockReturnValue({
      playTrack, unlockAudio, fadeToTrack: playTrack, TRACKS: { BOSSA: 'bossa', LOBBY: 'lobby' },
    });
  });

  it('calls playTrack(BOSSA) exactly once on mount, without requiring a user gesture', () => {
    render(<LandingView />, { wrapper });

    const bossaCalls = playTrack.mock.calls.filter((c) => c[0] === 'bossa');
    expect(bossaCalls).toHaveLength(1);
  });

  it('does not register window pointerdown/keydown listeners that would trigger duplicate playback', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<LandingView />, { wrapper });

    const landingListeners = addSpy.mock.calls.filter(
      ([evt]) => evt === 'pointerdown' || evt === 'keydown'
    );
    expect(landingListeners).toHaveLength(0);
    addSpy.mockRestore();
  });

  it('does not re-trigger playTrack when the user taps the document', () => {
    render(<LandingView />, { wrapper });
    playTrack.mockClear();

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
      document.dispatchEvent(new Event('click'));
    });

    expect(playTrack).not.toHaveBeenCalled();
  });
});
