import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/en'),
}));
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('framer-motion', () => {
  const stripFramerProps = (props: Record<string, unknown>) => {
    const { whileHover, whileTap, animate, initial, exit, transition, variants, ...rest } = props;
    return rest;
  };
  return {
    motion: {
      div: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <div {...stripFramerProps(props)}>{children}</div>,
      span: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <span {...stripFramerProps(props)}>{children}</span>,
      button: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <button {...stripFramerProps(props)}>{children}</button>,
      nav: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <nav {...stripFramerProps(props)}>{children}</nav>,
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});
vi.mock('@/components/MusicControls', () => ({
  __esModule: true,
  default: () => <div data-testid="music-controls">Music</div>,
}));
vi.mock('@/components/auth/AuthButton', () => ({
  __esModule: true,
  default: ({ inline }: { inline?: boolean }) => (
    <div data-testid={inline ? 'auth-button-inline' : 'auth-button'}>
      AuthButton
    </div>
  ),
}));
vi.mock('@/components/CoinBalance', () => ({
  CoinBalance: ({ coins }: { coins: number }) => (
    <div data-testid="coin-balance">{coins}</div>
  ),
}));
vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => <div data-testid="auth-modal">AuthModal</div>,
}));

const mockPush = vi.fn();
const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;

describe('Header - Hamburger Menu Avatar Bugs', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as any);

    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      currentFlag: '🇺🇸',
      setLanguage: vi.fn(),
      availableLanguages: ['en', 'he', 'sv', 'ja'],
    } as any);
  });

  it('BUG 1: hamburger menu should ALWAYS show Menu icon, never avatar for authenticated players', () => {
    // Setup: Authenticated user with profile picture
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      profile: {
        id: 'test-user',
        username: 'TestUser',
        avatar_image: 'broccoli-bob',
        total_coins: 100,
      },
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    } as any);

    render(<Header />);

    // Find all menu buttons (there are multiple: desktop dropdown + mobile hamburger)
    const menuButtons = screen.getAllByLabelText(/menu/i);

    // Mobile hamburger is in a container with class "sm:hidden"
    // Find the button that's in the mobile container
    const mobileMenuButton = menuButtons.find(button => {
      const parent = button.parentElement;
      return parent?.className.includes('sm:hidden');
    });

    expect(mobileMenuButton).toBeDefined();

    // BUG: Currently shows avatar, but should ALWAYS show Menu icon
    // Expected: Menu icon should be shown
    // Actual: Avatar is shown
    const avatar = mobileMenuButton!.querySelector('[data-testid="header-avatar"]');
    expect(avatar).not.toBeInTheDocument(); // Should NOT show avatar

    // Should show Menu icon instead
    const menuIcon = mobileMenuButton!.querySelector('svg');
    expect(menuIcon).toBeInTheDocument();
  });

  it('BUG 1: hamburger menu should show Menu icon for authenticated player with character avatar', () => {
    // Setup: Authenticated user with character avatar
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      profile: {
        id: 'test-user',
        username: 'TestUser',
        avatar_image: 'broccoli-bob',
        total_coins: 100,
      },
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    } as any);

    render(<Header />);

    // Find all menu buttons (there are multiple: desktop dropdown + mobile hamburger)
    const menuButtons = screen.getAllByLabelText(/menu/i);

    // Mobile hamburger is in a container with class "sm:hidden"
    // Find the button that's in the mobile container
    const mobileMenuButton = menuButtons.find(button => {
      const parent = button.parentElement;
      return parent?.className.includes('sm:hidden');
    });

    expect(mobileMenuButton).toBeDefined();

    // Should ALWAYS show Menu icon, not avatar
    const avatar = mobileMenuButton!.querySelector('[data-testid="header-avatar"]');
    expect(avatar).not.toBeInTheDocument();

    // Should show Menu icon
    const menuIcon = mobileMenuButton!.querySelector('svg');
    expect(menuIcon).toBeInTheDocument();
  });
});
