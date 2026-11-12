import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getXpForLevel } from '@/backend/modules/xpManager';
import { xpForLevel } from '@/shared/xp/levelCurve';

const reduced = vi.hoisted(() => ({ value: true }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => reduced.value }));

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
    reduced.value = true;
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

  it('leaves the level-up watcher to the one app-wide mount', () => {
    auth.value = { loading: false, user: { id: 'u1' }, profile: { total_xp: 0 } };
    render(<NextUnlockTeaser />);
    expect(screen.queryByTestId('level-up-watcher')).not.toBeInTheDocument();
  });

  it('shows nothing in classroom (edu) mode', () => {
    auth.value = { loading: false, user: null, profile: null };
    const { container } = render(<NextUnlockTeaser mode="edu" />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('XP moment', () => {
    const signedIn = (total: number, extra: Record<string, unknown> = {}) => ({
      loading: false, user: { id: 'u1' }, profile: { total_xp: total }, refreshProfile: vi.fn().mockResolvedValue(undefined), ...extra,
    });

    it('Given the server total, Then it shows +N XP and the bar ends at the new total', () => {
      const total = xpForLevel(3) + 30;
      auth.value = signedIn(total - 20);
      render(<NextUnlockTeaser xp={{ gained: 20, total }} />);
      expect(screen.getByTestId('xp-moment-gained')).toHaveTextContent('progression.xp.gained:{"xp":"20"}');
      const bar = screen.getByTestId('xp-moment-bar');
      expect(bar).toHaveAttribute('aria-valuenow', String(Math.min(99, Math.floor((30 / (xpForLevel(4) - xpForLevel(3))) * 100))));
      expect(screen.getByTestId('next-unlock-teaser')).toBeInTheDocument();
    });

    it('Given a server total, Then the profile is refreshed once so the header ring catches up', () => {
      const total = xpForLevel(3) + 30;
      auth.value = signedIn(total - 20);
      const { rerender } = render(<NextUnlockTeaser xp={{ gained: 20, total }} />);
      rerender(<NextUnlockTeaser xp={{ gained: 20, total }} />);
      expect(auth.value.refreshProfile).toHaveBeenCalledTimes(1);
    });

    it('Given a level crossing, Then the meter ends in the new level and pops LEVEL N', () => {
      const total = xpForLevel(5) + 5;
      auth.value = signedIn(total);
      render(<NextUnlockTeaser xp={{ gained: 40, total }} />);
      expect(screen.getByTestId('xp-moment-levelup')).toHaveTextContent('progression.xp.levelUp:{"level":5}');
      expect(screen.getByTestId('xp-moment-level')).toHaveTextContent('5');
    });

    it('Given motion allowed, Then the meter counts up and fills the old level before the new one', () => {
      vi.useFakeTimers();
      try {
        reduced.value = false;
        const total = xpForLevel(5) + 5;
        auth.value = signedIn(total);
        render(<NextUnlockTeaser xp={{ gained: 40, total }} />);
        expect(screen.getByTestId('xp-moment-gained')).toHaveTextContent('"xp":"0"');
        expect(screen.getByTestId('xp-moment-level')).toHaveTextContent('4');
        expect(screen.queryByTestId('xp-moment-levelup')).toBeNull();
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId('xp-moment-gained')).toHaveTextContent('"xp":"40"');
        expect(screen.getByTestId('xp-moment-level')).toHaveTextContent('5');
        expect(screen.getByTestId('xp-moment-levelup')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('Given no server total, Then it waits for a refreshed profile before showing the gain', async () => {
      let resolve!: () => void;
      const refreshProfile = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
      auth.value = signedIn(xpForLevel(3) + 50, { refreshProfile });
      render(<NextUnlockTeaser xp={{ gained: 50 }} />);
      expect(refreshProfile).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('xp-moment-gained')).toBeNull();
      await act(async () => { resolve(); });
      await waitFor(() => expect(screen.getByTestId('xp-moment-gained')).toHaveTextContent('"xp":"50"'));
    });

    it('Given a guest with an estimate, Then the gain shows as not saved with a sign-in to keep it', () => {
      auth.value = { loading: false, user: null, profile: null };
      render(<NextUnlockTeaser xp={{ gained: 35 }} />);
      expect(screen.getByTestId('xp-moment-not-saved')).toHaveTextContent('progression.xp.notSaved');
      expect(screen.getByTestId('next-unlock-guest')).toHaveTextContent('progression.xp.signInToKeep:{"xp":"35"}');
    });

    it('Given a guest without an estimate, Then only the plain sign-in prompt shows', () => {
      auth.value = { loading: false, user: null, profile: null };
      render(<NextUnlockTeaser xp={null} />);
      expect(screen.queryByTestId('xp-moment-not-saved')).toBeNull();
      expect(screen.getByTestId('next-unlock-guest')).toHaveTextContent('progression.unlock.signInToUnlock');
    });

    it('Given zero XP gained, Then no +0 is shown', () => {
      auth.value = signedIn(100);
      render(<NextUnlockTeaser xp={{ gained: 0, total: 100 }} />);
      expect(screen.queryByTestId('xp-moment-gained')).toBeNull();
    });
  });
});
