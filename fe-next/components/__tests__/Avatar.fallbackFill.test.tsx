/**
 * Regression: generated (fallback) avatars were not centered inside their
 * circle on the daily leaderboard (reported 2026-11-14, /he/daily, 411px).
 *
 * The custom-avatar branch passes `className="w-full h-full"` to AvatarRenderer
 * so the SVG scales to whatever container the caller sized. The generated
 * fallback branch did not — AvatarArt writes fixed width/height attributes from
 * `size`, so a `size="lg"` (48px) SVG sat top-left-anchored inside the board's
 * 40px mobile circle (overflow-hidden clips, no centering). Both branches must
 * scale the SVG to fill the container.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Avatar from '../Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

vi.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <svg data-testid="custom-avatar" className={className} />
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

describe('Avatar SVG fills its container', () => {
  it('generated fallback avatar scales to the container, like the custom branch', async () => {
    render(<Avatar userId="guest-123" size="lg" />);
    const svg = await screen.findByTestId('custom-avatar');
    expect(screen.getByTestId('header-avatar')).toHaveAttribute('data-avatar-type', 'generated');
    expect(svg).toHaveClass('w-full');
    expect(svg).toHaveClass('h-full');
  });

  it('custom avatar still scales to the container', async () => {
    render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} size="lg" />);
    const svg = await screen.findByTestId('custom-avatar');
    expect(svg).toHaveClass('w-full');
    expect(svg).toHaveClass('h-full');
  });
});
