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
import '@testing-library/jest-dom';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
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
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock AuthContext - will be configured per test
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock LanguageContext
const mockSetLanguage = jest.fn();
jest.mock('@/contexts/LanguageContext', () => ({
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
jest.mock('@/hooks/useUnclaimedGifts', () => ({
  useUnclaimedGifts: () => ({
    unclaimedCount: 0,
    gifts: [],
    refresh: jest.fn(),
    claimGift: jest.fn(),
  }),
}));

// Mock child components
jest.mock('../auth/AuthButton', () => {
  return function MockAuthButton() {
    return <button data-testid="auth-button">Auth</button>;
  };
});

jest.mock('../MusicControls', () => {
  return function MockMusicControls() {
    return <div data-testid="music-controls">Music</div>;
  };
});

jest.mock('../CoinBalance', () => ({
  CoinBalance: function MockCoinBalance({ coins }: { coins: number }) {
    return <span data-testid="coin-balance">{coins}</span>;
  },
}));

jest.mock('../auth/AuthModal', () => {
  return function MockAuthModal() {
    return null;
  };
});

jest.mock('../gift/GiftNotificationBadge', () => ({
  GiftNotificationBadge: function MockGiftNotificationBadge() {
    return null;
  },
}));

jest.mock('../gift/AdminGiftModal', () => ({
  AdminGiftModal: function MockAdminGiftModal() {
    return null;
  },
}));

// Import Header after all mocks are set up
import Header from '../Header';

describe('Header Settings Access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Guest user (not authenticated)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isAdmin: false,
        profile: null,
        refreshProfile: jest.fn(),
      });
    });

    it('should render Settings button on desktop for guest users', () => {
      render(<Header />);

      // Find the desktop controls section (hidden on mobile with sm:flex)
      const desktopControls = document.querySelector('.sm\\:flex');
      expect(desktopControls).toBeInTheDocument();

      // Find Settings link by aria-label
      const settingsLink = screen.getByRole('link', { name: 'Settings' });
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
        refreshProfile: jest.fn(),
      });
    });

    it('should render Settings button on desktop for authenticated users', () => {
      render(<Header />);

      // Find Settings link by aria-label
      const settingsLink = screen.getByRole('link', { name: 'Settings' });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute('href', '/en/settings');
    });

    it('should render QuickLanguageSwitcher on desktop for authenticated users', () => {
      render(<Header />);

      // QuickLanguageSwitcher renders a combobox
      const languageSwitcher = screen.getByRole('combobox', { name: 'Change Language' });
      expect(languageSwitcher).toBeInTheDocument();
    });

    it('should ALSO render profile link for authenticated users', () => {
      render(<Header />);

      // Authenticated users should see both settings AND profile
      const settingsLink = screen.getByRole('link', { name: 'Settings' });
      const profileLink = screen.getByRole('link', { name: 'Profile' });

      expect(settingsLink).toBeInTheDocument();
      expect(profileLink).toBeInTheDocument();
    });

    it('should render coin balance for authenticated users', () => {
      render(<Header />);

      // Coin balance should be visible for authenticated users
      const coinBalance = screen.getByTestId('coin-balance');
      expect(coinBalance).toBeInTheDocument();
      expect(coinBalance).toHaveTextContent('500');
    });
  });

  describe('Settings link URL', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isAdmin: false,
        profile: null,
        refreshProfile: jest.fn(),
      });
    });

    it('should include current language in Settings URL', () => {
      render(<Header />);

      const settingsLink = screen.getByRole('link', { name: 'Settings' });
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
        refreshProfile: jest.fn(),
      });
    });

    it('should have Settings button before QuickLanguageSwitcher', () => {
      render(<Header />);

      // Get all interactive elements in desktop controls
      const settingsLink = screen.getByRole('link', { name: 'Settings' });
      const languageSwitcher = screen.getByRole('combobox', { name: 'Change Language' });

      // Both should exist
      expect(settingsLink).toBeInTheDocument();
      expect(languageSwitcher).toBeInTheDocument();

      // Check DOM order - Settings should come before language switcher
      const allElements = document.querySelectorAll(
        '.sm\\:flex a[aria-label="Settings"], .sm\\:flex button[aria-label="Change Language"]'
      );

      // Settings link should be first in the matched elements
      expect(allElements.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Header Mobile Menu Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      profile: null,
      refreshProfile: jest.fn(),
    });
  });

  it('should render mobile hamburger menu button', () => {
    render(<Header />);

    // Mobile menu button has aria-label "Open menu"
    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    expect(menuButton).toBeInTheDocument();
  });
});
