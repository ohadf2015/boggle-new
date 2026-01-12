import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { PROFILE_AVATAR_ID } from '@/components/Avatar';
import type { ProfileData } from '@/contexts/auth';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/LanguageContext');
jest.mock('next/navigation');
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
      data-testid="avatar"
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

describe('Header - Avatar Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as ReturnType<typeof useRouter>);

    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      dir: 'ltr',
      currentFlag: '🇺🇸',
      setLanguage: jest.fn(),
    } as ReturnType<typeof useLanguage>);
  });

  describe('Mobile menu avatar display', () => {
    it('should show selected avatar image in mobile menu when user has chosen a character avatar', async () => {
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: 'broccoli-bob', // User selected a character avatar
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

      // Open mobile menu
      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const avatar = screen.getByTestId('avatar');
        expect(avatar).toHaveAttribute('data-avatar-image', 'broccoli-bob');
        expect(avatar).toHaveAttribute('data-profile-picture-url', 'https://example.com/profile.jpg');
      });
    });

    it('should show profile picture in mobile menu when user has chosen profile picture option', async () => {
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: PROFILE_AVATAR_ID, // User explicitly selected profile picture
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

      // Open mobile menu
      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const avatar = screen.getByTestId('avatar');
        expect(avatar).toHaveAttribute('data-avatar-image', PROFILE_AVATAR_ID);
        expect(avatar).toHaveAttribute('data-profile-picture-url', 'https://example.com/profile.jpg');
      });
    });

    it('should not show random avatar when user has selected specific avatar', async () => {
      const selectedAvatarId = 'captain-carrot';
      const profile: ProfileData = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_image: selectedAvatarId,
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

      // Open mobile menu
      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const avatar = screen.getByTestId('avatar');
        // Should show the user's selected avatar, not a different one
        expect(avatar).toHaveAttribute('data-avatar-image', selectedAvatarId);
      });
    });
  });
});
