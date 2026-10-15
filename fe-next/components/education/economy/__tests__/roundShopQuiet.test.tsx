import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
const hook = { snapshot: null as null | Record<string, unknown> };
vi.mock('../useClassroomEconomy', () => ({
  useClassroomEconomy: () => ({ snapshot: hook.snapshot, buy: vi.fn(), error: null, board: null, requestState: vi.fn() }),
}));

import RoundShop from '../RoundShop';
import { canBuyBetweenRounds } from '../shopGoal';

afterEach(() => {
  cleanup();
  hook.snapshot = null;
});

const snap = (cash: number, shieldHeld = false) => ({
  cash, cashEarned: cash, streak: 0, multiplier: 1, doubleCashMsLeft: 0, shieldHeld, hintsHeld: 0,
  config: { wrongAnswerCost: false, powerUps: true }, lastDelta: null,
});

describe('canBuyBetweenRounds', () => {
  it('Given less cash than the cheapest power-up, Then nothing can be bought', () => {
    expect(canBuyBetweenRounds(snap(0))).toBe(false);
    expect(canBuyBetweenRounds(snap(9))).toBe(false);
  });

  it('Given enough for a hint, Then something can be bought', () => {
    expect(canBuyBetweenRounds(snap(10))).toBe(true);
  });

  it('Given the shield is already held and cash only covers the shield range, Then the hint still counts', () => {
    expect(canBuyBetweenRounds(snap(20, true))).toBe(true);
  });
});

describe('RoundShop spend button', () => {
  it('Given no cash, When results show, Then the spend button is disabled and quiet (not lime)', () => {
    hook.snapshot = snap(0);
    render(<RoundShop gameCode="ABC" />);
    const btn = screen.getByTestId('round-shop-open') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.className).not.toContain('bg-neo-lime');
  });

  it('Given cash for a power-up, Then the spend button is the lime primary action', () => {
    hook.snapshot = snap(25);
    render(<RoundShop gameCode="ABC" />);
    const btn = screen.getByTestId('round-shop-open') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.className).toContain('bg-neo-lime');
  });
});
