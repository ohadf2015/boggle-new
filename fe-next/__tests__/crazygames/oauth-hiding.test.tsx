import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OAuthButtonGroup } from '@/components/auth/shared/OAuthButtonGroup';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock dependencies
jest.mock('@/components/CrazyGamesSDK');
jest.mock('@/utils/ThemeContext');
jest.mock('@/contexts/LanguageContext');

const mockUseCrazyGames = useCrazyGames as jest.MockedFunction<typeof useCrazyGames>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

describe('OAuth Hiding on CrazyGames Platform', () => {
  const mockOnSignIn = jest.fn();
  const mockShowAuthPrompt = jest.fn();
  const mockT = jest.fn((key: string, params?: any) => {
    if (key === 'auth.loginCrazyGames') return 'Login';
    if (key === 'auth.signInWith') return `Sign in with ${params?.provider}`;
    return key;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default theme mock
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: jest.fn(),
    });

    // Default language mock
    mockUseLanguage.mockReturnValue({
      t: mockT,
      language: 'en',
      setLanguage: jest.fn(),
      formatNumber: jest.fn(),
      formatDate: jest.fn(),
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
        gameplayStart: jest.fn(),
        gameplayStop: jest.fn(),
        loadingStart: jest.fn(),
        loadingStop: jest.fn(),
        happyTime: jest.fn(),
        showMidgameAd: jest.fn(),
        showRewardedAd: jest.fn(),
        hasAdblock: jest.fn(),
        requestBanner: jest.fn(),
        requestResponsiveBanner: jest.fn(),
        clearBanner: jest.fn(),
        clearAllBanners: jest.fn(),
        saveData: jest.fn(),
        loadData: jest.fn(),
        removeData: jest.fn(),
        getUser: jest.fn(),
        isUserAccountAvailable: jest.fn(),
        getSystemInfo: jest.fn(),
        inviteLink: jest.fn(),
        showInviteButton: jest.fn(),
        hideInviteButton: jest.fn(),
        getInviteParam: jest.fn(),
        isInstantMultiplayer: false,
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
        gameplayStart: jest.fn(),
        gameplayStop: jest.fn(),
        loadingStart: jest.fn(),
        loadingStop: jest.fn(),
        happyTime: jest.fn(),
        showMidgameAd: jest.fn(),
        showRewardedAd: jest.fn(),
        hasAdblock: jest.fn(),
        requestBanner: jest.fn(),
        requestResponsiveBanner: jest.fn(),
        clearBanner: jest.fn(),
        clearAllBanners: jest.fn(),
        saveData: jest.fn(),
        loadData: jest.fn(),
        removeData: jest.fn(),
        getUser: jest.fn(),
        isUserAccountAvailable: jest.fn(),
        getSystemInfo: jest.fn(),
        inviteLink: jest.fn(),
        showInviteButton: jest.fn(),
        hideInviteButton: jest.fn(),
        getInviteParam: jest.fn(),
        isInstantMultiplayer: false,
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
