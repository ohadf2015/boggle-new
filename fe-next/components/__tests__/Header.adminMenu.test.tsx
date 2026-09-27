/**
 * Test: Header Admin Menu Visibility
 *
 * Mobile + desktop now share the same side-drawer menu (HeaderMobileMenu),
 * so the admin link only needs to be tested once via the unified Header.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Header from '../Header';

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
  m: {
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

  describe('Unified side-drawer menu (mobile + desktop)', () => {
    it('shows admin link for admin users when the drawer opens', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open the unified menu via the hamburger trigger.
      const hamburgerButton = screen.getByRole('button', { name: /common.openMenu/i });
      await user.click(hamburgerButton);

      // Admin section + link should be visible.
      expect(await screen.findByText('common.admin')).toBeInTheDocument();
      const adminLinks = screen.getAllByRole('link');
      const adminLink = adminLinks.find(link => link.getAttribute('href')?.includes('/admin'));
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/en/admin');
    });

    it('hides admin link for non-admin users', async () => {
      mockAuthContext.isAdmin = false;

      const user = userEvent.setup();
      render(<Header />);

      const hamburgerButton = screen.getByRole('button', { name: /common.openMenu/i });
      await user.click(hamburgerButton);

      // Admin section should not appear.
      expect(screen.queryByText('common.admin')).not.toBeInTheDocument();
    });
  });
});
