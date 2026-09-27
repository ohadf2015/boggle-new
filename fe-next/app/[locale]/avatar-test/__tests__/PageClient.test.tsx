import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown> | string) =>
      p && typeof p === 'object' ? `${key}:${JSON.stringify(p)}` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/components/avatar/AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="avatar-renderer" /> }));

const builder = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: (props: Record<string, any>) => {
    builder.props = props;
    return props.isOpen ? <div data-testid="builder-open" /> : null;
  },
}));

import AvatarTestPageClient from '../PageClient';

describe('avatar-test capture harness', () => {
  beforeEach(() => { builder.props = null; });

  it('grid view keeps the parts gallery', () => {
    render(<AvatarTestPageClient level={1} view="grid" />);
    expect(screen.getByTestId('avatar-lab-view-grid')).toBeInTheDocument();
    expect(screen.getByText('avatarLab.allParts')).toBeInTheDocument();
  });

  it('editor view opens the builder with a level-scoped premium fixture', () => {
    render(<AvatarTestPageClient level={6} view="editor" />);
    expect(screen.getByTestId('builder-open')).toBeInTheDocument();
    expect(builder.props!.premium.isPartUnlocked('eyes', 'heartEye')).toBe(true);
    expect(builder.props!.premium.isPartUnlocked('accessory', 'crystalCrown')).toBe(false);
  });

  // Track B replaced the profile placeholder with the REAL profile UI (covered in ProfileLabView.test.tsx).
  it('profile renders the real profile view, not a placeholder', () => {
    render(<AvatarTestPageClient level={7} view="profile" />);
    expect(screen.getByTestId('avatar-lab-view-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('avatar-lab-placeholder-profile')).toBeNull();
  });

  // Track C replaced the reveal placeholder with the REAL production reveal
  // (UnlockRevealOverlay + results strip + header entry) driven by fixtures.
  it('reveal renders the real unlock reveal for the fixture level-up', async () => {
    render(<AvatarTestPageClient level={6} view="reveal" />);
    expect(screen.queryByTestId('avatar-lab-placeholder-reveal')).not.toBeInTheDocument();
    // level 5→6 grants the first epic
    const overlay = await screen.findByTestId('unlock-reveal');
    expect(overlay).toHaveAttribute('data-rarity', 'epic');
    expect(screen.getByTestId('header-profile-entry')).toBeInTheDocument();
  });

  it('lite view renders AvatarLite discs for the fixture player', () => {
    render(<AvatarTestPageClient level={1} view="lite" />);
    expect(screen.getAllByTestId('avatar-lite').length).toBeGreaterThan(1);
    expect(screen.getByText('avatarLab.liteNote')).toBeInTheDocument();
  });

  it('shows the fixture level and view switcher', () => {
    render(<AvatarTestPageClient level={12} view="grid" />);
    expect(screen.getByText('avatarLab.level:{"level":12}')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'avatarLab.views.editor' })).toHaveAttribute('href', '?level=12&view=editor');
  });
});
