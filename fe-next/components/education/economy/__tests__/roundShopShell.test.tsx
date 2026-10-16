import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
    language: 'en',
  }),
}));
const hook = { snapshot: null as null | Record<string, unknown>, error: null as string | null };
vi.mock('../useClassroomEconomy', () => ({
  useClassroomEconomy: () => ({ snapshot: hook.snapshot, buy: vi.fn(), error: hook.error, board: null, requestState: vi.fn() }),
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
});

const snap = (cash: number, powerUps = true) => ({
  cash, cashEarned: cash, streak: 0, multiplier: 1, doubleCashMsLeft: 0, shieldHeld: false, hintsHeld: 0,
  config: { wrongAnswerCost: false, powerUps }, lastDelta: null,
});

describe('RoundShop is always visible on the results card', () => {
  it('Given no snapshot yet, Then the titled shop shell is still on screen with no cash figure', () => {
    render(<RoundShop gameCode="ABC" />);
    expect(screen.getByTestId('round-shop')).toBeTruthy();
    expect(screen.getByText('economy.shop.round')).toBeTruthy();
    expect(screen.getByText('economy.hud.loading')).toBeTruthy();
    expect(screen.queryByTestId('shop-cash')).toBeNull();
  });

  it('Given cash short of the next power-up, Then the save-for goal names it and how much is missing', () => {
    hook.snapshot = snap(12);
    render(<RoundShop gameCode="ABC" />);
    expect(screen.getByTestId('shop-goal').textContent).toContain('economy.goal.save.doubleCash:3');
  });

  it('Given cash covers every power-up, Then the goal says one is ready to buy', () => {
    hook.snapshot = snap(40);
    render(<RoundShop gameCode="ABC" />);
    expect(screen.getByTestId('shop-goal').textContent).toContain('economy.goal.ready');
  });

  it('Given the teacher turned power-ups off, Then the shell says so instead of going blank', () => {
    hook.snapshot = snap(40, false);
    render(<RoundShop gameCode="ABC" />);
    expect(screen.getByText('economy.shop.off')).toBeTruthy();
    expect(screen.queryByTestId('shop-item-hintReveal')).toBeNull();
  });

  it('Given the server refused the state request, Then the shell says why instead of loading forever', () => {
    hook.error = 'not_seated';
    render(<RoundShop gameCode="ABC" />);
    expect(screen.getByRole('alert').textContent).toContain('economy.error.not_seated');
    expect(screen.queryByText('economy.hud.loading')).toBeNull();
  });
});
