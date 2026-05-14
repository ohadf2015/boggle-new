import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import type { ProfileData } from '@/contexts/auth';

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
    m: {
      div: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <div {...stripFramerProps(props)}>{children}</div>,
      span: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <span {...stripFramerProps(props)}>{children}</span>,
      button: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <button {...stripFramerProps(props)}>{children}</button>,
      nav: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <nav {...stripFramerProps(props)}>{children}</nav>,
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    LazyMotion: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    domAnimation: {},
    m: {
      div: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <div {...stripFramerProps(props)}>{children}</div>,
      span: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <span {...stripFramerProps(props)}>{children}</span>,
      button: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <button {...stripFramerProps(props)}>{children}</button>,
      nav: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <nav {...stripFramerProps(props)}>{children}</nav>,
    },
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

describe('Header - Avatar Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });

    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      dir: 'ltr',
      currentFlag: '🇺🇸',
      setLanguage: vi.fn(),
    } as ReturnType<typeof useLanguage>);
  });

  describe('Mobile hamburger button display', () => {
    it('should show avatar as profile link (not on hamburger button) for authenticated user with character avatar', () => {
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: 'broccoli-bob',

        total_coins: 100,
        total_xp: 500,
      } as ProfileData;

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        profile,
        isSupabaseEnabled: true,
        loading: false,
        isAdmin: false,
      } as ReturnType<typeof useAuth>);

      render(<Header />);

      // Multiple menu buttons exist (desktop + mobile); click any to open
      const menuButtons = screen.getAllByLabelText(/menu/i);
      expect(menuButtons.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(menuButtons[0]);

      // Avatar is rendered inside the mobile menu as a profile link
      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);
    });

    it('should show avatar as profile link for authenticated user with avatar', () => {
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: 'broccoli-bob',

        total_coins: 100,
        total_xp: 500,
      } as ProfileData;

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        profile,
        isSupabaseEnabled: true,
        loading: false,
        isAdmin: false,
      } as ReturnType<typeof useAuth>);

      render(<Header />);

      const menuButtons = screen.getAllByLabelText(/menu/i);
      fireEvent.click(menuButtons[0]);

      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);
    });

    it('should show avatar as profile link for any authenticated user', () => {
      const selectedAvatarId = 'pizza-pete';
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: selectedAvatarId,

        total_coins: 100,
        total_xp: 500,
      } as ProfileData;

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        profile,
        isSupabaseEnabled: true,
        loading: false,
        isAdmin: false,
      } as ReturnType<typeof useAuth>);

      render(<Header />);

      const menuButtons = screen.getAllByLabelText(/menu/i);
      fireEvent.click(menuButtons[0]);

      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);
    });

    it('should show avatar as profile link when user is not authenticated (guest avatar)', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        profile: null,
        isSupabaseEnabled: true,
        loading: false,
        isAdmin: false,
      } as ReturnType<typeof useAuth>);

      render(<Header />);

      const menuButtons = screen.getAllByLabelText(/menu/i);
      fireEvent.click(menuButtons[0]);

      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);
    });

    it('should show avatar as profile link when profile is null', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        profile: null,
        isSupabaseEnabled: true,
        loading: false,
        isAdmin: false,
      } as ReturnType<typeof useAuth>);

      render(<Header />);

      const menuButtons = screen.getAllByLabelText(/menu/i);
      fireEvent.click(menuButtons[0]);

      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);
    });
  });
});
