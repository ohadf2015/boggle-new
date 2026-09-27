import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: unknown) => (p && typeof p === 'object' ? `${k}|${Object.values(p as object).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/components/avatar/AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="stage-avatar" /> }));
vi.mock('@/lib/avatar/catalog', () => ({ PartThumb: () => <span /> }));

import { ProfileView } from '../ProfileLabView';

describe('ProfileLabView (Track B capture harness)', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('Given level 7, Then renders the real showcase stage + 4 tabs, no placeholder', () => {
    render(<ProfileView level={7} />);
    expect(screen.queryByTestId('avatar-lab-placeholder-profile')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ronny');
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByTestId('stage-level')).toHaveTextContent('7');
    expect(screen.getAllByTestId('stage-stat').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTestId('pinned-badge').length).toBeGreaterThan(0);
  });

  it('Given the collection tab, Then shows the avatar collection card', () => {
    render(<ProfileView level={7} />);
    fireEvent.click(screen.getByRole('tab', { name: /collection/i }));
    expect(screen.getByTestId('avatar-collection-card')).toBeInTheDocument();
  });

  it('Given level 1, Then a brand-new player sees a first-game nudge and the next unlock', () => {
    render(<ProfileView level={1} />);
    expect(screen.queryAllByTestId('stage-stat')).toHaveLength(0);
    expect(screen.getByText('profile.showcase.emptyStats')).toBeInTheDocument();
    expect(screen.getByTestId('stage-rarest')).toHaveTextContent('profile.showcase.unlocksAt|2');
  });

  it('Given ?public=1&noname=1, Then renders the public look without tabs and a stand-in name', () => {
    window.history.replaceState(null, '', '/en/avatar-test?view=profile&public=1&noname=1');
    render(<ProfileView level={7} />);
    expect(screen.getByTestId('avatar-lab-view-profile')).toHaveAttribute('data-public', '1');
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('profile.showcase.unnamed');
    expect(screen.getByRole('button', { name: 'profile.showcase.shareProfile' })).toBeInTheDocument();
  });
});
