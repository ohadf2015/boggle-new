import React from 'react';
/**
 * LandingView Component Tests
 *
 * Tests for the main landing page component.
 * Verifies game mode cards render, lobby music plays, and links are accessible.
 */

// Mock contexts (auto-mock pattern)
vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/contexts/MusicContext');
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn(),
    stopSound: vi.fn(),
    isSoundEnabled: true,
    toggleSound: vi.fn(),
  }),
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoin: () => ({ coins: 0, updateCoins: vi.fn() }),
}));
vi.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({ isEnabled: true, toggle: vi.fn() }),
}));

// Mock hooks
vi.mock('@/hooks/useLiveRoomStats', () => ({
  useLiveRoomStats: () => ({
    openRooms: 0,
    totalPlayers: 0,
    activePlayers: 0,
    refresh: vi.fn(),
  }),
}));
vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));
vi.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));
vi.mock('@/hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({ x: 0, y: 0 }),
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {},
  }),
}));
vi.mock('@/hooks/usePlayerStats', () => ({
  usePlayerStats: () => ({ allTimeBest: null }),
}));
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({
    hasPlayed: false,
    hasSolved: false,
    currentStreak: 0,
    puzzleNumber: 1,
    loading: false,
  }),
}));

// Mock onboardingStorage
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: vi.fn(() => true),
  hasSupabaseSession: vi.fn(() => false),
  markOnboardingComplete: vi.fn(),
  markOnboardingSkipped: vi.fn(),
  savePendingRoomInvite: vi.fn(),
}));
vi.mock('@/utils/perfVariant', () => ({
  getPerfVariant: () => 'lite',
}));

vi.mock('@/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({ notifications: [], unreadCount: 0 }),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  }),
}));

// Mock lazy-loaded / dynamic components
vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const MockDailyChallengeBanner = () => {
    return <div data-testid="daily-challenge-banner">Daily Challenge</div>;
  };
  return { default: MockDailyChallengeBanner };
});
vi.mock('@/components/OnboardingModal', () => {
  const MockOnboardingModal = () => {
    return null;
  };
  return { default: MockOnboardingModal };
});
vi.mock('@/components/auth/AuthModal', () => {
  const MockAuthModal = () => {
    return null;
  };
  return { default: MockAuthModal };
});
vi.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => null,
}));
vi.mock('@/components/ui/IdleMascot', () => ({
  IdleMascotWithEntrance: () => <div data-testid="mascot">Mascot</div>,
}));
vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));
vi.mock('@/components/ads', () => ({
  AdPlaceholder: () => null,
  InlineBannerAd: () => null,
}));

import { render, screen } from '@testing-library/react';
import LandingView from '../landing/LandingView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPlayTrack = vi.fn();


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('LandingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      loading: false,
    });

    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      dir: 'ltr',
    });

    (useMusic as jest.Mock).mockReturnValue({
      playTrack: mockPlayTrack,
      unlockAudio: vi.fn(),
      stopMusic: vi.fn(),
      TRACKS: { LOBBY: 'lobby', BOSSA: 'bossa', BOSSA_ARCADE: 'bossaArcade' },
      currentTrack: null,
      isPlaying: false,
    });
  });

  it('renders game mode selection cards', () => {
    render(<LandingView />, { wrapper: createWrapper() });

    const links = screen.getAllByRole('link');
    // Landing renders a featured mode set: practice, multiplayer (arena/quickPlay),
    // singleplayer, and daily are all valid mode-card hrefs depending on player tier.
    // Assert at least one game-mode link surfaces.
    const hasGameModeLink = links.some((link) => {
      const href = link.getAttribute('href') ?? '';
      return /\/(singleplayer|multiplayer|practice|daily|adventure|blast|connections|brain)/.test(href);
    });

    expect(hasGameModeLink).toBe(true);
  });

  it('queues lobby music on mount (MusicContext handles autoplay unlock)', () => {
    render(<LandingView />, { wrapper: createWrapper() });

    // Component calls playTrack unconditionally on mount; MusicContext queues
    // the track via pendingUnlockTrackRef and plays on first gesture.
    expect(mockPlayTrack).toHaveBeenCalledWith('bossa');
  });

  it('keeps SSR-painted cards (no skeleton downgrade) for a returning authed user whose profile is still loading', () => {
    // SSR renders the real cards (no window → no session → always ready). A returning
    // user has a Supabase token in localStorage and auth is still resolving on the
    // client. The client must NOT replace the painted cards with a skeleton.
    (hasSupabaseSession as jest.Mock).mockReturnValue(true);
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      profile: null,
      loading: true,
    });

    render(<LandingView />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('landing-cards-skeleton')).toBeNull();

    const links = screen.getAllByRole('link');
    const hasGameModeLink = links.some((link) => {
      const href = link.getAttribute('href') ?? '';
      return /\/(singleplayer|multiplayer|practice|daily|adventure|blast|connections|brain)/.test(href);
    });
    expect(hasGameModeLink).toBe(true);
  });

  it('has accessible navigation links', () => {
    render(<LandingView />, { wrapper: createWrapper() });

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);

    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });
});
