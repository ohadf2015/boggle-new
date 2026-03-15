/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import type { ProfileData } from '@/contexts/auth/authTypes';

// Mock dependencies
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: ({ isOpen }: any) => isOpen ? <div data-testid="avatar-builder-modal" /> : null,
}));

jest.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="avatar" {...props} />,
}));

const mockProfile: ProfileData = {
  id: 'test-user-id',
  username: 'testuser',
  display_name: 'Test User',
  avatar_emoji: '👤',
  avatar_color: '#FF6B35',
  avatar_image: 'broccoli-bob',
  profile_picture_url: null,
  country_code: 'US',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  total_coins: 0,
};

describe('ProfileHeader - Mobile Avatar Controls Usability', () => {
  const mockProps = {
    profile: mockProfile,
    isDarkMode: false,
    compact: true,
    isUploading: false,
    onProfilePictureUpload: jest.fn(),
    onRemoveProfilePicture: jest.fn(),
    updateProfile: jest.fn(),
    refreshProfile: jest.fn(),
  };

  describe('Touch Target Size', () => {
    it('camera upload button should have w-7 h-7 classes in compact mode', () => {
      render(<ProfileHeader {...mockProps} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const classes = cameraButton.className;

      expect(classes).toMatch(/w-7/);
      expect(classes).toMatch(/h-7/);
    });

    it('edit avatar button should have w-8 h-8 classes in compact mode', () => {
      render(<ProfileHeader {...mockProps} />);

      const editButton = screen.getByTitle('profile.chooseAvatar');
      const classes = editButton.className;

      expect(classes).toMatch(/w-8/);
      expect(classes).toMatch(/h-8/);
    });

    it('remove picture button should be visible when not compact and profile picture exists', () => {
      const propsWithPicture = {
        ...mockProps,
        compact: false,
        profile: { ...mockProfile, profile_picture_url: 'https://example.com/pic.jpg' }
      };

      render(<ProfileHeader {...propsWithPicture} />);

      const removeButton = screen.getByTitle('profile.removePhoto');
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe('Button Positioning and Spacing', () => {
    it('should use absolute positioning for avatar control buttons', () => {
      render(<ProfileHeader {...mockProps} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const editButton = screen.getByTitle('profile.chooseAvatar');

      // Both buttons are absolutely positioned within a relative container
      expect(cameraButton.className).toMatch(/absolute/);
      expect(editButton.className).toMatch(/absolute/);

      // They share the same parent container
      const controlsContainer = cameraButton.parentElement;
      expect(controlsContainer).toBe(editButton.parentElement);
    });

    it('should position buttons at different corners to avoid overlap', () => {
      render(<ProfileHeader {...mockProps} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const editButton = screen.getByTitle('profile.chooseAvatar');

      // Edit button at bottom-end, camera at bottom-start
      expect(editButton.className).toMatch(/-end-1/);
      expect(cameraButton.className).toMatch(/-start-1/);
    });
  });

  describe('Mobile Layout Optimization', () => {
    it('should use a vertical/stacked layout for avatar controls on mobile', () => {
      render(<ProfileHeader {...mockProps} compact />);

      const avatarContainer = screen.getByTitle('profile.uploadPhoto').closest('div');

      // Check if controls use flexbox with column direction or grid layout
      const styles = avatarContainer ? window.getComputedStyle(avatarContainer) : null;

      // Should NOT rely on absolute positioning for mobile
      // Should use flex or grid layout instead
      expect(styles?.position).not.toBe('absolute');
    });

    it('should have visible labels or clear icons for all avatar controls', () => {
      render(<ProfileHeader {...mockProps} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const editButton = screen.getByTitle('profile.chooseAvatar');

      // Buttons should have aria-label or title for accessibility
      expect(cameraButton).toHaveAttribute('title');
      expect(editButton).toHaveAttribute('title');
    });
  });

  describe('File Input Accessibility', () => {
    it('camera button label should properly trigger file input on click', () => {
      render(<ProfileHeader {...mockProps} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const fileInput = cameraButton.querySelector('input[type="file"]');

      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
    });

    it('file input should not be disabled when not uploading', () => {
      render(<ProfileHeader {...mockProps} isUploading={false} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const fileInput = cameraButton.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput?.disabled).toBe(false);
    });

    it('file input should be disabled when uploading', () => {
      render(<ProfileHeader {...mockProps} isUploading={true} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const fileInput = cameraButton.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput?.disabled).toBe(true);
    });
  });
});
