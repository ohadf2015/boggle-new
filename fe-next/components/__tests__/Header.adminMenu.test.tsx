/**
 * Test: Header Admin Menu Visibility
 *
 * Bug: Admin users cannot see admin link in desktop menu dropdown (HeaderMenuDropdown)
 * The admin link exists in mobile menu but is missing from desktop HeaderMenuDropdown
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Header from '../Header';
import HeaderMenuDropdown from '../HeaderMenuDropdown';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
}));

// Mock next/link
vi.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return { default: MockLink };
});

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    currentFlag: '🇺🇸',
  }),
}));

// Mock AuthContext with admin user
const mockAuthContext = {
  isAuthenticated: true,
  isAdmin: true,
  profile: {
    username: 'ohad',
    total_coins: 1000,
    total_xp: 500,
  },
  refreshProfile: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock useUnclaimedGifts
vi.mock('../../hooks/useUnclaimedGifts', () => ({
  useUnclaimedGifts: () => ({
    unclaimedCount: 0,
    gifts: [],
    refresh: vi.fn(),
    claimGift: vi.fn(),
  }),
}));

// Mock useSafeArea
vi.mock('../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock ThemeContext
vi.mock('../../utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
    nav: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <nav {...props}>{children}</nav>,
  },
}));

// Mock MusicControls
vi.mock('../MusicControls', () => ({
  __esModule: true,
  default: () => <div data-testid="music-controls">Music Controls</div>,
}));

// Mock CoinBalance
vi.mock('../CoinBalance', () => ({
  CoinBalance: ({ coins }: { coins: number }) => <div data-testid="coin-balance">{coins}</div>,
}));

// Mock QuickLanguageSwitcher
vi.mock('../QuickLanguageSwitcher', () => ({
  QuickLanguageSwitcher: () => <div data-testid="language-switcher">Language</div>,
}));

// Mock AuthButton
vi.mock('../auth/AuthButton', () => ({
  __esModule: true,
  default: () => <div data-testid="auth-button">Auth</div>,
}));

describe('Header Admin Menu', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockAuthContext.isAdmin = true;
  });

  describe('Mobile Menu (works correctly)', () => {
    it('should show admin link for admin users in mobile menu', async () => {
      const user = userEvent.setup();
      const { container } = render(<Header />);

      // Find and click mobile hamburger menu (in sm:hidden section)
      const mobileSection = container.querySelector('.sm\\:hidden');
      expect(mobileSection).toBeInTheDocument();

      const hamburgerButton = mobileSection?.querySelector('button');
      expect(hamburgerButton).toBeInTheDocument();

      // Click to open mobile menu
      if (hamburgerButton) {
        await user.click(hamburgerButton);
      }

      // Wait for mobile menu to open and check for admin section
      // The admin section should be visible in mobile menu
      const adminText = await screen.findByText('common.admin');
      expect(adminText).toBeInTheDocument();

      // Verify admin link exists (it's a button in mobile, not a link)
      const adminLinks = screen.getAllByRole('link');
      const adminLink = adminLinks.find(link => link.getAttribute('href')?.includes('/admin'));
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/en/admin');
    });
  });

  describe('Desktop Menu Dropdown (BROKEN)', () => {
    it('should show admin link for admin users in desktop menu dropdown', async () => {
      const user = userEvent.setup();
      render(<HeaderMenuDropdown />);

      // Find and click the menu dropdown button
      const menuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(menuButton);

      // This should find the admin link but WILL FAIL because it's missing
      // Expected: Admin link should be visible for admin users
      // Actual: Admin link is missing from HeaderMenuDropdown
      const adminLink = await screen.findByRole('link', { name: /admin/i });
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/en/admin');
    });

    it('should not show admin link for non-admin users', async () => {
      // Override AuthContext to non-admin
      mockAuthContext.isAdmin = false;

      const user = userEvent.setup();
      render(<HeaderMenuDropdown />);

      // Open menu
      const menuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(menuButton);

      // Admin link should NOT be present
      const adminLink = screen.queryByRole('link', { name: /admin/i });
      expect(adminLink).not.toBeInTheDocument();
    });
  });
});
