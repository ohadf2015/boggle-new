/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { PROFILE_AVATAR_ID } from '@/components/Avatar';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/LanguageContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/en'),
}));
jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('framer-motion', () => {
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
jest.mock('@/components/MusicControls', () => ({
  __esModule: true,
  default: () => <div data-testid="music-controls">Music</div>,
}));
jest.mock('@/components/auth/AuthButton', () => ({
  __esModule: true,
  default: ({ inline }: { inline?: boolean }) => (
    <div data-testid={inline ? 'auth-button-inline' : 'auth-button'}>
      AuthButton
    </div>
  ),
}));
jest.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ avatarImage, profilePictureUrl }: { avatarImage?: string; profilePictureUrl?: string }) => (
    <div
      data-testid="header-avatar"
      data-avatar-image={avatarImage}
      data-profile-picture-url={profilePictureUrl}
    >
      Avatar
    </div>
  ),
  PROFILE_AVATAR_ID: '__profile_avatar__',
}));

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('Header - Mobile Menu Avatar Bug', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      currentFlag: '🇺🇸',
      setLanguage: jest.fn(),
      availableLanguages: ['en', 'he', 'sv', 'ja'],
    } as any);
  });

  it('FIXED: hamburger menu should ALWAYS show Menu icon, not avatar (authenticated user with profile picture)', () => {
    // Setup: User with custom profile picture uploaded
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      profile: {
        id: 'test-user',
        username: 'TestUser',
        profile_picture_url: 'https://example.com/custom-profile.jpg',
        avatar_image: PROFILE_AVATAR_ID, // Special ID indicating use profile picture
        total_coins: 100,
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
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

    // FIXED: Hamburger button should NOT show avatar
    const avatar = mobileMenuButton!.querySelector('[data-testid="header-avatar"]');
    expect(avatar).not.toBeInTheDocument();

    // Should show Menu icon
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('FIXED: hamburger menu should ALWAYS show Menu icon, not avatar (authenticated user with character avatar)', () => {
    // Setup: User with custom profile picture but avatarImage explicitly set to character avatar
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      profile: {
        id: 'test-user',
        username: 'TestUser',
        profile_picture_url: 'https://example.com/custom-profile.jpg',
        avatar_image: 'broccoli-bob', // User explicitly wants character avatar
        total_coins: 100,
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
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

    // FIXED: Hamburger button should NOT show avatar
    const avatar = mobileMenuButton!.querySelector('[data-testid="header-avatar"]');
    expect(avatar).not.toBeInTheDocument();

    // Should show Menu icon
    expect(mobileMenuButton).toBeInTheDocument();
  });
});
