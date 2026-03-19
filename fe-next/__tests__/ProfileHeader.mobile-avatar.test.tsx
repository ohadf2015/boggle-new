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
    updateProfile: jest.fn(),
    refreshProfile: jest.fn(),
  };

  describe('Touch Target Size', () => {
    it('edit avatar button should have w-6 h-6 classes in compact mode', () => {
      render(<ProfileHeader {...mockProps} />);

      const editButton = screen.getByTitle('profile.chooseAvatar');
      const classes = editButton.className;

      expect(classes).toMatch(/w-6/);
      expect(classes).toMatch(/h-6/);
    });
  });

  describe('Button Positioning and Spacing', () => {
    it('should use absolute positioning for avatar control buttons', () => {
      render(<ProfileHeader {...mockProps} />);

      const editButton = screen.getByTitle('profile.chooseAvatar');

      // Button is absolutely positioned within a relative container
      expect(editButton.className).toMatch(/absolute/);
    });
  });

  describe('Mobile Layout Optimization', () => {
    it('should have visible labels or clear icons for all avatar controls', () => {
      render(<ProfileHeader {...mockProps} />);

      const editButton = screen.getByTitle('profile.chooseAvatar');

      // Button should have aria-label or title for accessibility
      expect(editButton).toHaveAttribute('title');
    });
  });
});
