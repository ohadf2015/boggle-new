/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { PublicProfileHero, type PublicProfileHeroData } from '@/components/profile/PublicProfileHero';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

// Capture what gets handed to the real Avatar — the avatar_config path the
// sentry note flagged as easy to break.
const avatarProps = vi.fn();
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    avatarProps(props);
    return <div data-testid="avatar" />;
  },
}));

const realAvatarConfig = {
  bodyColor: '#8B5CF6',
  eyes: 'happy',
  mouth: 'smile',
  accessory: 'crown',
} as unknown as PublicProfileHeroData['customAvatar'];

const base: PublicProfileHeroData = {
  id: 'u-1',
  username: 'wordwiz',
  displayName: 'Word Wiz',
  customAvatar: realAvatarConfig,
  countryCode: 'US',
  currentLevel: 42,
  totalXp: 90_000,
  totalScore: 480_000,
  totalGames: 312,
  totalWords: 7_400,
  winRate: 63,
};

describe('PublicProfileHero', () => {
  beforeEach(() => avatarProps.mockClear());

  it('renders the player identity (name, handle, level)', () => {
    render(<PublicProfileHero profile={base} />);
    expect(screen.getByText('Word Wiz')).toBeInTheDocument();
    expect(screen.getByText('@wordwiz')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('passes the real avatar_config through to Avatar (sentry-flagged path)', () => {
    render(<PublicProfileHero profile={base} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(avatarProps).toHaveBeenCalled();
    const props = avatarProps.mock.calls[0][0];
    expect(props.customAvatar).toEqual(realAvatarConfig);
    expect(props.userId).toBe('u-1');
  });

  it('renders the three stat tiles with formatted values', () => {
    render(<PublicProfileHero profile={base} />);
    expect(screen.getByText('312')).toBeInTheDocument();   // games
    expect(screen.getByText('63%')).toBeInTheDocument();   // win rate
    expect(screen.getByText('7,400')).toBeInTheDocument(); // words
  });

  it('hides the tier chip for stone-tier players', () => {
    render(<PublicProfileHero profile={{ ...base, totalScore: 10 }} />);
    // stone tier → RankTierChip not rendered (rank.tier.* key absent)
    expect(screen.queryByText(/rank\.tier\./)).not.toBeInTheDocument();
  });

  it('survives a null avatar_config (no custom avatar set)', () => {
    render(<PublicProfileHero profile={{ ...base, customAvatar: null }} />);
    const props = avatarProps.mock.calls[0][0];
    expect(props.customAvatar).toBeUndefined();
    expect(screen.getByText('Word Wiz')).toBeInTheDocument();
  });
});
