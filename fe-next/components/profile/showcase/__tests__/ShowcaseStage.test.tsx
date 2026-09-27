import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: unknown) => (p && typeof p === 'object' ? `${k}|${Object.values(p as object).join(',')}` : k),
    language: 'en',
  }),
}));
vi.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: ({ config }: { config: CustomAvatarConfig }) => <div data-testid="stage-avatar" data-accessory={config.accessory} />,
}));
vi.mock('@/lib/avatar/catalog', () => ({
  PartThumb: ({ category, id }: { category: string; id: string }) => <span data-testid="part-thumb" data-part={`${category}:${id}`} />,
}));

import { ShowcaseStage, type ShowcaseStageProps } from '../ShowcaseStage';

const base: ShowcaseStageProps = {
  config: DEFAULT_AVATAR_CONFIG as CustomAvatarConfig,
  name: 'Ron',
  level: 7,
  levelPercent: 40,
  xpToNext: 120,
  collection: { owned: 32, total: 81 },
  stats: [
    { id: 'bestWord', value: 'QUIXOTIC' },
    { id: 'wins', value: 12 },
  ],
  isOwn: true,
};

const epic = { ...DEFAULT_AVATAR_CONFIG, eyes: 'heartEye' } as CustomAvatarConfig;

describe('ShowcaseStage', () => {
  it('Given a player, Then shows name, level title, level number and collection count', () => {
    render(<ShowcaseStage {...base} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ron');
    expect(screen.getByText('profile.showcase.titles.wordsmith')).toBeInTheDocument();
    expect(screen.getByTestId('stage-level')).toHaveTextContent('7');
    expect(screen.getByText('profile.showcase.parts|32,81')).toBeInTheDocument();
    expect(screen.getByTestId('stage-avatar')).toBeInTheDocument();
  });

  it('Given headline stats, Then renders one tile per stat with its label', () => {
    render(<ShowcaseStage {...base} />);
    const tiles = screen.getAllByTestId('stage-stat');
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveTextContent('QUIXOTIC');
    expect(tiles[0]).toHaveTextContent('profile.showcase.stats.bestWord');
  });

  it('Given no stats on own profile, Then invites a first game instead of empty tiles', () => {
    render(<ShowcaseStage {...base} stats={[]} />);
    expect(screen.queryAllByTestId('stage-stat')).toHaveLength(0);
    expect(screen.getByText('profile.showcase.emptyStats')).toBeInTheDocument();
  });

  it('Given an epic part equipped, Then the backdrop and rarest-gear chip are epic', () => {
    render(<ShowcaseStage {...base} config={epic} />);
    expect(screen.getByTestId('stage-backdrop')).toHaveAttribute('data-rarity', 'epic');
    const chip = screen.getByTestId('stage-rarest');
    expect(chip).toHaveTextContent('avatarBuilder.tiers.epic');
    expect(chip.querySelector('[data-part="eyes:heartEye"]')).not.toBeNull();
  });

  it('Given an all-common avatar at level 1, Then the chip teases the next level unlock', () => {
    render(<ShowcaseStage {...base} level={1} />);
    expect(screen.getByTestId('stage-backdrop')).toHaveAttribute('data-rarity', 'common');
    expect(screen.getByTestId('stage-rarest')).toHaveTextContent('profile.showcase.unlocksAt|2');
  });

  it('Given own profile, Then Edit avatar and Share fire their callbacks', () => {
    const onEditAvatar = vi.fn();
    const onShare = vi.fn();
    render(<ShowcaseStage {...base} onEditAvatar={onEditAvatar} onShare={onShare} />);
    fireEvent.click(screen.getByRole('button', { name: 'profile.showcase.editAvatar' }));
    fireEvent.click(screen.getByRole('button', { name: 'profile.showcase.share' }));
    expect(onEditAvatar).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('Given a public profile, Then there is no edit action and share says Share profile', () => {
    render(<ShowcaseStage {...base} isOwn={false} onShare={vi.fn()} handle="ron" />);
    expect(screen.queryByRole('button', { name: 'profile.showcase.editAvatar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'profile.showcase.shareProfile' })).toBeInTheDocument();
    expect(screen.getByText('@ron')).toBeInTheDocument();
  });

  it('Given an auto-generated name on own profile, Then shows a stand-in and a set-name nudge', () => {
    const onEditName = vi.fn();
    render(<ShowcaseStage {...base} name="" isPlaceholderName onEditName={onEditName} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('profile.showcase.unnamed');
    fireEvent.click(screen.getByRole('button', { name: 'profile.showcase.setName' }));
    expect(onEditName).toHaveBeenCalled();
  });

  it('Given max level, Then shows max level instead of XP to next', () => {
    render(<ShowcaseStage {...base} isMaxLevel xpToNext={null} />);
    expect(screen.getByText('profile.showcase.maxLevel')).toBeInTheDocument();
  });
});
