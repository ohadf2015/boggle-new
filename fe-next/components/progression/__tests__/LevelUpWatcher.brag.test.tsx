import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';

const share = vi.fn();
const auth: { user: Record<string, unknown> | null; profile: Record<string, unknown> | null } = { user: null, profile: null };
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => share(...a) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/quick-play' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/components/animations/LevelUpCelebration', () => ({
  LevelUpCelebration: (p: { level: number; action?: React.ReactNode; autoDismissAfter?: number }) => (
    <div data-testid="level-up-celebration" data-auto={String(p.autoDismissAfter ?? 'default')}>{p.action}</div>
  ),
}));

import { announceLevelUp, __resetLevelUpBusForTests } from '@/lib/levelUp/levelUpBus';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';
import { LevelUpWatcher } from '../LevelUpWatcher';

function levelWithoutPart(min: number): number {
  const rungs = new Set(LEVEL_UNLOCK_LADDER.map((u) => u.level));
  let l = min;
  while (rungs.has(l)) l++;
  return l;
}

describe('LevelUpWatcher brag', () => {
  beforeEach(() => {
    __resetLevelUpBusForTests();
    share.mockReset().mockResolvedValue('shared');
    auth.user = { id: 'u1' };
    auth.profile = { display_name: 'Noa' };
    Object.defineProperty(window, 'location', { value: { origin: 'https://lexiclash.live', pathname: '/en/quick-play' }, writable: true });
  });

  it('Given a level-up, Then Brag shares a level link and the overlay stays up longer', async () => {
    const lvl = levelWithoutPart(7);
    render(<LevelUpWatcher />);
    act(() => { announceLevelUp({ oldLevel: lvl - 1, newLevel: lvl }, 'single'); });
    const overlay = await screen.findByTestId('level-up-celebration');
    expect(overlay).toHaveAttribute('data-auto', '10000');
    fireEvent.click(screen.getByTestId('brag-button-level_up'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const { text, url } = share.mock.calls[0][0];
    expect(text).toContain('brag2.text.level');
    const q = new URL(url).searchParams;
    expect(q.get('kind')).toBe('level');
    expect(q.get('score')).toBe(String(lvl));
    expect(q.get('me')).toBe('Noa');
  });

  it('Given a classroom student, Then no Brag and the overlay keeps its auto-dismiss', async () => {
    auth.user = { id: 's1', is_anonymous: true };
    const lvl = levelWithoutPart(7);
    render(<LevelUpWatcher />);
    act(() => { announceLevelUp({ oldLevel: lvl - 1, newLevel: lvl }, 'single'); });
    const overlay = await screen.findByTestId('level-up-celebration');
    expect(overlay).toHaveAttribute('data-auto', 'default');
    expect(screen.queryByTestId('brag-button-level_up')).toBeNull();
  });
});
