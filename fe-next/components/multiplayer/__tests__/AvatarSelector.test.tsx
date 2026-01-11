/**
 * Tests for AvatarSelector component
 *
 * Tests the UI and behavior including:
 * - Collapsed/expanded state toggling
 * - Avatar selection
 * - Profile picture display
 * - Dark mode styling
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarSelector } from '../AvatarSelector';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'profile.chooseAvatar': 'Choose Avatar',
        'profile.you': 'YOU',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('@/utils/avatarConfig', () => ({
  AVATARS: [
    { id: 'avatar-1', name: 'Test Avatar 1', filename: 'test1.png' },
    { id: 'avatar-2', name: 'Test Avatar 2', filename: 'test2.png' },
    { id: 'avatar-3', name: 'Test Avatar 3', filename: 'test3.png' },
  ],
  getAvatarPath: (avatar: { filename: string }) => `/avatars/${avatar.filename}`,
}));

jest.mock('@/components/EmojiAvatarPicker', () => ({
  PROFILE_AVATAR_ID: 'profile-avatar',
}));

describe('AvatarSelector', () => {
  const mockOnAvatarChange = jest.fn();

  const defaultProps = {
    selectedAvatarId: 'avatar-1',
    onAvatarChange: mockOnAvatarChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Collapsed State', () => {
    it('should render collapsed state by default', () => {
      render(<AvatarSelector {...defaultProps} />);

      expect(screen.getByText('Choose Avatar')).toBeInTheDocument();
      expect(screen.getByText('Test Avatar 1')).toBeInTheDocument();

      // Should not show avatar grid initially
      expect(screen.queryByAltText('Test Avatar 2')).not.toBeInTheDocument();
    });

    it('should display current selected avatar', () => {
      render(<AvatarSelector {...defaultProps} />);

      const avatarImage = screen.getByAltText('Test Avatar 1');
      expect(avatarImage).toBeInTheDocument();
      // Next.js Image transforms src, so check it contains the path
      expect(avatarImage.getAttribute('src')).toContain('test1.png');
    });

    it('should display profile picture when using profile avatar', () => {
      const profilePictureUrl = 'https://example.com/profile.jpg';
      render(
        <AvatarSelector
          selectedAvatarId="profile-avatar"
          onAvatarChange={mockOnAvatarChange}
          profilePictureUrl={profilePictureUrl}
        />
      );

      const profileImage = screen.getByAltText('YOU');
      expect(profileImage).toBeInTheDocument();
      // Next.js Image transforms src, so check it contains the URL
      expect(profileImage.getAttribute('src')).toContain(encodeURIComponent(profilePictureUrl));
    });
  });

  describe('Expanded State', () => {
    it('should expand when clicked', async () => {
      const user = userEvent.setup();
      render(<AvatarSelector {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });
      await user.click(toggleButton);

      // Should show all avatars in grid (multiple instances of same avatar may exist)
      expect(screen.getAllByAltText('Test Avatar 1').length).toBeGreaterThan(0);
      expect(screen.getByAltText('Test Avatar 2')).toBeInTheDocument();
      expect(screen.getByAltText('Test Avatar 3')).toBeInTheDocument();
    });

    it('should collapse when clicked again', async () => {
      const user = userEvent.setup();
      render(<AvatarSelector {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });

      // Expand
      await user.click(toggleButton);
      expect(screen.getByAltText('Test Avatar 2')).toBeInTheDocument();

      // Collapse
      await user.click(toggleButton);
      expect(screen.queryByAltText('Test Avatar 2')).not.toBeInTheDocument();
    });

    it('should display profile picture option when available', async () => {
      const user = userEvent.setup();
      const profilePictureUrl = 'https://example.com/profile.jpg';

      render(
        <AvatarSelector
          selectedAvatarId="avatar-1"
          onAvatarChange={mockOnAvatarChange}
          profilePictureUrl={profilePictureUrl}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });
      await user.click(toggleButton);

      const profileOption = screen.getByAltText('Your Profile');
      expect(profileOption).toBeInTheDocument();
      // Next.js Image transforms src, so check it contains the URL
      expect(profileOption.getAttribute('src')).toContain(encodeURIComponent(profilePictureUrl));
    });
  });

  describe('Avatar Selection', () => {
    it('should call onAvatarChange when selecting an avatar', async () => {
      const user = userEvent.setup();
      render(<AvatarSelector {...defaultProps} />);

      // Expand grid
      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });
      await user.click(toggleButton);

      // Select avatar-2
      const avatar2Button = screen.getByAltText('Test Avatar 2').closest('button');
      await user.click(avatar2Button!);

      expect(mockOnAvatarChange).toHaveBeenCalledWith('avatar-2');
    });

    it('should collapse after selecting an avatar', async () => {
      const user = userEvent.setup();
      render(<AvatarSelector {...defaultProps} />);

      // Expand
      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });
      await user.click(toggleButton);

      // Select avatar
      const avatar2Button = screen.getByAltText('Test Avatar 2').closest('button');
      await user.click(avatar2Button!);

      // Should collapse (avatar-2 should not be visible in collapsed state)
      expect(screen.queryByAltText('Test Avatar 2')).not.toBeInTheDocument();
    });

    it('should call onAvatarChange when selecting profile picture', async () => {
      const user = userEvent.setup();
      const profilePictureUrl = 'https://example.com/profile.jpg';

      render(
        <AvatarSelector
          selectedAvatarId="avatar-1"
          onAvatarChange={mockOnAvatarChange}
          profilePictureUrl={profilePictureUrl}
        />
      );

      // Expand
      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });
      await user.click(toggleButton);

      // Select profile picture
      const profileButton = screen.getByAltText('Your Profile').closest('button');
      await user.click(profileButton!);

      expect(mockOnAvatarChange).toHaveBeenCalledWith('profile-avatar');
    });
  });

  describe('Dark Mode Styling', () => {
    it('should apply dark mode classes', () => {
      render(<AvatarSelector {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });

      // Check for dark mode background classes
      expect(toggleButton).toHaveClass('bg-neo-navy/40');
      expect(toggleButton).toHaveClass('hover:bg-neo-navy/60');
    });

    it('should use neo-brutalist shadow styles', () => {
      render(<AvatarSelector {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });

      expect(toggleButton).toHaveClass('shadow-hard-sm');
      expect(toggleButton).toHaveClass('hover:shadow-hard');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button', () => {
      render(<AvatarSelector {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should have alt text for all avatar images', async () => {
      const user = userEvent.setup();
      render(<AvatarSelector {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /choose avatar/i });
      await user.click(toggleButton);

      expect(screen.getAllByAltText('Test Avatar 1').length).toBeGreaterThan(0);
      expect(screen.getByAltText('Test Avatar 2')).toBeInTheDocument();
      expect(screen.getByAltText('Test Avatar 3')).toBeInTheDocument();
    });
  });
});
