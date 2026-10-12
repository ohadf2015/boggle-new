import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
    language: 'en',
  }),
}));
const hook = { snapshot: null as null | Record<string, unknown>, error: null as string | null, buy: vi.fn() };
vi.mock('../useClassroomEconomy', () => ({
  useClassroomEconomy: () => ({ snapshot: hook.snapshot, buy: hook.buy, error: hook.error, board: null, requestState: vi.fn() }),
}));
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

import RoundShop from '../RoundShop';

afterEach(() => {
  cleanup();
  hook.snapshot = null;
  hook.error = null;
  hook.buy.mockReset();
});

const snap = (cash: number) => ({
  cash, cashEarned: cash, streak: 0, multiplier: 1, doubleCashMsLeft: 0, shieldHeld: false, hintsHeld: 0,
  config: { wrongAnswerCost: false, powerUps: true }, lastDelta: null,
});

describe('RoundShop opens as a full-screen step', () => {
  it('Given cash, Then a spend button sits on the results card and the grid stays closed', () => {
    hook.snapshot = snap(40);
    render(<RoundShop gameCode="ABC" />);
    expect(screen.getByTestId('round-shop-open').textContent).toContain('economy.shop.open:40');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('shop-item-streakShield')).toBeNull();
  });

  it('When the spend button is tapped, Then a dialog shows the power-up grid', () => {
    hook.snapshot = snap(40);
    render(<RoundShop gameCode="ABC" />);
    fireEvent.click(screen.getByTestId('round-shop-open'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByTestId('shop-item-streakShield')).toBeTruthy();
  });

  it('When the dialog is closed, Then the results card is back with no dialog', () => {
    hook.snapshot = snap(40);
    render(<RoundShop gameCode="ABC" />);
    fireEvent.click(screen.getByTestId('round-shop-open'));
    fireEvent.click(screen.getByText('economy.shop.close'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('round-shop')).toBeTruthy();
  });

  it('Given a refused buy, When the dialog is open, Then the reason shows inside the dialog', () => {
    hook.snapshot = snap(40);
    hook.error = 'insufficient_cash';
    render(<RoundShop gameCode="ABC" />);
    fireEvent.click(screen.getByTestId('round-shop-open'));
    expect(screen.getByRole('dialog').textContent).toContain('economy.error.insufficient_cash');
  });

  it('When a power-up is bought from the dialog, Then the buy goes to the server', () => {
    hook.snapshot = snap(40);
    render(<RoundShop gameCode="ABC" />);
    fireEvent.click(screen.getByTestId('round-shop-open'));
    fireEvent.click(screen.getByTestId('shop-item-streakShield'));
    expect(hook.buy).toHaveBeenCalledWith('streakShield');
  });

  it('Given power-ups are off, Then there is no spend button', () => {
    hook.snapshot = { ...snap(40), config: { wrongAnswerCost: false, powerUps: false } };
    render(<RoundShop gameCode="ABC" />);
    expect(screen.queryByTestId('round-shop-open')).toBeNull();
  });
});
