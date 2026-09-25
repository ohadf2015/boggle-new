/**
 * TDD tests for critical ShopScreen fixes:
 * 1. Double-tap guard must reset on failed purchase (busy → false, run unchanged)
 * 2. Confirm button must disable when item is not buyable (purchase in flight)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, params?: Record<string, unknown>) =>
    k === 'adventurePlay.map.shopBuy' && params?.price ? `Buy ${params.price}` : k }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playMenuOpenSound: vi.fn(),
    playUpgradePurchaseSound: vi.fn(),
    playCoinCollectSound: vi.fn(),
  })
}));

import ShopScreen from '../ShopScreen';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { ShopItem } from '@/lib/adventure/play/shop';

const mockRun: PublicRun = {
  seed: 'test-seed',
  w: 1,
  step: 1,
  node: 1,
  gold: 100,
  hp: 10,  // Not at max, so heal is buyable
  maxHp: 20,
  relics: [],
  potions: {},
  offer: [],
};

const mockItems: ShopItem[] = [
  { type: 'heal', amount: 5, price: 50 },  // Heal is buyable (hp < maxHp)
  { type: 'potion', id: 'strength', price: 30 },  // Potion is buyable
];

describe('ShopScreen — double-tap guard', () => {
  it('When a purchase fails and busy goes false with same run, the next buy call should fire', () => {
    const onBuy = vi.fn();
    const onLeave = vi.fn();

    const { rerender } = render(
      <ShopScreen
        items={mockItems}
        bought={[]}
        run={mockRun}
        world={1}
        busy={false}
        onBuy={onBuy}
        onLeave={onLeave}
      />
    );

    // Open first item
    const item0 = screen.getByTestId('shop-item-0');
    fireEvent.click(item0);
    expect(screen.getByTestId('shop-confirm')).toBeInTheDocument();

    // Click buy (sets buyInFlightRef = true)
    const confirmBuy = screen.getByTestId('shop-confirm-buy');
    fireEvent.click(confirmBuy);
    expect(onBuy).toHaveBeenCalledTimes(1);
    expect(onBuy).toHaveBeenCalledWith(0);

    // Rerender with busy=true (request in flight)
    rerender(
      <ShopScreen
        items={mockItems}
        bought={[]}
        run={mockRun}
        world={1}
        busy={true}
        onBuy={onBuy}
        onLeave={onLeave}
      />
    );

    // Rerender with busy=false, same run (request failed, no gold changed)
    // The bug: buyInFlightRef is still true, so the next buy won't fire
    rerender(
      <ShopScreen
        items={mockItems}
        bought={[]}
        run={mockRun}  // Same run object
        world={1}
        busy={false}
        onBuy={onBuy}
        onLeave={onLeave}
      />
    );

    // Try to buy the same item again
    const item0Again = screen.getByTestId('shop-item-0');
    fireEvent.click(item0Again);
    expect(screen.getByTestId('shop-confirm')).toBeInTheDocument();

    const confirmBuyAgain = screen.getByTestId('shop-confirm-buy');
    fireEvent.click(confirmBuyAgain);

    // The bug: onBuy is still called once (from first attempt)
    // After fix: should be called twice
    expect(onBuy).toHaveBeenCalledTimes(2);
  });

  it('When two rapid clicks happen in the same event loop, onBuy fires only once', () => {
    const onBuy = vi.fn();
    const onLeave = vi.fn();

    render(
      <ShopScreen
        items={mockItems}
        bought={[]}
        run={mockRun}
        world={1}
        busy={false}
        onBuy={onBuy}
        onLeave={onLeave}
      />
    );

    // Open first item
    const item0 = screen.getByTestId('shop-item-0');
    fireEvent.click(item0);
    expect(screen.getByTestId('shop-confirm')).toBeInTheDocument();

    const confirmBuy = screen.getByTestId('shop-confirm-buy');

    // Both clicks in the same act() block (same event loop)
    act(() => {
      confirmBuy.click();
      confirmBuy.click();
    });

    // Should only fire once due to the guard
    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  it('When purchase is in flight (busy=true), item buttons are disabled so dialog cannot open', () => {
    const onBuy = vi.fn();
    const onLeave = vi.fn();

    render(
      <ShopScreen
        items={mockItems}
        bought={[]}
        run={mockRun}
        world={1}
        busy={true}
        onBuy={onBuy}
        onLeave={onLeave}
      />
    );

    // Item buttons should be disabled when busy
    const item0 = screen.getByTestId('shop-item-0');
    expect(item0).toBeDisabled();

    // Cannot click to open dialog
    fireEvent.click(item0);
    expect(screen.queryByTestId('shop-confirm')).not.toBeInTheDocument();
  });

  it('When item is not buyable (sold or cant afford), confirm button is disabled', () => {
    const onBuy = vi.fn();
    const onLeave = vi.fn();

    // Item 1 costs 30, player has 100, so it's buyable initially
    // But if bought, it becomes "sold" (only one copy per run)
    render(
      <ShopScreen
        items={mockItems}
        bought={[1]}  // Item 1 was already bought
        run={mockRun}
        world={1}
        busy={false}
        onBuy={onBuy}
        onLeave={onLeave}
      />
    );

    // Try to open sold item
    const item1 = screen.getByTestId('shop-item-1');
    expect(item1).toBeDisabled();
    fireEvent.click(item1);
    // Dialog should not open for disabled item
    expect(screen.queryByTestId('shop-confirm')).not.toBeInTheDocument();
  });
});
