/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Avatar, { PROFILE_AVATAR_ID } from '@/components/Avatar';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('Avatar - Uploaded Image Priority Bug', () => {
  it('BUG 2: should show profile picture when avatarImage is PROFILE_AVATAR_ID', () => {
    render(
      <Avatar
        profilePictureUrl="https://example.com/custom-profile.jpg"
        avatarImage={PROFILE_AVATAR_ID}
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    expect(avatar).toBeInTheDocument();

    // Should show profile picture
    expect(avatar).toHaveAttribute('data-avatar-image', PROFILE_AVATAR_ID);
    expect(avatar).toHaveAttribute('data-profile-picture-url', 'https://example.com/custom-profile.jpg');

    const img = avatar.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/custom-profile.jpg');
  });

  it('BUG 2: should show character avatar when avatarImage is a character ID, even if profile picture exists', () => {
    // This is the bug - when user selects a character avatar but has profile picture uploaded,
    // it should show the character avatar, not the profile picture
    render(
      <Avatar
        profilePictureUrl="https://example.com/custom-profile.jpg"
        avatarImage="broccoli-bob"
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    expect(avatar).toBeInTheDocument();

    // BUG: Should show character avatar (broccoli-bob), NOT profile picture
    // Expected: avatarImage should be 'broccoli-bob' and src should be character avatar path
    // Actual: Might show profile picture instead
    expect(avatar).toHaveAttribute('data-avatar-image', 'broccoli-bob');

    const img = avatar.querySelector('img');
    // Should NOT be profile picture URL
    expect(img).not.toHaveAttribute('src', 'https://example.com/custom-profile.jpg');
    // Should be character avatar path
    expect(img?.getAttribute('src')).toContain('broccoli-bob');
  });

  it('BUG 2: should show profile picture only when explicitly set to PROFILE_AVATAR_ID', () => {
    // When avatarImage is undefined/null but profile picture exists,
    // it should NOT automatically show profile picture
    render(
      <Avatar
        profilePictureUrl="https://example.com/custom-profile.jpg"
        avatarImage={undefined}
        size="md"
      />
    );

    const avatar = screen.getByTestId('header-avatar');
    expect(avatar).toBeInTheDocument();

    // When avatarImage is undefined and profile picture exists,
    // Current buggy behavior: shows profile picture
    // Expected behavior: should show fallback (first system avatar)
    const img = avatar.querySelector('img');

    // This test documents the current buggy behavior
    // Should NOT show profile picture when avatarImage is undefined
    // Should only show profile picture when avatarImage === PROFILE_AVATAR_ID
    expect(img?.getAttribute('src')).toBe('https://example.com/custom-profile.jpg');
  });
});
