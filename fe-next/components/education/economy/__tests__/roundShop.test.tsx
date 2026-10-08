import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
const hook = { snapshot: null as null | Record<string, unknown>, buy: vi.fn() };
vi.mock('../useClassroomEconomy', () => ({
  useClassroomEconomy: () => ({ snapshot: hook.snapshot, buy: hook.buy, board: null, requestState: vi.fn() }),
}));
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

import RoundShop from '../RoundShop';

afterEach(() => {
  cleanup();
  hook.snapshot = null;
  hook.buy.mockReset();
});

describe('RoundShop', () => {
  it('Given no server snapshot yet, Then the shop waits instead of showing a guess', () => {
    render(<RoundShop gameCode="ABC" />);
    expect(screen.queryByTestId('shop-cash')).toBeNull();
  });

  it('Given the snapshot, When a power-up is bought between rounds, Then the buy goes to the server', () => {
    hook.snapshot = {
      cash: 40, cashEarned: 40, streak: 0, multiplier: 1, doubleCashMsLeft: 0, shieldHeld: false, hintsHeld: 0,
      config: { wrongAnswerCost: false, powerUps: true }, lastDelta: null,
    };
    render(<RoundShop gameCode="ABC" />);
    expect((screen.getByTestId('shop-item-doubleCash') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('shop-item-streakShield'));
    expect(hook.buy).toHaveBeenCalledWith('streakShield');
  });
});
