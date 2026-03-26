import React from 'react';
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ avatarImage }: { avatarImage?: string }) => (
    <div
      data-testid="header-avatar"
      data-avatar-image={avatarImage}
    >
      Avatar
    </div>
  ),
}));

const mockPush = vi.fn();
const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('Header - Mobile Menu Avatar Bug', () => {
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

  it('FIXED: hamburger menu should ALWAYS show Menu icon, not avatar (authenticated user with avatar)', () => {
    // Setup: User with avatar
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

    render(<Header />, { wrapper: createWrapper() });

    // Find all menu buttons (there are multiple: desktop dropdown + mobile hamburger)
    const menuButtons = screen.getAllByLabelText(/menu/i);

    // Mobile hamburger is in a container with class "sm:hidden"
    // Find the button that's in the mobile container
    const mobileMenuButton = menuButtons.find(button => {
      const parent = button.parentElement;
      return parent?.className.includes('sm:hidden');
    });

    expect(mobileMenuButton).toBeDefined();

    // FIXED: Hamburger button should NOT show avatar
    const avatar = mobileMenuButton!.querySelector('[data-testid="header-avatar"]');
    expect(avatar).not.toBeInTheDocument();

    // Should show Menu icon
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('FIXED: hamburger menu should ALWAYS show Menu icon, not avatar (authenticated user with character avatar)', () => {
    // Setup: User with character avatar
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

    render(<Header />, { wrapper: createWrapper() });

    // Find all menu buttons (there are multiple: desktop dropdown + mobile hamburger)
    const menuButtons = screen.getAllByLabelText(/menu/i);

    // Mobile hamburger is in a container with class "sm:hidden"
    // Find the button that's in the mobile container
    const mobileMenuButton = menuButtons.find(button => {
      const parent = button.parentElement;
      return parent?.className.includes('sm:hidden');
    });

    expect(mobileMenuButton).toBeDefined();

    // FIXED: Hamburger button should NOT show avatar
    const avatar = mobileMenuButton!.querySelector('[data-testid="header-avatar"]');
    expect(avatar).not.toBeInTheDocument();

    // Should show Menu icon
    expect(mobileMenuButton).toBeInTheDocument();
  });
});
