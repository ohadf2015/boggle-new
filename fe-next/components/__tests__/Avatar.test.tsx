/**
 * Avatar Component Tests
 *
 * Tests for the unified avatar component that displays profile pictures or emoji fallback
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

describe('Avatar', () => {
  describe('emoji avatar (default fallback)', () => {
    it('renders default emoji avatar when no profile picture provided', () => {
      render(<Avatar />);

      // Default emoji is 🐶
      expect(screen.getByText('🐶')).toBeInTheDocument();
    });

    it('renders custom emoji when provided', () => {
      render(<Avatar avatarEmoji="🦊" />);

      expect(screen.getByText('🦊')).toBeInTheDocument();
    });

    it('applies custom avatar color', () => {
      const { container } = render(<Avatar avatarColor="#FF5733" />);

      const avatarDiv = container.querySelector('div');
      expect(avatarDiv).toHaveStyle({ backgroundColor: '#FF5733' });
    });

    it('uses default teal color when not specified', () => {
      const { container } = render(<Avatar />);

      const avatarDiv = container.querySelector('div');
      expect(avatarDiv).toHaveStyle({ backgroundColor: '#4ECDC4' });
    });
  });

  describe('profile picture avatar', () => {
    it('renders profile picture when URL provided', () => {
      render(<Avatar profilePictureUrl="https://example.com/avatar.jpg" />);

      const img = screen.getByTestId('avatar-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('falls back to emoji on image error', async () => {
      render(
        <Avatar
          profilePictureUrl="https://example.com/broken.jpg"
          avatarEmoji="🐱"
        />
      );

      const img = screen.getByTestId('avatar-image');

      // Simulate image load error
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

      const avatarDiv = container.querySelector('.w-24');
      expect(avatarDiv).toBeInTheDocument();
    });

    it('applies correct text size for different avatar sizes', () => {
      const { container: smContainer } = render(<Avatar size="sm" />);
      expect(smContainer.querySelector('.text-sm')).toBeInTheDocument();

      const { container: xlContainer } = render(<Avatar size="xl" />);
      expect(xlContainer.querySelector('.text-5xl')).toBeInTheDocument();
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
    it('resets error state when profile picture URL changes', () => {
      const { rerender } = render(
        <Avatar
          profilePictureUrl="https://example.com/broken.jpg"
          avatarEmoji="🐱"
        />
      );

      // Trigger error on first image
      const img = screen.getByTestId('avatar-image');
      fireEvent.error(img);

      // Should show emoji after error
      expect(screen.getByText('🐱')).toBeInTheDocument();

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

      // Empty string should be falsy, show emoji
      expect(screen.getByText('🦁')).toBeInTheDocument();
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

    it('handles various emoji types', () => {
      const emojis = ['👨‍💻', '🏳️‍🌈', '👨‍👩‍👧‍👦', '🧑🏽‍🎨'];

      emojis.forEach(emoji => {
        const { unmount } = render(<Avatar avatarEmoji={emoji} />);
        expect(screen.getByText(emoji)).toBeInTheDocument();
        unmount();
      });
    });

    it('handles hex colors with different formats', () => {
      const colors = ['#FFF', '#FFFFFF', '#ff5733', '#FF5733'];

      colors.forEach((color, index) => {
        const { container, unmount } = render(
          <Avatar avatarColor={color} key={index} />
        );

        const avatarDiv = container.querySelector('div');
        expect(avatarDiv).toHaveStyle({ backgroundColor: color });
        unmount();
      });
    });
  });

  describe('memoization', () => {
    it('has displayName set for debugging', () => {
      expect(Avatar.displayName).toBe('Avatar');
    });
  });
});
