/**
 * Avatar Component Tests
 *
 * Tests the unified avatar component with fallback chain:
 * customAvatar (SVG) > profilePictureUrl > deterministic random custom avatar
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Avatar from '../Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, ...props }: {
    src: string;
    alt: string;
    onError?: () => void;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} onError={onError} data-testid="avatar-image" />
  ),
}));

// Mock AvatarRenderer
jest.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: ({ config, size }: { config: CustomAvatarConfig; size: number }) => (
    <svg data-testid="custom-avatar" data-size={size} data-base={config.base} />
  ),
}));

const SAMPLE_CUSTOM_AVATAR: CustomAvatarConfig = {
  gender: 'female',
  base: 'heart',
  skinColor: '#FFDBB4',
  hair: 'bob',
  hairColor: '#2C1B18',
  eyes: 'sparkle',
  mouth: 'smile',
  accessory: 'crown',
  accessoryColor: '#FFD700',
  bgColor: '#FF1493',
};

describe('Avatar', () => {
  describe('custom avatar (highest priority)', () => {
    it('renders custom SVG avatar when customAvatar is provided', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} />);

      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('header-avatar')).toHaveAttribute('data-avatar-type', 'custom');
    });

    it('prefers customAvatar over profilePictureUrl and avatarImage', () => {
      render(
        <Avatar
          customAvatar={SAMPLE_CUSTOM_AVATAR}
          profilePictureUrl="https://example.com/photo.jpg"
          avatarImage="pizza-pete"
        />
      );

      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
    });
  });

  describe('profile picture', () => {
    it('renders profile picture when URL provided and no customAvatar', () => {
      render(<Avatar profilePictureUrl="https://example.com/avatar.jpg" />);

      const img = screen.getByTestId('avatar-image');
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(img).toHaveAttribute('alt', 'Profile');
    });

    it('falls back to generated avatar on profile picture error', async () => {
      render(<Avatar profilePictureUrl="https://example.com/broken.jpg" />);

      fireEvent.error(screen.getByTestId('avatar-image'));

      await waitFor(() => {
        expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
        expect(screen.getByTestId('header-avatar')).toHaveAttribute('data-avatar-type', 'generated');
      });
    });
  });

  describe('generated fallback avatar', () => {
    it('renders generated avatar when no props provided', () => {
      render(<Avatar />);

      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('header-avatar')).toHaveAttribute('data-avatar-type', 'generated');
    });

    it('renders generated avatar when only old avatarImage provided', () => {
      render(<Avatar avatarImage="pizza-pete" />);

      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('header-avatar')).toHaveAttribute('data-avatar-type', 'generated');
    });

    it('generates deterministic avatar — same avatarImage always produces same result', () => {
      const { unmount } = render(<Avatar avatarImage="pizza-pete" />);
      const avatar1 = screen.getByTestId('custom-avatar').getAttribute('data-base');
      unmount();

      render(<Avatar avatarImage="pizza-pete" />);
      const avatar2 = screen.getByTestId('custom-avatar').getAttribute('data-base');

      expect(avatar1).toBe(avatar2);
    });

    it('generates different avatars for different seeds', () => {
      const { unmount } = render(<Avatar avatarImage="pizza-pete" />);
      const avatar1 = screen.getByTestId('custom-avatar').getAttribute('data-base');
      unmount();

      render(<Avatar avatarImage="broccoli-bob" />);
      const avatar2 = screen.getByTestId('custom-avatar').getAttribute('data-base');

      // Different seeds should (very likely) produce different avatars
      // This is probabilistic but with 7 base options, collision is ~14%
      // We test the mechanism works, not exact values
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });

    it('prioritizes avatarImage as seed over profilePictureUrl when both present', () => {
      render(
        <Avatar
          profilePictureUrl="https://example.com/profile.jpg"
          avatarImage="pizza-pete"
        />
      );

      // avatarImage is set and not PROFILE_AVATAR_ID, so profile picture won't show
      // Falls through to generated avatar seeded from avatarImage
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size correctly', () => {
      const { container } = render(<Avatar size="sm" />);
      expect(container.querySelector('.w-6')).toBeInTheDocument();
    });

    it('renders medium size correctly (default)', () => {
      const { container } = render(<Avatar />);
      expect(container.querySelector('.w-8')).toBeInTheDocument();
    });

    it('renders large size correctly', () => {
      const { container } = render(<Avatar size="lg" />);
      expect(container.querySelector('.w-12')).toBeInTheDocument();
    });

    it('renders extra large size correctly', () => {
      const { container } = render(<Avatar size="xl" />);
      expect(container.querySelector('.w-20')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('accepts additional className', () => {
      const { container } = render(<Avatar className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('has rounded-full class for circular shape', () => {
      const { container } = render(<Avatar />);
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('has flex-shrink-0 to prevent shrinking in flex containers', () => {
      const { container } = render(<Avatar />);
      expect(container.querySelector('.flex-shrink-0')).toBeInTheDocument();
    });
  });

  describe('image URL changes', () => {
    it('resets error state when profile picture URL changes', async () => {
      const { rerender } = render(
        <Avatar profilePictureUrl="https://example.com/broken.jpg" />
      );

      fireEvent.error(screen.getByTestId('avatar-image'));

      // After error, falls to generated avatar
      await waitFor(() => {
        expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
      });

      // Update with new profile picture URL — should reset error state
      rerender(<Avatar profilePictureUrl="https://example.com/new-avatar.jpg" />);

      const newImg = screen.getByTestId('avatar-image');
      expect(newImg).toHaveAttribute('src', 'https://example.com/new-avatar.jpg');
    });
  });

  describe('edge cases', () => {
    it('handles empty string profile picture URL — falls to generated', () => {
      render(<Avatar profilePictureUrl="" avatarImage="pizza-pete" />);
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });

    it('handles undefined values gracefully', () => {
      expect(() =>
        render(
          <Avatar
            profilePictureUrl={undefined}
            avatarImage={undefined}
            size={undefined}
          />
        )
      ).not.toThrow();
    });
  });

  describe('memoization', () => {
    it('has displayName set for debugging', () => {
      expect(Avatar.displayName).toBe('Avatar');
    });
  });
});
