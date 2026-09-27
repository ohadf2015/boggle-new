import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: unknown) => (p && typeof p === 'object' ? `${k}|${Object.values(p as object).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));

import { PinnedHighlights } from '../PinnedHighlights';
import { AvatarCollectionCard } from '../AvatarCollectionCard';
import { ProfileShowcaseLayout } from '../ProfileShowcaseLayout';

describe('PinnedHighlights', () => {
  it('Given earned badges, Then pins the top 3 (Hall of Fame first) and links to all', () => {
    const onSeeAll = vi.fn();
    render(<PinnedHighlights counts={{ SPEEDSTER: 2, WORDSMITH: 20, FIRST_WORD: 1, RARE_GEM: 1 }} onSeeAll={onSeeAll} />);
    const tiles = screen.getAllByTestId('pinned-badge');
    expect(tiles.map(el => el.getAttribute('data-key'))).toEqual(['RARE_GEM', 'WORDSMITH', 'SPEEDSTER']);
    expect(within(tiles[1]).getByText('achievementTiers.silver')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /profile.showcase.seeAll/ }));
    expect(onSeeAll).toHaveBeenCalled();
  });

  it('Given no badges, Then shows the first-badge nudge', () => {
    render(<PinnedHighlights counts={{}} />);
    expect(screen.queryAllByTestId('pinned-badge')).toHaveLength(0);
    expect(screen.getByText('profile.showcase.noBadges')).toBeInTheDocument();
  });
});

describe('AvatarCollectionCard', () => {
  const progress = {
    owned: 5,
    total: 40,
    byRarity: { rare: { owned: 4, total: 20 }, epic: { owned: 1, total: 15 }, legendary: { owned: 0, total: 5 } },
  };

  it('Given progress, Then shows the total and one row per rarity', () => {
    render(<AvatarCollectionCard progress={progress} level={3} />);
    expect(screen.getByText('profile.showcase.parts|5,40')).toBeInTheDocument();
    const rows = screen.getAllByTestId('collection-rarity-row');
    expect(rows.map(r => r.getAttribute('data-rarity'))).toEqual(['rare', 'epic', 'legendary']);
    expect(rows[0]).toHaveTextContent('4/20');
  });

  it('Given an edit handler, Then the card offers Edit avatar', () => {
    const onEditAvatar = vi.fn();
    render(<AvatarCollectionCard progress={progress} level={3} onEditAvatar={onEditAvatar} />);
    fireEvent.click(screen.getByRole('button', { name: 'profile.showcase.editAvatar' }));
    expect(onEditAvatar).toHaveBeenCalled();
  });
});

describe('ProfileShowcaseLayout', () => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'stats', label: 'Stats' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'collection', label: 'Collection' },
  ] as const;

  it('Given tabs, Then renders a tablist with the active tab selected and a labelled panel', () => {
    render(
      <ProfileShowcaseLayout stage={<div>stage</div>} tabs={tabs} activeTab="stats" onTabChange={vi.fn()}>
        <p>panel body</p>
      </ProfileShowcaseLayout>,
    );
    const active = screen.getByRole('tab', { name: /stats/i });
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('panel body');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', active.id);
  });

  it('Given ArrowRight/ArrowLeft in LTR, Then moves to the neighbouring tab', () => {
    const onTabChange = vi.fn();
    render(
      <ProfileShowcaseLayout stage={null} tabs={tabs} activeTab="stats" onTabChange={onTabChange}>
        <p />
      </ProfileShowcaseLayout>,
    );
    const active = screen.getByRole('tab', { name: /stats/i });
    fireEvent.keyDown(active, { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenLastCalledWith('achievements');
    fireEvent.keyDown(active, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenLastCalledWith('overview');
  });

  it('Given RTL, Then ArrowLeft moves forward', () => {
    const onTabChange = vi.fn();
    render(
      <ProfileShowcaseLayout stage={null} tabs={tabs} activeTab="stats" onTabChange={onTabChange} isRtl>
        <p />
      </ProfileShowcaseLayout>,
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: /stats/i }), { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenLastCalledWith('achievements');
  });
});
