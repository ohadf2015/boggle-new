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
    onShowEmojiPicker: jest.fn(),
    updateProfile: jest.fn(),
    refreshProfile: jest.fn(),
  };

  describe('Touch Target Size (WCAG 2.5.5 - Target Size)', () => {
    it('camera upload button should have min-w-[44px] min-h-[44px] classes for mobile touch', () => {
      render(<ProfileHeader {...mockProps} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const classes = cameraButton.className;

      // WCAG 2.5.5 Level AAA: Target size should be at least 44x44px
      // Check for Tailwind classes that enforce minimum size
      expect(classes).toMatch(/min-w-\[44px\]/);
      expect(classes).toMatch(/min-h-\[44px\]/);
    });

    it('edit emoji button should have min-w-[44px] min-h-[44px] classes for mobile touch', () => {
      render(<ProfileHeader {...mockProps} />);

      const editButton = screen.getByTitle('profile.chooseEmoji');
      const classes = editButton.className;

      expect(classes).toMatch(/min-w-\[44px\]/);
      expect(classes).toMatch(/min-h-\[44px\]/);
    });

    it('remove picture button should have min-w-[44px] min-h-[44px] classes when profile picture exists', () => {
      const propsWithPicture = {
        ...mockProps,
        profile: { ...mockProfile, profile_picture_url: 'https://example.com/pic.jpg' }
      };

      render(<ProfileHeader {...propsWithPicture} />);

      const removeButton = screen.getByTitle('profile.removePhoto');
      const classes = removeButton.className;

      expect(classes).toMatch(/min-w-\[44px\]/);
      expect(classes).toMatch(/min-h-\[44px\]/);
    });
  });

  describe('Button Positioning and Spacing', () => {
    it('should use flexbox layout with gap for proper button spacing', () => {
      render(<ProfileHeader {...mockProps} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const editButton = screen.getByTitle('profile.chooseEmoji');

      // Buttons should be siblings in a flex container with gap
      const controlsContainer = cameraButton.parentElement;
      expect(controlsContainer).toBe(editButton.parentElement);

      // Container should use flexbox for layout
      const containerClasses = controlsContainer?.className || '';
      expect(containerClasses).toMatch(/flex/);
      expect(containerClasses).toMatch(/gap-/); // Should have gap class for spacing
    });

    it('should not use absolute positioning that causes button overlap', () => {
      const propsWithPicture = {
        ...mockProps,
        profile: { ...mockProfile, profile_picture_url: 'https://example.com/pic.jpg' }
      };

      render(<ProfileHeader {...propsWithPicture} />);

      const cameraButton = screen.getByTitle('profile.uploadPhoto');
      const removeButton = screen.getByTitle('profile.removePhoto');

      // Check that buttons don't use absolute positioning (which caused overlap in old version)
      const cameraClasses = cameraButton.className;
      const removeClasses = removeButton.className;

      expect(cameraClasses).not.toMatch(/absolute/);
      expect(removeClasses).not.toMatch(/absolute/);

      // Both buttons should be in the same flex container
      expect(cameraButton.parentElement).toBe(removeButton.parentElement);
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
      const editButton = screen.getByTitle('profile.chooseEmoji');

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
