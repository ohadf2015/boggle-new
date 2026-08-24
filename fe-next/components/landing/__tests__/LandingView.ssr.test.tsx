/**
 * SSR guard: the landing page's authored SEO copy (LandingSEOSection) and the
 * /blog interlinks (LandingBlogSection) MUST be present in the SERVER HTML.
 *
 * Regression: a perf pass converted both to `dynamic(..., { ssr: false })`, so
 * server HTML emitted an animate-pulse skeleton instead of the <h2> headings and
 * the internal blog links — invisible to crawlers that don't execute JS. It
 * shipped green because the sibling blogSection test resolves next/dynamic in a
 * useEffect and asserts inside `waitFor`, which can't tell server HTML from
 * post-hydration output.
 *
 * renderToString runs no effects, so it reflects exactly what a crawler sees.
 * The next/dynamic mock below is faithful on the one axis that matters:
 * `ssr: false` renders ONLY the loading fallback.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import LandingView from '../LandingView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { getRecentBlogPostsForLocale } from '@/lib/blog/data';
import { contentByLocale } from '../landingSEOContent';

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
// The one mock that carries the assertion: honour the `ssr` option the way
// next/dynamic does — `ssr: false` = absent from server HTML.
vi.mock('next/dynamic', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const g = globalThis as unknown as { __ssrDynamicReady: Promise<unknown>[] };
  g.__ssrDynamicReady = [];
  type Opts = { ssr?: boolean; loading?: React.ComponentType };
  return {
    __esModule: true,
    default: (importFn: () => Promise<Record<string, unknown>>, options?: Opts) => {
      if (options?.ssr === false) {
        const NoSSR = () => (options.loading ? React.createElement(options.loading) : null);
        NoSSR.displayName = 'DynamicNoSSR';
        return NoSSR;
      }
      let Resolved: React.ComponentType<Record<string, unknown>> | null = null;
      g.__ssrDynamicReady.push(
        importFn().then((mod) => {
          Resolved = (typeof mod === 'function'
            ? mod
            : mod.default || mod[Object.keys(mod)[0]]) as React.ComponentType<Record<string, unknown>>;
        })
      );
      const Dynamic = (props: Record<string, unknown>) =>
        Resolved ? React.createElement(Resolved, props) : null;
      Dynamic.displayName = 'DynamicSSR';
      return Dynamic;
    },
  };
});
vi.mock('framer-motion', () => {
  const motionObj: Record<string, React.FC<React.PropsWithChildren<Record<string, unknown>>>> = new Proxy(
    {},
    { get: () => ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <div>{children}</div> }
  ) as never;
  return {
    m: motionObj,
    motion: motionObj,
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
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={typeof src === 'string' ? src : ''} />,
}));
vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('../LandingHero', () => ({ LandingHero: () => <div /> }));
vi.mock('../LandingChallengeCards', () => ({ LandingChallengeCards: () => <div /> }));
vi.mock('../LandingLeaderboardPreview', () => ({ LandingLeaderboardPreview: () => <div /> }));
vi.mock('../LandingSocialProofBar', () => ({ LandingSocialProofBar: () => <div /> }));
vi.mock('../LandingAvatarTeaser', () => ({ LandingAvatarTeaser: () => <div /> }));
vi.mock('../LandingYourRank', () => ({ LandingYourRank: () => <div /> }));
vi.mock('@/components/ads', () => ({ AdPlaceholder: () => <div />, InlineBannerAd: () => <div /> }));
vi.mock('@/components/events/EventBanner', () => ({ default: () => <div /> }));
vi.mock('@/components/auth/AuthModal', () => ({ default: () => <div /> }));
vi.mock('../ShareReferralModal', () => ({ ShareReferralModal: () => <div /> }));
vi.mock('@/components/ui/PlayfulBackground', () => ({ PlayfulBackground: () => <div /> }));
vi.mock('@/components/education/HomeEducationCardConnected', () => ({ HomeEducationCardConnected: () => <div /> }));
vi.mock('@/components/CrazyGamesBanner', () => ({ default: () => <div /> }));

describe('LandingView — server HTML contains the SEO + blog interlink surface', () => {
  beforeAll(async () => {
    // Drain the dynamic() imports (resolving one may register nested ones).
    const g = globalThis as unknown as { __ssrDynamicReady: Promise<unknown>[] };
    for (let i = 0; i < 5; i++) {
      const pending = g.__ssrDynamicReady.splice(0);
      if (!pending.length) break;
      await Promise.all(pending);
    }
  });

  beforeEach(() => {
    (useAuth as unknown as vi.Mock).mockReturnValue({ isAuthenticated: false, loading: false, profile: null });
    (useLanguage as unknown as vi.Mock).mockReturnValue({ t: (k: string) => k, language: 'en', dir: 'ltr' });
    (useMusic as unknown as vi.Mock).mockReturnValue({
      playTrack: vi.fn(), unlockAudio: vi.fn(), fadeToTrack: vi.fn(),
      TRACKS: { BOSSA: 'bossa', LOBBY: 'lobby' },
    });
  });

  it('emits the authored SEO headings, not a skeleton', () => {
    const html = renderToString(<LandingView />);
    expect(html).toContain(contentByLocale.en.whatIsTitle);
    expect(html).toContain(contentByLocale.en.howToPlayTitle);
  });

  it('emits the internal /blog links', () => {
    const html = renderToString(<LandingView />);
    for (const post of getRecentBlogPostsForLocale('en', 3)) {
      expect(html).toContain(`/en/blog/${post.slug}`);
    }
  });
});
