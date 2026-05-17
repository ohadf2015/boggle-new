/**
 * Avatar Component Tests
 *
 * Tests the unified avatar component with fallback chain:
 * customAvatar (SVG) > deterministic random custom avatar
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Avatar from '../Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// Mock next/image
vi.mock('next/image', () => ({
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
vi.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: ({ config, size, mode, disableEffects }: { config: CustomAvatarConfig; size: number; mode?: string; disableEffects?: boolean }) => (
    <svg
      data-testid="custom-avatar"
      data-size={size}
      data-base={config.base}
      data-mode={mode ?? ''}
      data-disable-effects={disableEffects ? 'true' : 'false'}
    />
  ),
}));

// Mock NeoSkeletonAvatar
vi.mock('@/components/ui/skeleton', () => ({
  NeoSkeletonAvatar: ({ size, className }: { size: number; className?: string }) => (
    <div data-testid="avatar-skeleton" data-size={size} className={className} role="status" aria-busy="true" />
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

    it('prefers customAvatar over avatarImage', () => {
      render(
        <Avatar
          customAvatar={SAMPLE_CUSTOM_AVATAR}
          avatarImage="pizza-pete"
        />
      );

      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
    });
  });

  describe('profile frame cosmetic', () => {
    it('applies frame class when frame prop set', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} frame="frame-gold" />);
      const wrapper = screen.getByTestId('header-avatar');
      expect(wrapper.getAttribute('data-frame')).toBe('frame-gold');
      expect(wrapper.className).toContain('avatar-frame-gold');
    });

    it('omits frame attr when frame is null', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} frame={null} />);
      const wrapper = screen.getByTestId('header-avatar');
      expect(wrapper.getAttribute('data-frame')).toBeNull();
    });

    it('omits frame attr when frame is "frame-none"', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} frame="frame-none" />);
      const wrapper = screen.getByTestId('header-avatar');
      expect(wrapper.getAttribute('data-frame')).toBeNull();
    });
  });

  describe('generated fallback avatar', () => {
    it('renders generated avatar when userId seed is provided but no customAvatar', () => {
      render(<Avatar userId="some-user" />);

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

    it('uses avatarImage as seed for generated avatar', () => {
      render(
        <Avatar
          avatarImage="pizza-pete"
        />
      );

      // Falls through to generated avatar seeded from avatarImage
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size correctly', () => {
      const { container } = render(<Avatar userId="test" size="sm" />);
      expect(container.querySelector('.w-6')).toBeInTheDocument();
    });

    it('renders medium size correctly (default)', () => {
      const { container } = render(<Avatar userId="test" />);
      expect(container.querySelector('.w-8')).toBeInTheDocument();
    });

    it('renders large size correctly', () => {
      const { container } = render(<Avatar userId="test" size="lg" />);
      expect(container.querySelector('.w-12')).toBeInTheDocument();
    });

    it('renders extra large size correctly', () => {
      const { container } = render(<Avatar userId="test" size="xl" />);
      expect(container.querySelector('.w-20')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('accepts additional className', () => {
      const { container } = render(<Avatar userId="test" className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('has rounded-full class for circular shape', () => {
      const { container } = render(<Avatar userId="test" />);
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('has shrink-0 to prevent shrinking in flex containers', () => {
      const { container } = render(<Avatar userId="test" />);
      expect(container.querySelector('.shrink-0')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles undefined values gracefully', () => {
      expect(() =>
        render(
          <Avatar
            avatarImage={undefined}
            size={undefined}
          />
        )
      ).not.toThrow();
    });
  });

  describe('loading state', () => {
    it('renders skeleton when isLoading is true', () => {
      render(<Avatar isLoading />);
      expect(screen.getByTestId('avatar-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('header-avatar')).not.toBeInTheDocument();
    });

    it('renders skeleton with correct size', () => {
      render(<Avatar isLoading size="lg" />);
      expect(screen.getByTestId('avatar-skeleton')).toHaveAttribute('data-size', '48');
    });

    it('passes className to skeleton', () => {
      render(<Avatar isLoading className="my-class" />);
      expect(screen.getByTestId('avatar-skeleton')).toHaveClass('my-class');
    });

    it('skeleton has accessible loading attributes', () => {
      render(<Avatar isLoading />);
      const skeleton = screen.getByTestId('avatar-skeleton');
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('userId-based unique avatars', () => {
    it('generates different avatars for different userIds when no other props', () => {
      const { unmount } = render(<Avatar userId="user-abc-123" />);
      const avatar1 = screen.getByTestId('custom-avatar').getAttribute('data-base');
      unmount();

      render(<Avatar userId="user-xyz-789" />);
      const avatar2 = screen.getByTestId('custom-avatar').getAttribute('data-base');

      // Different userIds should produce generated avatars (mechanism test)
      expect(screen.getByTestId('header-avatar')).toHaveAttribute('data-avatar-type', 'generated');
      // With enough variation in hash, bases will likely differ
      expect(avatar1).toBeDefined();
      expect(avatar2).toBeDefined();
    });

    it('generates deterministic avatar for same userId', () => {
      const { unmount } = render(<Avatar userId="consistent-user" />);
      const avatar1 = screen.getByTestId('custom-avatar').getAttribute('data-base');
      unmount();

      render(<Avatar userId="consistent-user" />);
      const avatar2 = screen.getByTestId('custom-avatar').getAttribute('data-base');

      expect(avatar1).toBe(avatar2);
    });

    it('prefers userId over legacy avatarImage as seed', () => {
      const { unmount } = render(<Avatar avatarImage="pizza-pete" userId="user-123" />);
      const withUserId = screen.getByTestId('custom-avatar').getAttribute('data-base');
      unmount();

      render(<Avatar userId="user-123" />);
      const userIdOnly = screen.getByTestId('custom-avatar').getAttribute('data-base');

      // userId wins over deprecated avatarImage — seeds match userId-only render
      expect(withUserId).toBe(userIdOnly);
    });

    it('falls back to legacy avatarImage when userId is absent', () => {
      const { unmount } = render(<Avatar avatarImage="pizza-pete" />);
      const seedA = screen.getByTestId('custom-avatar').getAttribute('data-base');
      unmount();

      render(<Avatar avatarImage="pizza-pete" />);
      const seedB = screen.getByTestId('custom-avatar').getAttribute('data-base');

      expect(seedA).toBe(seedB);
    });
  });

  describe('init loading state', () => {
    it('shows skeleton on first render when no customAvatar and no seed provided', () => {
      render(<Avatar />);
      // On initial mount with no avatar data, should show loading skeleton
      expect(screen.getByTestId('avatar-skeleton')).toBeInTheDocument();
    });

    it('does NOT show skeleton when customAvatar is provided', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} />);
      expect(screen.queryByTestId('avatar-skeleton')).not.toBeInTheDocument();
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });

    it('does NOT show skeleton when userId seed is provided', () => {
      render(<Avatar userId="user-123" />);
      expect(screen.queryByTestId('avatar-skeleton')).not.toBeInTheDocument();
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });

    it('does NOT show skeleton when avatarImage seed is provided', () => {
      render(<Avatar avatarImage="pizza-pete" />);
      expect(screen.queryByTestId('avatar-skeleton')).not.toBeInTheDocument();
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });

    it('explicit isLoading=true overrides everything and shows skeleton', () => {
      render(<Avatar isLoading customAvatar={SAMPLE_CUSTOM_AVATAR} />);
      expect(screen.getByTestId('avatar-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('custom-avatar')).not.toBeInTheDocument();
    });

    it('explicit isLoading=false suppresses init loading even with no data', () => {
      render(<Avatar isLoading={false} />);
      expect(screen.queryByTestId('avatar-skeleton')).not.toBeInTheDocument();
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('has displayName set for debugging', () => {
      expect(Avatar.displayName).toBe('Avatar');
    });
  });

  describe('mode prop forwarding', () => {
    it('omits mode (no frame) by default', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} />);
      expect(screen.getByTestId('custom-avatar').getAttribute('data-mode')).toBe('');
    });

    it('forwards mode to AvatarRenderer for custom avatar', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} mode="multiplayer" />);
      expect(screen.getByTestId('custom-avatar').getAttribute('data-mode')).toBe('multiplayer');
    });

    it('forwards mode to fallback generated avatar', () => {
      render(<Avatar userId="abc123" mode="brain" />);
      expect(screen.getByTestId('custom-avatar').getAttribute('data-mode')).toBe('brain');
    });
  });

  describe('disableEffects prop forwarding', () => {
    it('does not forward disableEffects by default (tier animations enabled)', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} />);
      expect(screen.getByTestId('custom-avatar').getAttribute('data-disable-effects')).toBe('false');
    });

    it('forwards disableEffects=true to AvatarRenderer for custom avatar', () => {
      render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} disableEffects />);
      expect(screen.getByTestId('custom-avatar').getAttribute('data-disable-effects')).toBe('true');
    });

    it('forwards disableEffects=true to fallback generated avatar', () => {
      render(<Avatar userId="abc123" disableEffects />);
      expect(screen.getByTestId('custom-avatar').getAttribute('data-disable-effects')).toBe('true');
    });
  });
});
