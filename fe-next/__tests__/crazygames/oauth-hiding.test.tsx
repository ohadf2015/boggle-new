import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OAuthButtonGroup } from '@/components/auth/shared/OAuthButtonGroup';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock dependencies
vi.mock('@/components/CrazyGamesSDK');
vi.mock('@/utils/ThemeContext');
vi.mock('@/contexts/LanguageContext');

const mockUseCrazyGames = useCrazyGames as MockedFunction<typeof useCrazyGames>;
const mockUseTheme = useTheme as MockedFunction<typeof useTheme>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;

describe('OAuth Hiding on CrazyGames Platform', () => {
  const mockOnSignIn = vi.fn();
  const mockShowAuthPrompt = vi.fn();
  const mockT = vi.fn((key: string, params?: any) => {
    if (key === 'auth.loginCrazyGames') return 'Login';
    if (key === 'auth.signInWith') return `Sign in with ${params?.provider}`;
    return key;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default theme mock
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn(),
    });

    // Default language mock
    mockUseLanguage.mockReturnValue({
      t: mockT,
      language: 'en',
      setLanguage: vi.fn(),
      formatNumber: vi.fn(),
      formatDate: vi.fn(),
    } as any);
  });

  describe('When NOT on CrazyGames platform', () => {
    beforeEach(() => {
      mockUseCrazyGames.mockReturnValue({
        isOnCrazyGamesPlatform: false,
        showAuthPrompt: mockShowAuthPrompt,
        isAvailable: false,
        environment: null,
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
        getUser: vi.fn(),
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
      });
    });

    it('should render Google OAuth button', () => {
      render(
        <OAuthButtonGroup
          onSignIn={mockOnSignIn}
          loadingProvider={null}
        />
      );

      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('should render Discord OAuth button', () => {
      render(
        <OAuthButtonGroup
          onSignIn={mockOnSignIn}
          loadingProvider={null}
        />
      );

      expect(screen.getByText('Sign in with Discord')).toBeInTheDocument();
    });

    it('should NOT render CrazyGames auth button', () => {
      render(
        <OAuthButtonGroup
          onSignIn={mockOnSignIn}
          loadingProvider={null}
        />
      );

      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });

    it('should call onSignIn when OAuth button clicked', async () => {
      const user = userEvent.setup();

      render(
        <OAuthButtonGroup
          onSignIn={mockOnSignIn}
          loadingProvider={null}
        />
      );

      await user.click(screen.getByText('Sign in with Google'));

      expect(mockOnSignIn).toHaveBeenCalledWith('google');
      expect(mockShowAuthPrompt).not.toHaveBeenCalled();
    });
  });

  describe('When ON CrazyGames platform', () => {
    beforeEach(() => {
      mockUseCrazyGames.mockReturnValue({
        isOnCrazyGamesPlatform: true,
        showAuthPrompt: mockShowAuthPrompt,
        isAvailable: true,
        environment: 'crazygames',
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
        getUser: vi.fn(),
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
      });
    });

    it('should hide Google OAuth button', () => {
      render(
        <OAuthButtonGroup
          onSignIn={mockOnSignIn}
          loadingProvider={null}
        />
      );

      expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument();
    });

    it('should hide Discord OAuth button', () => {
      render(
        <OAuthButtonGroup
          onSignIn={mockOnSignIn}
          loadingProvider={null}
        />
      );

      expect(screen.queryByText('Sign in with Discord')).not.toBeInTheDocument();
    });

    it('should render CrazyGames auth button', () => {
      render(
        <OAuthButtonGroup
          onSignIn={mockOnSignIn}
          loadingProvider={null}
        />
      );

      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('should call showAuthPrompt when CrazyGames button clicked', async () => {
      const user = userEvent.setup();

      render(
        <OAuthButtonGroup
          onSignIn={mockOnSignIn}
          loadingProvider={null}
        />
      );

      await user.click(screen.getByText('Login'));

      expect(mockShowAuthPrompt).toHaveBeenCalledTimes(1);
      expect(mockOnSignIn).not.toHaveBeenCalled();
    });
  });
});
