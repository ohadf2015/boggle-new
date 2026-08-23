/**
 * Homepage blog section: must surface the 3 NEWEST blog posts (the ones
 * authored most recently per LandingBlogSection's `recentPosts` array).
 *
 * Regression guard: the previous version of the homepage rendered three
 * stale slugs (science-behind-word-games / why-word-games-are-addictive /
 * daily-challenge-strategies) hardcoded inside LandingSEOSection's
 * `blogLinks`. That data path was duplicated and went unmaintained — so
 * even after `recentPosts` was updated to the new posts, the homepage
 * kept showing the old ones.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LandingView from '../LandingView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { getRecentBlogPostsForLocale } from '@/lib/blog/data';

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
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, isLoading: false }),
}));
vi.mock('next/dynamic', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    default: (importFn: () => Promise<Record<string, unknown>>) => {
      const LazyComponent = (props: Record<string, unknown>) => {
        const [Component, setComponent] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null);
        React.useEffect(() => {
          importFn().then((mod) => {
          const Comp = (
            typeof mod === 'function'
              ? mod
              : (mod.default || mod[Object.keys(mod)[0]])
          ) as React.ComponentType<Record<string, unknown>>;
          setComponent(() => Comp);
          });
        }, []);
        return Component ? React.createElement(Component, props) : null;
      };
      return LazyComponent;
    },
    __esModule: true,
  };
});
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
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, ...rest }: { alt: string }) => <img alt={alt} {...rest} />,
}));
vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('../LandingHero', () => ({ LandingHero: () => <div /> }));
vi.mock('../LandingChallengeCards', () => ({ LandingChallengeCards: () => <div /> }));
vi.mock('../LandingLeaderboardPreview', () => ({ LandingLeaderboardPreview: () => <div /> }));
vi.mock('../LandingSocialProofBar', () => ({ LandingSocialProofBar: () => <div /> }));
vi.mock('../LandingAvatarTeaser', () => ({ LandingAvatarTeaser: () => <div /> }));
vi.mock('../LandingSEOSection', () => ({ LandingSEOSection: () => <div /> }));
vi.mock('../LandingBottomCTA', () => ({ LandingBottomCTA: () => <div /> }));
vi.mock('../LandingYourRank', () => ({ LandingYourRank: () => <div /> }));
vi.mock('@/components/ads', () => ({ AdPlaceholder: () => <div />, InlineBannerAd: () => <div /> }));
vi.mock('@/components/events/EventBanner', () => ({ default: () => <div /> }));
vi.mock('@/components/auth/AuthModal', () => ({ default: () => <div /> }));
vi.mock('../ShareReferralModal', () => ({ ShareReferralModal: () => <div /> }));
vi.mock('@/components/ui/PlayfulBackground', () => ({ PlayfulBackground: () => <div /> }));
vi.mock('@/components/education/HomeEducationCardConnected', () => ({ HomeEducationCardConnected: () => <div /> }));
vi.mock('@/components/CrazyGamesBanner', () => ({ default: () => <div /> }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('LandingView — homepage blog section', () => {
  beforeEach(() => {
    (useAuth as unknown as vi.Mock).mockReturnValue({ isAuthenticated: false, loading: false, profile: null });
    (useLanguage as unknown as vi.Mock).mockReturnValue({ t: (k: string) => k, language: 'en', dir: 'ltr' });
    (useMusic as unknown as vi.Mock).mockReturnValue({
      playTrack: vi.fn(), unlockAudio: vi.fn(), fadeToTrack: vi.fn(),
      TRACKS: { BOSSA: 'bossa', LOBBY: 'lobby' },
    });
  });

  it('renders the 3 newest blog post links (not the legacy stale set)', async () => {
    const { container } = render(<LandingView />, { wrapper });

    const expectedSlugs = getRecentBlogPostsForLocale('en', 3).map((p) => `/en/blog/${p.slug}`);
    await waitFor(() => {
      const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') || '');
      expect(hrefs).toEqual(expect.arrayContaining(expectedSlugs));
    });

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') || '');

    // The legacy slugs that were hardcoded in LandingSEOSection.blogLinks
    // must NOT leak through any other path on the homepage.
    const legacy = [
      '/en/blog/science-behind-word-games',
      '/en/blog/why-word-games-are-addictive',
      '/en/blog/daily-challenge-strategies',
    ];
    for (const stale of legacy) {
      expect(hrefs).not.toContain(stale);
    }
  });
});
