import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${Object.values(params).join(',')}` : key), language: 'en' }),
}));
const motion = { reduced: false };
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => motion.reduced };
});

import { cashBurstPieces } from '../cashBurst';
import EconomyHud from '../EconomyHud';

afterEach(() => {
  cleanup();
  motion.reduced = false;
});

const snapshot = {
  cash: 9, cashEarned: 9, streak: 1, multiplier: 1 as const, doubleCashMsLeft: 0, shieldHeld: false, hintsHeld: 0,
  config: { wrongAnswerCost: false, powerUps: true },
  lastDelta: { kind: 'correct' as const, delta: 3, multiplier: 1 as const, cost: 0 },
};

describe('cashBurstPieces', () => {
  it('Given a count, Then each piece leaves in its own direction around the number', () => {
    const pieces = cashBurstPieces(8);
    expect(pieces).toHaveLength(8);
    const angles = new Set(pieces.map((p) => Math.round(Math.atan2(p.y, p.x) * 100)));
    expect(angles.size).toBe(8);
  });
});

describe('EconomyHud cash burst', () => {
  it('Given a correct word, When the cash pops, Then a burst of pieces sits behind the number', () => {
    render(<EconomyHud snapshot={snapshot} />);
    expect(screen.getAllByTestId('cash-burst-piece')).toHaveLength(8);
  });

  it('Given reduced motion, Then no burst pieces render and the +N number still shows', () => {
    motion.reduced = true;
    render(<EconomyHud snapshot={snapshot} />);
    expect(screen.queryAllByTestId('cash-burst-piece')).toHaveLength(0);
    expect(screen.getByText('+3')).toBeTruthy();
  });
});
