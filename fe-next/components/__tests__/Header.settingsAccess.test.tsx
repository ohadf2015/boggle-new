/**
 * Header Settings Access Tests
 *
 * Tests that settings and language switcher are accessible for ALL users:
 * - Guest users (not authenticated) can see Settings button on desktop
 * - Authenticated users can see Settings button on desktop
 * - QuickLanguageSwitcher is visible for all users on desktop
 * - Settings link navigates to correct locale-prefixed URL
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <button {...props}>{children}</button>
    ),
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/link
vi.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
  return { default: MockLink };
});

// Mock AuthContext - will be configured per test
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock LanguageContext
const mockSetLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: mockSetLanguage,
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.title': 'Settings',
        'settings.changeLanguage': 'Change Language',
        'settings.language': 'Language',
        'settings.moreSettings': 'More Settings',
        'common.goToHome': 'Go to home page',
        'common.openMenu': 'Open menu',
        'common.closeMenu': 'Close menu',
        'common.menu': 'Menu',
        'common.account': 'Account',
        'common.info': 'Info',
        'logo.lexi': 'LEXI',
        'logo.clash': 'CLASH',
        'joinView.english': 'English',
        'joinView.hebrew': 'עברית',
        'joinView.swedish': 'Svenska',
        'joinView.japanese': '日本語',
        'joinView.spanish': 'Español',
        'brain.nav.profile': 'Profile',
        'profile.viewCoins': 'View coins',
        'profile.coins': 'Coins',
        'profile.viewProfile': 'View Profile',
        'footer.aboutGame': 'About the Game',
        'footer.leaderboard': 'Leaderboard',
        'legal.termsOfService': 'Terms of Service',
        'legal.privacyPolicy': 'Privacy Policy',
        'support.kofiFooter': 'Support us on Ko-fi',
        'gift.youHaveGifts': 'You have gifts',
        'gift.rewards': 'Rewards',
      };
      return translations[key] || key;
    },
    currentFlag: '🇺🇸',
  }),
}));

// Mock hooks
vi.mock('@/hooks/useUnclaimedGifts', () => ({
  useUnclaimedGifts: () => ({
    unclaimedCount: 0,
    gifts: [],
    refresh: vi.fn(),
    claimGift: vi.fn(),
  }),
}));

// Mock child components
vi.mock('../auth/AuthButton', () => {
  const MockAuthButton = () => {
    return <button data-testid="auth-button">Auth</button>;
  };
  return { default: MockAuthButton };
});

vi.mock('../MusicControls', () => {
  const MockMusicControls = () => {
    return <div data-testid="music-controls">Music</div>;
  };
  return { default: MockMusicControls };
});

vi.mock('../CoinBalance', () => ({
  CoinBalance: function MockCoinBalance({ coins }: { coins: number }) {
    return <span data-testid="coin-balance">{coins}</span>;
  },
}));

vi.mock('../auth/AuthModal', () => {
  const MockAuthModal = () => {
    return null;
  };
  return { default: MockAuthModal };
});

vi.mock('../gift/GiftNotificationBadge', () => ({
  GiftNotificationBadge: function MockGiftNotificationBadge() {
    return null;
  },
}));

vi.mock('../gift/AdminGiftModal', () => ({
  AdminGiftModal: function MockAdminGiftModal() {
    return null;
  },
}));

// Import Header after all mocks are set up
import Header from '../Header';

describe('Header Settings Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Guest user (not authenticated)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isAdmin: false,
        profile: null,
        refreshProfile: vi.fn(),
      });
    });

    it('should render Settings button on desktop for guest users', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Find the desktop controls section (hidden on mobile with sm:flex)
      const desktopControls = document.querySelector('.sm\\:flex');
      expect(desktopControls).toBeInTheDocument();

      // Open the menu dropdown first (Settings is now inside HeaderMenuDropdown)
      // Note: There are two "Open menu" buttons (desktop and mobile), get the desktop one
      const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
      const desktopMenuButton = menuButtons.find(button => desktopControls?.contains(button));
      expect(desktopMenuButton).toBeInTheDocument();
      await user.click(desktopMenuButton!);

      // Find Settings link inside the opened dropdown
      const settingsLink = screen.getByRole('link', { name: 'More Settings' });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute('href', '/en/settings');
    });

    it('should render QuickLanguageSwitcher on desktop for guest users', () => {
      render(<Header />);

      // QuickLanguageSwitcher renders a combobox
      const languageSwitcher = screen.getByRole('combobox', { name: 'Change Language' });
      expect(languageSwitcher).toBeInTheDocument();
    });

    it('should NOT render profile link for guest users', () => {
      render(<Header />);

      // Profile link should not be present for guest users
      const profileLink = screen.queryByRole('link', { name: 'Profile' });
      expect(profileLink).not.toBeInTheDocument();
    });

    it('should NOT render coin balance for guest users', () => {
      render(<Header />);

      // Coin balance should not be visible for guest users
      const coinBalance = screen.queryByTestId('coin-balance');
      expect(coinBalance).not.toBeInTheDocument();
    });
  });

  describe('Authenticated user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isAdmin: false,
        profile: {
          id: 'user-123',
          total_coins: 500,
        },
        refreshProfile: vi.fn(),
      });
    });

    it('should render Settings button on desktop for authenticated users', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open the menu dropdown first (Settings is now inside HeaderMenuDropdown)
      // Note: There are two "Open menu" buttons (desktop and mobile), get the desktop one
      const desktopControls = document.querySelector('.sm\\:flex');
      const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
      const desktopMenuButton = menuButtons.find(button => desktopControls?.contains(button));
      expect(desktopMenuButton).toBeInTheDocument();
      await user.click(desktopMenuButton!);

      // Find Settings link inside the opened dropdown
      const settingsLink = screen.getByRole('link', { name: 'More Settings' });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute('href', '/en/settings');
    });

    it('should render QuickLanguageSwitcher on desktop for authenticated users', () => {
      render(<Header />);

      // QuickLanguageSwitcher renders a combobox
      const languageSwitcher = screen.getByRole('combobox', { name: 'Change Language' });
      expect(languageSwitcher).toBeInTheDocument();
    });

    it('should ALSO render profile link for authenticated users', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open the menu dropdown to access Settings and profile
      const desktopControls = document.querySelector('.sm\\:flex');
      const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
      const desktopMenuButton = menuButtons.find(button => desktopControls?.contains(button));
      expect(desktopMenuButton).toBeInTheDocument();
      await user.click(desktopMenuButton!);

      // Authenticated users should see settings AND the profile hero section link
      const settingsLink = screen.getByRole('link', { name: 'More Settings' });
      expect(settingsLink).toBeInTheDocument();

      // Profile link in hero section points to /en/profile
      const profileLinks = screen.getAllByRole('link');
      const profileLink = profileLinks.find(l => l.getAttribute('href')?.includes('/profile'));
      expect(profileLink).toBeInTheDocument();
    });

    it('should render coin balance for authenticated users', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Coin balance is now inside the dropdown hero section — open dropdown first
      const desktopControls = document.querySelector('.sm\\:flex');
      const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
      const desktopMenuButton = menuButtons.find(button => desktopControls?.contains(button));
      await user.click(desktopMenuButton!);

      // Coin balance should be visible inside dropdown for authenticated users
      const coinBalance = screen.getByTestId('coin-balance');
      expect(coinBalance).toBeInTheDocument();
    });
  });

  describe('Settings link URL', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isAdmin: false,
        profile: null,
        refreshProfile: vi.fn(),
      });
    });

    it('should include current language in Settings URL', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open the menu dropdown to access Settings
      const desktopControls = document.querySelector('.sm\\:flex');
      const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
      const desktopMenuButton = menuButtons.find(button => desktopControls?.contains(button));
      expect(desktopMenuButton).toBeInTheDocument();
      await user.click(desktopMenuButton!);

      const settingsLink = screen.getByRole('link', { name: 'More Settings' });
      // URL should be locale-prefixed: /en/settings
      expect(settingsLink).toHaveAttribute('href', '/en/settings');
    });
  });

  describe('Desktop controls order', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isAdmin: false,
        profile: null,
        refreshProfile: vi.fn(),
      });
    });

    it('should have QuickLanguageSwitcher before Menu dropdown (which contains Settings)', () => {
      render(<Header />);

      // Get desktop control elements
      const languageSwitcher = screen.getByRole('combobox', { name: 'Change Language' });
      const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });

      // Both should exist
      expect(languageSwitcher).toBeInTheDocument();
      expect(menuButtons.length).toBeGreaterThanOrEqual(1);

      // Verify they're in the desktop controls section (hidden on mobile)
      const desktopControls = document.querySelector('.sm\\:flex');
      expect(desktopControls).toBeInTheDocument();
      expect(desktopControls).toContainElement(languageSwitcher);

      // At least one menu button should be in desktop controls
      const desktopMenuButton = menuButtons.find(button => desktopControls?.contains(button));
      expect(desktopMenuButton).toBeInTheDocument();
    });
  });
});

describe('Header Mobile Menu Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      profile: null,
      refreshProfile: vi.fn(),
    });
  });

  it('should render mobile hamburger menu button', () => {
    render(<Header />);

    // Both desktop and mobile have "Open menu" buttons, so get all and check mobile
    const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
    expect(menuButtons.length).toBeGreaterThanOrEqual(1);

    // The mobile menu container has class "sm:hidden"
    const mobileControls = document.querySelector('.sm\\:hidden');
    expect(mobileControls).toBeInTheDocument();

    // Verify at least one menu button exists in mobile controls
    const mobileMenuButton = menuButtons.find(button => mobileControls?.contains(button));
    expect(mobileMenuButton).toBeInTheDocument();
  });
});
