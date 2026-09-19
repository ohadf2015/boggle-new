/**
 * Avatar renderer-chunk failure: the lazy AvatarRenderer must not leave an
 * empty disc. A small error boundary falls back to a hash-seeded letter disc.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import Avatar from '../Avatar';

vi.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: function Boom(): never {
    throw new Error('AvatarRenderer chunk failed');
  },
}));

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

describe('Avatar renderer throw → letter fallback', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the initial-letter disc when the generated renderer throws', async () => {
    render(<Avatar userId="maya" />);
    const disc = await screen.findByTestId('avatar-letter-fallback');
    expect(disc).toHaveTextContent('M');
    expect(String(disc.getAttribute('style'))).toContain(String(hashString('maya') % 360));
    expect(screen.queryByTestId('custom-avatar')).not.toBeInTheDocument();
  });

  it('renders the initial-letter disc when the custom renderer throws', async () => {
    render(<Avatar customAvatar={SAMPLE_CUSTOM_AVATAR} userId="lexi" />);
    const disc = await screen.findByTestId('avatar-letter-fallback');
    expect(disc).toHaveTextContent('L');
    expect(String(disc.getAttribute('style'))).toContain(String(hashString('lexi') % 360));
  });
});
