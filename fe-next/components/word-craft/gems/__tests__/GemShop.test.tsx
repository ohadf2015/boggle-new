import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GemShop } from '../GemShop';
import type { AbilityCard, GemInventory } from '@/lib/word-craft/gems/types';

const gsapToMock = vi.fn().mockReturnValue(undefined);
const gsapFromToMock = vi.fn().mockReturnValue(undefined);
vi.mock('gsap', () => ({
  gsap: {
    to: (...args: unknown[]) => gsapToMock(...args),
    fromTo: (...args: unknown[]) => gsapFromToMock(...args),
  },
}));

const inventory: GemInventory = {
  amber: { 1: 5, 2: 0, 3: 0 },
  ruby: { 1: 0, 2: 0, 3: 0 },
  sapphire: { 1: 0, 2: 0, 3: 0 },
  emerald: { 1: 0, 2: 0, 3: 0 },
};

const shop: AbilityCard[] = [
  { id: 'c1', kind: 'portal', cost: { color: 'amber', rarity: 1 } },
];

const labels = {
  title: 'Shop',
  cost: 'Cost',
  insufficient: 'Not enough',
  purchased: 'Purchased',
  abilityName: { portal: 'Portal', joker: 'Joker', reroll: 'Reroll' },
  abilityDesc: { portal: 'Swap', joker: 'Wild', reroll: 'Reroll shop' },
};

beforeEach(() => {
  gsapToMock.mockClear();
  gsapFromToMock.mockClear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

describe('GemShop', () => {
  it('plays a purchase punch animation on the clicked card before buying', () => {
    const onBuy = vi.fn();
    render(
      <GemShop shop={shop} inventory={inventory} pendingAbilities={[]} onBuy={onBuy} onReroll={vi.fn()} labels={labels} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Portal/ }));
    expect(gsapToMock).toHaveBeenCalled();
    expect(onBuy).toHaveBeenCalledWith(shop[0]);
  });

  it('skips the shop entrance tween when prefers-reduced-motion is set', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(
      <GemShop shop={shop} inventory={inventory} pendingAbilities={[]} onBuy={vi.fn()} onReroll={vi.fn()} labels={labels} />,
    );
    expect(gsapFromToMock).not.toHaveBeenCalled();
  });

  it('does not buy or animate an unaffordable card', () => {
    const onBuy = vi.fn();
    const poorInventory: GemInventory = {
      amber: { 1: 0, 2: 0, 3: 0 },
      ruby: { 1: 0, 2: 0, 3: 0 },
      sapphire: { 1: 0, 2: 0, 3: 0 },
      emerald: { 1: 0, 2: 0, 3: 0 },
    };
    render(
      <GemShop shop={shop} inventory={poorInventory} pendingAbilities={[]} onBuy={onBuy} onReroll={vi.fn()} labels={labels} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Portal/ }));
    expect(onBuy).not.toHaveBeenCalled();
  });
});
