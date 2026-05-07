/**
 * CrazyGames "multiplayer-only" gating tests.
 *
 * On CrazyGames the game is published with only the multiplayer mode reachable.
 * These tests lock down the navigation surfaces that previously leaked off-mode:
 *   - AuthButtonDropdownMenu (profile / leaderboard / friends / settings / admin)
 *   - HeaderMobileMenu (entire menu portal + external Ko-fi/Instagram links)
 *   - PostGameEngagement (WotdTeaser links to /daily)
 *   - ResultsCtaSection (NextStepPrompt cross-mode CTAs)
 */

import { vi, type MockedFunction } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthButtonDropdownMenu } from '@/components/auth/AuthButtonDropdownMenu';
import PostGameEngagement from '@/components/growth/PostGameEngagement';
import { ResultsCtaSection } from '@/components/results/ResultsCtaSection';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/components/CrazyGamesSDK');
vi.mock('@/contexts/AuthContext');
// NextStepPrompt reads t/dir from useLanguage — without a mock the real
// provider resolves translation keys to English text, breaking getByText(key).
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
// Heavy children of PostGameEngagement — stub so we can assert the shell renders
vi.mock('@/components/leagues/LeagueRivalsCard', () => ({
  LeagueRivalsCard: () => <div data-testid="league-rivals-card" />,
}));
vi.mock('@/components/landing/WotdTeaser', () => ({
  WotdTeaser: () => <div data-testid="wotd-teaser">WOTD</div>,
}));
vi.mock('@/components/vocabulary/WordCollectionCard', () => ({
  WordCollectionCard: () => <div data-testid="word-collection-card" />,
}));
vi.mock('@/components/growth/CrazyGamesRetentionCard', () => ({
  CrazyGamesRetentionCard: () => <div data-testid="cg-retention-card" />,
}));

const mockUseCrazyGames = useCrazyGames as MockedFunction<typeof useCrazyGames>;
const mockUseAuth = useAuth as unknown as MockedFunction<() => any>;

function cgContext(isOnPlatform: boolean) {
  return {
    isOnCrazyGamesPlatform: isOnPlatform,
    isAvailable: isOnPlatform,
    environment: isOnPlatform ? 'crazygames' : null,
    isLoading: false,
    deviceType: 'desktop',
    isLandscape: true,
    viewportSize: { width: 1024, height: 768 },
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    loadingStart: vi.fn(),
    loadingStop: vi.fn(),
    happyTime: vi.fn(),
    showMidgameAd: vi.fn(),
    showRewardedAd: vi.fn(),
    hasAdblock: vi.fn(),
    requestBanner: vi.fn(),
    requestResponsiveBanner: vi.fn(),
    clearBanner: vi.fn(),
    clearAllBanners: vi.fn(),
    saveData: vi.fn(),
    loadData: vi.fn(),
    removeData: vi.fn(),
    clearData: vi.fn(),
    getUser: vi.fn(),
    showAuthPrompt: vi.fn(),
    isUserAccountAvailable: vi.fn(),
    getSystemInfo: vi.fn(),
    inviteLink: vi.fn(),
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    getInviteParam: vi.fn(),
    getInviteParams: vi.fn(),
    isInstantMultiplayer: false,
    addJoinRoomListener: vi.fn(),
    removeJoinRoomListener: vi.fn(),
    getSettings: vi.fn(),
    addSettingsChangeListener: vi.fn(),
    removeSettingsChangeListener: vi.fn(),
    addAuthListener: vi.fn(),
    removeAuthListener: vi.fn(),
    getUserToken: vi.fn(),
    listFriends: vi.fn(),
    showAccountLinkPrompt: vi.fn(),
    submitLeaderboardScore: vi.fn(),
  } as any;
}

describe('CrazyGames multiplayer-only gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1' }, profile: {} });
  });

  describe('AuthButtonDropdownMenu', () => {
    const baseProps = {
      dropdownRef: { current: null } as React.RefObject<HTMLDivElement | null>,
      dropdownPosition: { top: 0, left: 0, right: 0 },
      isRTL: false,
      isDarkMode: true,
      language: 'en',
      currentLang: { code: 'en' as const, name: 'English', flag: 'US' },
      isAdmin: true,
      isSigningOut: false,
      hasUnclaimedReward: false,
      t: (k: string) => k,
      router: { push: vi.fn() },
      setLanguage: vi.fn(),
      setShowUserMenu: vi.fn(),
      setShowCalendarModal: vi.fn(),
      onSignOut: vi.fn(),
    };

    it('hides Profile / Leaderboard / Friends / Settings / Admin links on CG', () => {
      render(<AuthButtonDropdownMenu {...baseProps} isCrazyGames />);
      expect(screen.queryByText('profile.title')).not.toBeInTheDocument();
      expect(screen.queryByText('leaderboard.title')).not.toBeInTheDocument();
      expect(screen.queryByText('friends.title')).not.toBeInTheDocument();
      expect(screen.queryByText('settings.title')).not.toBeInTheDocument();
      expect(screen.queryByText('common.adminDashboard')).not.toBeInTheDocument();
    });

    it('still allows language switching and sign out on CG', () => {
      render(<AuthButtonDropdownMenu {...baseProps} isCrazyGames />);
      // Language row + Sign out remain
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('auth.signOut')).toBeInTheDocument();
    });

    it('still shows all items off CG', () => {
      render(<AuthButtonDropdownMenu {...baseProps} isCrazyGames={false} />);
      expect(screen.getByText('profile.title')).toBeInTheDocument();
      expect(screen.getByText('leaderboard.title')).toBeInTheDocument();
      expect(screen.getByText('friends.title')).toBeInTheDocument();
      expect(screen.getByText('settings.title')).toBeInTheDocument();
      expect(screen.getByText('common.adminDashboard')).toBeInTheDocument();
    });
  });

  describe('PostGameEngagement', () => {
    it('shows CG retention card instead of WotdTeaser on CrazyGames', () => {
      mockUseCrazyGames.mockReturnValue(cgContext(true));
      render(<PostGameEngagement />);
      expect(screen.getByTestId('cg-retention-card')).toBeInTheDocument();
      expect(screen.queryByTestId('wotd-teaser')).not.toBeInTheDocument();
    });

    it('renders engagement cards off CG', async () => {
      mockUseCrazyGames.mockReturnValue(cgContext(false));
      render(<PostGameEngagement />);
      expect(screen.getByTestId('post-game-engagement')).toBeInTheDocument();
      // WotdTeaser is loaded via next/dynamic — await the async mount.
      expect(await screen.findByTestId('wotd-teaser')).toBeInTheDocument();
    });
  });

  describe('ResultsCtaSection (multiplayer bots-only mode)', () => {
    const baseProps = {
      sortedScores: [],
      currentPlayerData: null,
      currentPlayerRank: 1,
      currentPlayerValidWords: [],
      hasZeroScore: true,
      isHost: false,
      onStartGame: vi.fn(),
      onMarkReady: vi.fn(),
      onExit: vi.fn(),
      isBotsOnlyGame: true,
      isCurrentPlayerReady: false,
      normalizeUsername: (n?: string | null) => n ?? '',
      username: 'me',
      breathingShadow: ['none'],
      reducedMotion: true,
      ctaDelay: 0,
      t: (k: string) => k,
    };

    it('does not render NextStepPrompt cross-mode CTA on CG', () => {
      mockUseCrazyGames.mockReturnValue(cgContext(true));
      render(<ResultsCtaSection {...baseProps} />);
      // Cross-mode CTAs use these translation keys
      expect(screen.queryByText('nextStep.tryDailyChallenge')).not.toBeInTheDocument();
      expect(screen.queryByText('nextStep.challengeBots')).not.toBeInTheDocument();
    });

    it('renders the NextStepPrompt off CG when bot game ends for guest', () => {
      mockUseCrazyGames.mockReturnValue(cgContext(false));
      render(<ResultsCtaSection {...baseProps} />);
      // multiplayer-bots branch suggests daily challenge
      expect(screen.getByText('nextStep.tryDailyChallenge')).toBeInTheDocument();
    });
  });
});
