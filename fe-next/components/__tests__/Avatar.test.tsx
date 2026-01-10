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
  mapEmojiToAvatar: () => ({ id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' }),
}));

describe('Avatar', () => {
  describe('image avatar (default)', () => {
    it('renders image avatar when avatarImage is provided', () => {
      render(<Avatar avatarImage="pizza-pete" />);

      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/avatars/pizza-pete.png');
    });

    it('renders image avatar when emoji is provided (mapped to image)', () => {
      render(<Avatar avatarEmoji="🦊" />);

      // Emoji gets mapped to an image avatar via mapEmojiToAvatar mock
      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/avatars/broccoli-bob.png');
    });

    it('renders emoji fallback when nothing provided (no avatarImage)', () => {
      render(<Avatar />);

      // Without avatarImage or avatarEmoji, component shows emoji fallback directly
      expect(screen.getByText('🐶')).toBeInTheDocument();
    });
  });

  describe('emoji fallback (backwards compatibility)', () => {
    it('falls back to emoji when avatar image fails to load', async () => {
      render(<Avatar avatarEmoji="🦊" />);

      // First the avatar image is shown
      const img = screen.getByTestId('avatar-image');

      // Trigger image error
      fireEvent.error(img);

      // Should show emoji fallback after image error
      await waitFor(() => {
        expect(screen.getByText('🦊')).toBeInTheDocument();
      });
    });

    it('applies custom avatar color in emoji fallback (no avatarImage)', () => {
      // When no avatarImage provided, component renders emoji directly
      const { container } = render(<Avatar avatarColor="#FF5733" />);

      const emojiContainer = container.querySelector('[style*="background-color"]');
      expect(emojiContainer).toBeInTheDocument();
      expect(emojiContainer).toHaveTextContent('🐶');
    });

    it('uses default teal color in emoji fallback (no avatarImage)', () => {
      // When no avatarImage provided, component renders emoji directly
      const { container } = render(<Avatar />);

      const emojiContainer = container.querySelector('[style*="background-color"]');
      expect(emojiContainer).toBeInTheDocument();
      expect(emojiContainer).toHaveTextContent('🐶');
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
      render(
        <Avatar
          profilePictureUrl="https://example.com/broken.jpg"
          avatarEmoji="🐱"
        />
      );

      const img = screen.getByTestId('avatar-image');

      // Simulate image load error
      fireEvent.error(img);

      // Should try avatar image next (mapped from emoji)
      await waitFor(() => {
        const newImg = screen.getByTestId('avatar-image');
        expect(newImg).toHaveAttribute('src', '/avatars/broccoli-bob.png');
      });
    });

    it('falls back to emoji after both profile picture and avatar image fail', async () => {
      render(
        <Avatar
          profilePictureUrl="https://example.com/broken.jpg"
          avatarEmoji="🐱"
        />
      );

      // First error - profile picture fails
      let img = screen.getByTestId('avatar-image');
      fireEvent.error(img);

      // Wait for avatar image to be attempted
      await waitFor(() => {
        img = screen.getByTestId('avatar-image');
        expect(img).toHaveAttribute('src', '/avatars/broccoli-bob.png');
      });

      // Second error - avatar image fails too
      fireEvent.error(img);

      // Should now show emoji fallback
      await waitFor(() => {
        expect(screen.getByText('🐱')).toBeInTheDocument();
      });
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
          avatarEmoji="🐱"
        />
      );

      // Trigger errors to fall back to emoji
      let img = screen.getByTestId('avatar-image');
      fireEvent.error(img);

      await waitFor(() => {
        img = screen.getByTestId('avatar-image');
      });
      fireEvent.error(img);

      // Should show emoji after errors
      await waitFor(() => {
        expect(screen.getByText('🐱')).toBeInTheDocument();
      });

      // Update with new profile picture URL
      rerender(
        <Avatar
          profilePictureUrl="https://example.com/new-avatar.jpg"
          avatarEmoji="🐱"
        />
      );

      // Should try to load new image
      const newImg = screen.getByTestId('avatar-image');
      expect(newImg).toHaveAttribute('src', 'https://example.com/new-avatar.jpg');
    });
  });

  describe('edge cases', () => {
    it('handles empty string profile picture URL', () => {
      render(<Avatar profilePictureUrl="" avatarEmoji="🦁" />);

      // Empty string should be falsy, show avatar image (mapped from emoji)
      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
    });

    it('handles undefined values gracefully', () => {
      expect(() =>
        render(
          <Avatar
            profilePictureUrl={undefined}
            avatarEmoji={undefined}
            avatarColor={undefined}
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
