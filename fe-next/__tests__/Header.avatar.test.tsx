import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { PROFILE_AVATAR_ID } from '@/components/Avatar';
import type { ProfileData } from '@/contexts/auth';

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

describe('Header - Avatar Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });

    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      dir: 'ltr',
      currentFlag: '🇺🇸',
      setLanguage: jest.fn(),
    } as ReturnType<typeof useLanguage>);
  });

  describe('Mobile hamburger button display', () => {
    it('should show avatar as profile link (not on hamburger button) for authenticated user with character avatar', () => {
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: 'broccoli-bob',
        profile_picture_url: 'https://example.com/profile.jpg',
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

      // Avatar is rendered as profile links (desktop + mobile), not on the hamburger button
      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);

      // Menu icon should be present (multiple menu buttons exist, check at least one is present)
      const menuButtons = screen.getAllByLabelText(/menu/i);
      expect(menuButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should show avatar as profile link for authenticated user with profile picture', () => {
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: PROFILE_AVATAR_ID,
        profile_picture_url: 'https://example.com/profile.jpg',
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

      // Avatar is rendered as profile links (desktop + mobile)
      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);

      // Menu icon should be present (multiple menu buttons exist, check at least one is present)
      const menuButtons = screen.getAllByLabelText(/menu/i);
      expect(menuButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should show avatar as profile link for any authenticated user', () => {
      const selectedAvatarId = 'pizza-pete';
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: selectedAvatarId,
        profile_picture_url: null,
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

      // Avatar is rendered as profile links (desktop + mobile)
      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);

      // Menu icon should be present (multiple menu buttons exist, check at least one is present)
      const menuButtons = screen.getAllByLabelText(/menu/i);
      expect(menuButtons.length).toBeGreaterThanOrEqual(1);
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

      // Avatar is still rendered as a profile link for guests
      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);

      // Menu icon should be present (multiple menu buttons exist, check at least one is present)
      const menuButtons = screen.getAllByLabelText(/menu/i);
      expect(menuButtons.length).toBeGreaterThanOrEqual(1);
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

      // Avatar is still rendered as a profile link
      const avatars = screen.getAllByTestId('header-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);

      // Menu icon should be present (multiple menu buttons exist, check at least one is present)
      const menuButtons = screen.getAllByLabelText(/menu/i);
      expect(menuButtons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
