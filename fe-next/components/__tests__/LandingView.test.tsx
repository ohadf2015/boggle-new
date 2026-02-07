/**
 * LandingView Component Tests
 *
 * Tests for the main landing page component.
 * Verifies game mode cards render, lobby music plays, and links are accessible.
 */

// Mock contexts (auto-mock pattern)
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/LanguageContext');
jest.mock('@/contexts/MusicContext');
jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: jest.fn() }),
}));
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: jest.fn(),
    stopSound: jest.fn(),
    isSoundEnabled: true,
    toggleSound: jest.fn(),
  }),
}));
jest.mock('@/contexts/CoinContext', () => ({
  useCoin: () => ({ coins: 0, updateCoins: jest.fn() }),
}));
jest.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({ isEnabled: true, toggle: jest.fn() }),
}));

// Mock hooks
jest.mock('@/hooks/useLiveRoomStats', () => ({
  useLiveRoomStats: () => ({
    openRooms: 0,
    totalPlayers: 0,
    activePlayers: 0,
    refresh: jest.fn(),
  }),
}));
jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));
jest.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));
jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));
jest.mock('@/hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({ x: 0, y: 0 }),
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {},
  }),
}));
jest.mock('@/hooks/usePlayerStats', () => ({
  usePlayerStats: () => ({ allTimeBest: null }),
}));
jest.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({
    hasPlayed: false,
    hasSolved: false,
    currentStreak: 0,
    puzzleNumber: 1,
    loading: false,
  }),
}));

// Mock onboardingStorage
jest.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: jest.fn(() => true),
  markOnboardingSkipped: jest.fn(),
}));
jest.mock('@/utils/perfVariant', () => ({
  getPerfVariant: () => 'lite',
}));

// Mock lazy-loaded / dynamic components
jest.mock('@/components/daily/DailyChallengeBanner', () => {
  return function MockDailyChallengeBanner() {
    return <div data-testid="daily-challenge-banner">Daily Challenge</div>;
  };
});
jest.mock('@/components/OnboardingModal', () => {
  return function MockOnboardingModal() {
    return null;
  };
});
jest.mock('@/components/auth/AuthModal', () => {
  return function MockAuthModal() {
    return null;
  };
});
jest.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => null,
}));
jest.mock('@/components/ui/IdleMascot', () => ({
  IdleMascotWithEntrance: () => <div data-testid="mascot">Mascot</div>,
}));
jest.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

import { render, screen } from '@testing-library/react';
import LandingView from '../landing/LandingView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';

const mockPlayTrack = jest.fn();

describe('LandingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
      unlockAudio: jest.fn(),
      stopMusic: jest.fn(),
      TRACKS: { LOBBY: 'lobby' },
      currentTrack: null,
      isPlaying: false,
    });
  });

  it('renders game mode selection cards', () => {
    render(<LandingView />);

    const links = screen.getAllByRole('link');
    const hasSinglePlayer = links.some(link =>
      link.getAttribute('href')?.includes('singleplayer')
    );
    const hasMultiplayer = links.some(link =>
      link.getAttribute('href')?.includes('multiplayer')
    );

    expect(hasSinglePlayer || hasMultiplayer).toBe(true);
  });

  it('plays lobby music on mount', () => {
    render(<LandingView />);

    expect(mockPlayTrack).toHaveBeenCalledWith('lobby');
  });

  it('has accessible navigation links', () => {
    render(<LandingView />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);

    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });
});
