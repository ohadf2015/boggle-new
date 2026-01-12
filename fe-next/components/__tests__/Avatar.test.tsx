/**
 * Avatar Component Tests
 *
 * Tests for the unified avatar component that displays profile pictures or image avatars
 * with emoji fallback for backwards compatibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Avatar from '../Avatar';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, ...props }: {
    src: string;
    alt: string;
    onError?: () => void;
    [key: string]: unknown;
  }) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        {...props}
        onError={onError}
        data-testid="avatar-image"
      />
    );
  },
}));

// Mock avatar config utilities
jest.mock('@/utils/avatarConfig', () => ({
  getAvatarPath: (avatar: { id: string; filename: string } | string) => {
    if (typeof avatar === 'string') {
      return `/avatars/${avatar}.png`;
    }
    return `/avatars/${avatar.filename}`;
  },
  getRandomAvatar: () => ({ id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' }),
  AVATARS: [
    { id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' },
    { id: 'pizza-pete', name: 'Pizza Pete', filename: 'pizza-pete.png' },
  ],
}));

describe('Avatar', () => {
  describe('image avatar (default)', () => {
    it('renders image avatar when avatarImage is provided', () => {
      render(<Avatar avatarImage="pizza-pete" />);

      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/avatars/pizza-pete.png');
    });

    it('renders fallback avatar when no avatarImage is provided', () => {
      render(<Avatar />);

      // Without avatarImage, component shows first avatar from AVATARS list
      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/avatars/broccoli-bob.png');
    });
  });

  describe('fallback behavior', () => {
    it('shows user icon fallback when avatar image fails to load', async () => {
      render(<Avatar avatarImage="broccoli-bob" />);

      // First the avatar image is shown
      const img = screen.getByTestId('avatar-image');

      // Trigger image error
      fireEvent.error(img);

      // Should show user icon fallback after image error
      await waitFor(() => {
        expect(screen.getByTestId('avatar-fallback-icon')).toBeInTheDocument();
      });
    });

    it('renders fallback avatar when no props provided', () => {
      const { container } = render(<Avatar />);

      // Should show fallback avatar from AVATARS list
      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
    });
  });

  describe('profile picture avatar', () => {
    it('renders profile picture when URL provided', () => {
      render(<Avatar profilePictureUrl="https://example.com/avatar.jpg" />);

      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('falls back to avatar image on profile picture error', async () => {
      // When profilePictureUrl is provided without avatarImage (or with PROFILE_AVATAR_ID),
      // it shows profile picture first, then falls back to default avatar on error
      render(
        <Avatar
          profilePictureUrl="https://example.com/broken.jpg"
        />
      );

      const img = screen.getByTestId('avatar-image');

      // Simulate image load error
      fireEvent.error(img);

      // Should try fallback avatar next (first in AVATARS list)
      await waitFor(() => {
        const newImg = screen.getByTestId('avatar-image');
        expect(newImg).toHaveAttribute('src', '/avatars/broccoli-bob.png');
      });
    });

    it('falls back to user icon after both profile picture and fallback avatar fail', async () => {
      render(
        <Avatar
          profilePictureUrl="https://example.com/broken.jpg"
        />
      );

      // First error - profile picture fails
      let img = screen.getByTestId('avatar-image');
      fireEvent.error(img);

      // Wait for fallback avatar to be attempted
      await waitFor(() => {
        img = screen.getByTestId('avatar-image');
        expect(img).toHaveAttribute('src', '/avatars/broccoli-bob.png');
      });

      // Second error - fallback avatar fails too
      fireEvent.error(img);

      // Should now show user icon fallback
      await waitFor(() => {
        expect(screen.getByTestId('avatar-fallback-icon')).toBeInTheDocument();
      });
    });

    it('prioritizes avatarImage over profilePictureUrl when both provided', () => {
      // When both profilePictureUrl and avatarImage are provided (and avatarImage != PROFILE_AVATAR_ID),
      // the avatarImage takes priority
      render(
        <Avatar
          profilePictureUrl="https://example.com/profile.jpg"
          avatarImage="pizza-pete"
        />
      );

      const img = screen.getByTestId('avatar-image');
      expect(img).toHaveAttribute('src', '/avatars/pizza-pete.png');
    });

    it('has alt text for accessibility', () => {
      render(<Avatar profilePictureUrl="https://example.com/avatar.jpg" />);

      const img = screen.getByTestId('avatar-image');
      expect(img).toHaveAttribute('alt', 'Profile');
    });
  });

  describe('sizes', () => {
    it('renders small size correctly', () => {
      const { container } = render(<Avatar size="sm" />);

      const avatarDiv = container.querySelector('.w-6');
      expect(avatarDiv).toBeInTheDocument();
    });

    it('renders medium size correctly (default)', () => {
      const { container } = render(<Avatar />);

      const avatarDiv = container.querySelector('.w-8');
      expect(avatarDiv).toBeInTheDocument();
    });

    it('renders large size correctly', () => {
      const { container } = render(<Avatar size="lg" />);

      const avatarDiv = container.querySelector('.w-12');
      expect(avatarDiv).toBeInTheDocument();
    });

    it('renders extra large size correctly', () => {
      const { container } = render(<Avatar size="xl" />);

      const avatarDiv = container.querySelector('.w-20');
      expect(avatarDiv).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('accepts additional className', () => {
      const { container } = render(<Avatar className="custom-class" />);

      const avatarDiv = container.querySelector('.custom-class');
      expect(avatarDiv).toBeInTheDocument();
    });

    it('has rounded-full class for circular shape', () => {
      const { container } = render(<Avatar />);

      const avatarDiv = container.querySelector('.rounded-full');
      expect(avatarDiv).toBeInTheDocument();
    });

    it('has flex-shrink-0 to prevent shrinking in flex containers', () => {
      const { container } = render(<Avatar />);

      const avatarDiv = container.querySelector('.flex-shrink-0');
      expect(avatarDiv).toBeInTheDocument();
    });
  });

  describe('image URL changes', () => {
    it('resets error state when profile picture URL changes', async () => {
      const { rerender } = render(
        <Avatar
          profilePictureUrl="https://example.com/broken.jpg"
        />
      );

      // Trigger errors to fall back to user icon
      let img = screen.getByTestId('avatar-image');
      fireEvent.error(img);

      await waitFor(() => {
        img = screen.getByTestId('avatar-image');
        expect(img).toHaveAttribute('src', '/avatars/broccoli-bob.png');
      });
      fireEvent.error(img);

      // Should show fallback icon after errors
      await waitFor(() => {
        expect(screen.getByTestId('avatar-fallback-icon')).toBeInTheDocument();
      });

      // Update with new profile picture URL - should reset error state
      rerender(
        <Avatar
          profilePictureUrl="https://example.com/new-avatar.jpg"
        />
      );

      // Should try to load new image
      const newImg = screen.getByTestId('avatar-image');
      expect(newImg).toHaveAttribute('src', 'https://example.com/new-avatar.jpg');
    });
  });

  describe('edge cases', () => {
    it('handles empty string profile picture URL', () => {
      render(<Avatar profilePictureUrl="" avatarImage="pizza-pete" />);

      // Empty string should be falsy, show avatar image
      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/avatars/pizza-pete.png');
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
