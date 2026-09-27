/**
 * LootPeek: a tap-to-open chest that reveals one real item from the new modes'
 * loot pools (Adventure relics, Word Tower chests). Variable reward, honestly
 * framed: it previews what can drop, it grants nothing. Random only on click,
 * so server and client render the same closed chest (no hydration mismatch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) => (params ? `${k}:${JSON.stringify(params)}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
}));

import { LootPeek, LOOT_POOL } from '../LootPeek';

describe('LootPeek', () => {
  let random: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    trackGrowthEvent.mockClear();
    random = vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => random.mockRestore());

  it('Given first paint, then the chest is closed and no item is shown', () => {
    const { container } = render(<LootPeek />);
    expect(screen.getByRole('button').textContent).toContain('newModes.loot.tap');
    expect(container.querySelector('[data-loot-item]')).toBeNull();
    expect(random).not.toHaveBeenCalled();
  });

  it('When the chest is tapped, then one pool item is revealed and announced', () => {
    const { container } = render(<LootPeek />);
    fireEvent.click(screen.getByRole('button'));
    const item = container.querySelector('[data-loot-item]');
    expect(item?.getAttribute('data-loot-item')).toBe(LOOT_POOL[0].id);
    expect(screen.getByRole('status').textContent).toContain(`adventurePlay.relic.${LOOT_POOL[0].id}`);
    expect(trackGrowthEvent).toHaveBeenCalledWith('new_modes_loot_peek', { item: LOOT_POOL[0].id, roll: 1 });
  });

  it('When tapped again, then a different item rolls (never the same twice in a row)', () => {
    const { container } = render(<LootPeek />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    const first = container.querySelector('[data-loot-item]')?.getAttribute('data-loot-item');
    fireEvent.click(btn);
    const second = container.querySelector('[data-loot-item]')?.getAttribute('data-loot-item');
    expect(second).not.toBe(first);
    expect(btn.textContent).toContain('newModes.loot.again');
  });

  it('Given the pool, then it mixes Adventure relics and Word Tower chests with real in-game art', () => {
    expect(LOOT_POOL.some((i) => i.mode === 'adventure')).toBe(true);
    expect(LOOT_POOL.some((i) => i.mode === 'wordTowerV2')).toBe(true);
    for (const i of LOOT_POOL) expect(i.img).toMatch(/^\/images\/(adventure\/relics|word-tower-v2\/empire)\/.+\.webp$/);
  });

  it('Given a Word Tower chest, then its label interpolates the localized tier', () => {
    const idx = LOOT_POOL.findIndex((i) => i.mode === 'wordTowerV2');
    random.mockReturnValue(idx / LOOT_POOL.length);
    render(<LootPeek />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status').textContent).toContain('newModes.loot.chest');
    expect(screen.getByRole('status').textContent).toContain('wordTowerV2.chest.tier.');
  });
});
