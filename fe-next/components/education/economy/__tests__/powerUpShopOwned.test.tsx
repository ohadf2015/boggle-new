import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ClassroomEconomySnapshot } from '@/shared/constants/classroomEconomy';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

import PowerUpShop from '../PowerUpShop';

afterEach(() => cleanup());

const snap = (over: Partial<ClassroomEconomySnapshot> = {}): ClassroomEconomySnapshot => ({
  cash: 50,
  cashEarned: 50,
  streak: 0,
  multiplier: 1,
  doubleCashMsLeft: 0,
  shieldHeld: false,
  hintsHeld: 0,
  config: { wrongAnswerCost: false, powerUps: true },
  lastDelta: null,
  ...over,
});

describe('PowerUpShop owned and between-round states', () => {
  it('Given a shield already held, Then the shield shows owned and cannot be bought twice', () => {
    const onBuy = vi.fn();
    render(<PowerUpShop snapshot={snap({ shieldHeld: true })} onBuy={onBuy} />);
    const shield = screen.getByTestId('shop-item-streakShield');
    expect(shield.textContent).toContain('economy.shop.owned');
    expect((shield as HTMLButtonElement).disabled).toBe(true);
  });

  it('Given the round is over, Then double cash is disabled and says it is round-only', () => {
    render(<PowerUpShop snapshot={snap()} onBuy={vi.fn()} between />);
    const dc = screen.getByTestId('shop-item-doubleCash') as HTMLButtonElement;
    expect(dc.disabled).toBe(true);
    expect(dc.textContent).toContain('economy.shop.roundOnly');
  });

  it('Given a shield bought, When it is held, Then the hint item still buys', () => {
    const onBuy = vi.fn();
    render(<PowerUpShop snapshot={snap({ shieldHeld: true })} onBuy={onBuy} />);
    fireEvent.click(screen.getByTestId('shop-item-hintReveal'));
    expect(onBuy).toHaveBeenCalledWith('hintReveal');
  });
});
