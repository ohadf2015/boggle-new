import { vi, type Mock, } from 'vitest';
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock AvatarRenderer
vi.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: ({ config, size }: { config: CustomAvatarConfig; size: number }) => (
    <svg data-testid="custom-avatar" data-size={size} data-base={config.base} />
  ),
}));

describe('Avatar - renders with customAvatar', () => {
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

  it('should render custom SVG avatar when customAvatar is provided', () => {
    render(
      <Avatar
        customAvatar={SAMPLE_CUSTOM_AVATAR}
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    expect(avatar).toHaveAttribute('data-avatar-type', 'custom');
    expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
  });

  it('should show generated avatar when avatarImage is a character ID', () => {
    render(
      <Avatar
        avatarImage="broccoli-bob"
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    expect(avatar).toHaveAttribute('data-avatar-type', 'generated');
    expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
  });

  it('should show loading skeleton when no identity props provided', () => {
    render(
      <Avatar
        avatarImage={undefined}
        size="md"
      />
    );

    // No identity data → inferred loading state → skeleton
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('header-avatar')).not.toBeInTheDocument();
  });

  it('should show generated avatar when userId seed is provided', () => {
    render(
      <Avatar
        userId="guest-123"
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    expect(avatar).toHaveAttribute('data-avatar-type', 'generated');
  });
});
