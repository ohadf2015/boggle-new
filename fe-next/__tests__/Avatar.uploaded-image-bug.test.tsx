/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Avatar, { PROFILE_AVATAR_ID } from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock AvatarRenderer
jest.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: ({ config, size }: { config: CustomAvatarConfig; size: number }) => (
    <svg data-testid="custom-avatar" data-size={size} data-base={config.base} />
  ),
}));

describe('Avatar - Uploaded Image Priority Bug', () => {
  it('should show profile picture when avatarImage is PROFILE_AVATAR_ID', () => {
    render(
      <Avatar
        profilePictureUrl="https://example.com/custom-profile.jpg"
        avatarImage={PROFILE_AVATAR_ID}
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    expect(avatar).toHaveAttribute('data-avatar-image', PROFILE_AVATAR_ID);
    expect(avatar).toHaveAttribute('data-profile-picture-url', 'https://example.com/custom-profile.jpg');

    const img = avatar.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/custom-profile.jpg');
  });

  it('should show generated avatar when avatarImage is a character ID, even if profile picture exists', () => {
    // When user has an old character avatarImage like "broccoli-bob" plus a profile picture,
    // the avatarImage takes priority over profilePictureUrl — now renders as generated custom avatar
    render(
      <Avatar
        profilePictureUrl="https://example.com/custom-profile.jpg"
        avatarImage="broccoli-bob"
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    expect(avatar).toHaveAttribute('data-avatar-type', 'generated');
    expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();

    // Should NOT show profile picture
    expect(avatar.querySelector('img')).not.toBeInTheDocument();
  });

  it('should show profile picture when avatarImage is undefined', () => {
    render(
      <Avatar
        profilePictureUrl="https://example.com/custom-profile.jpg"
        avatarImage={undefined}
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    const img = avatar.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/custom-profile.jpg');
  });
});
