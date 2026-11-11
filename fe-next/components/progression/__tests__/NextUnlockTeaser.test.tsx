import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getXpForLevel } from '@/backend/modules/xpManager';

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/components/avatar/art/PartThumb', () => ({ PartThumb: () => <svg data-testid="part-thumb" /> }));
vi.mock('../LevelUpWatcher', () => ({ LevelUpWatcher: () => <div data-testid="level-up-watcher" /> }));
vi.mock('@/components/auth/AuthModal', () => ({ default: () => null }));

import { NextUnlockTeaser } from '../NextUnlockTeaser';

describe('NextUnlockTeaser', () => {
  beforeEach(() => {
    auth.value = {};
  });

  it('renders nothing while auth is resolving (no guest flash)', () => {
    auth.value = { loading: true, user: null, profile: null };
    const { container } = render(<NextUnlockTeaser />);
    expect(screen.queryByTestId('next-unlock-teaser')).toBeNull();
    expect(container.querySelector('[data-testid="next-unlock-guest"]')).toBeNull();
  });

  it('guests see the sign-in prompt', () => {
    auth.value = { loading: false, user: null, profile: null, isGuest: true };
    render(<NextUnlockTeaser />);
    expect(screen.getByTestId('next-unlock-guest')).toHaveTextContent('progression.unlock.signInToUnlock');
  });

  it('signed-in players see Lv now -> Lv unlock with rarity and an XP bar', () => {
    auth.value = { loading: false, user: { id: 'u1' }, profile: { total_xp: getXpForLevel(3) } };
    render(<NextUnlockTeaser />);
    const card = screen.getByTestId('next-unlock-teaser');
    expect(card).toHaveTextContent('progression.unlock.levelPath');
    expect(screen.getByTestId('rarity-chip')).toBeInTheDocument();
    expect(screen.getByTestId('locked-unlock-thumb')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('mounts the level-up watcher on results screens', () => {
    auth.value = { loading: false, user: { id: 'u1' }, profile: { total_xp: 0 } };
    render(<NextUnlockTeaser />);
    expect(screen.getByTestId('level-up-watcher')).toBeInTheDocument();
  });

  it('shows nothing in classroom (edu) mode', () => {
    auth.value = { loading: false, user: null, profile: null };
    const { container } = render(<NextUnlockTeaser mode="edu" />);
    expect(container).toBeEmptyDOMElement();
  });
});
