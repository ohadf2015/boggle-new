import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/components/Avatar', () => ({
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));
vi.mock('@/components/quick-play/QuickResultsFx', () => ({ QuickResultsRays: () => null, SparkleLoop: () => null }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, updateProfile: vi.fn(), refreshProfile: vi.fn() }),
}));
vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => null }));
vi.mock('next/dynamic', () => ({
  default: () =>
    function BuilderStub({ isOpen }: { isOpen: boolean }) {
      return isOpen ? <div role="dialog" data-testid="avatar-builder" /> : null;
    },
}));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

import { PlayHero } from '../PlayHero';
import { FriendsBlock } from '../FriendsBlock';
import HeroAvatarIsland from '../HeroAvatarIsland';

import { en } from '@/translations/en';

const t = (key: string, params: Record<string, string | number> = {}) => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : key;
};

function renderHeroWithIsland(overrides: Partial<React.ComponentProps<typeof PlayHero>> = {}) {
  return render(
    <>
      <PlayHero
        lang="en"
        t={t}
        animate={false}
        avatar={{ userId: 'u1', customAvatar: null }}
        greeting="Hey there"
        streak={0}
        streakLoading={false}
        onAvatarSaved={vi.fn()}
        {...overrides}
      />
      <HeroAvatarIsland />
    </>,
  );
}

describe('HeroAvatarIsland', () => {
  it('given the hero with an avatar, then the island portals the avatar and edit button into the hero slots', () => {
    renderHeroWithIsland();
    const slot = screen.getByTestId('hp-avatar-slot');
    expect(slot.querySelector('[data-testid="avatar-u1"]')).not.toBeNull();
    const edit = screen.getByRole('button', { name: 'Edit avatar' });
    expect(screen.getByTestId('hp-edit-avatar-slot').contains(edit)).toBe(true);
  });

  it('given the edit-avatar button, when tapped, then the real avatar builder opens', () => {
    renderHeroWithIsland();
    expect(screen.queryByTestId('avatar-builder')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit avatar' }));
    expect(screen.getByTestId('avatar-builder')).toBeTruthy();
  });

  it('given the hero unmounts, then the island stops rendering the avatar (no stale portal)', () => {
    const { unmount } = renderHeroWithIsland();
    expect(screen.queryAllByTestId('avatar-u1').length).toBeGreaterThan(0);
    unmount();
    render(<HeroAvatarIsland />);
    expect(screen.queryAllByTestId('avatar-u1')).toHaveLength(0);
  });

  it('given the hero has no avatar yet (pre-mount guest), then nothing portals in', () => {
    renderHeroWithIsland({ avatar: null });
    expect(screen.queryByRole('button', { name: 'Edit avatar' })).toBeNull();
  });

  it('given the friends block shows avatars, then the island portals both demo faces into their boxes', () => {
    render(
      <>
        <FriendsBlock lang="en" t={t} showAvatars />
        <HeroAvatarIsland />
      </>,
    );
    expect(screen.getByTestId('hp-friend-you-slot').querySelector('[data-testid="avatar-hp-friend-you"]')).not.toBeNull();
    expect(screen.getByTestId('hp-friend-rival-slot').querySelector('[data-testid="avatar-hp-friend-maya"]')).not.toBeNull();
  });

  it('given the friends block hides avatars (pre-mount), then the island renders no demo faces', () => {
    render(
      <>
        <FriendsBlock lang="en" t={t} showAvatars={false} />
        <HeroAvatarIsland />
      </>,
    );
    expect(screen.queryByTestId('avatar-hp-friend-you')).toBeNull();
    expect(screen.queryByTestId('avatar-hp-friend-maya')).toBeNull();
  });
});
