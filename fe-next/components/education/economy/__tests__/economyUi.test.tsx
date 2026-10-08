import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
    language: 'en',
  }),
}));
vi.mock('@/utils/haptics', () => ({ hapticGameWin: vi.fn() }));
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

import RewardChest from '../RewardChest';
import PowerUpShop from '../PowerUpShop';
import EconomyHud from '../EconomyHud';
import { CHEST_ODDS, type ClassroomEconomySnapshot } from '@/shared/constants/classroomEconomy';

afterEach(() => cleanup());

const snap = (over: Partial<ClassroomEconomySnapshot> = {}): ClassroomEconomySnapshot => ({
  cash: 0,
  cashEarned: 0,
  streak: 0,
  multiplier: 1,
  doubleCashMsLeft: 0,
  shieldHeld: false,
  hintsHeld: 0,
  config: { wrongAnswerCost: false, powerUps: true },
  lastDelta: null,
  ...over,
});

describe('RewardChest', () => {
  it('Given reduced motion, When the chest mounts, Then the reveal shows without a shake', () => {
    render(
      <RewardChest
        reveal={{ gameCode: 'ABC', roundId: 'r1', rarity: 'rare', xp: 25, itemId: 'tile-default', roundCash: 0, rank: null, size: 0 }}
        onClose={() => {}}
      />
    );
    expect(screen.getByTestId('chest-reveal')).toBeTruthy();
    expect(screen.getAllByText('economy.chest.rarity.rare').length).toBeGreaterThan(0);
    expect(screen.getByText('economy.chest.continue')).toBeTruthy();
  });

  it('Given the overlay, Then the backdrop is hardcoded dark, not theme-responsive', () => {
    const { container } = render(
      <RewardChest
        reveal={{ gameCode: 'ABC', roundId: 'r1', rarity: 'common', xp: 10, itemId: 'tile-default', roundCash: 0, rank: null, size: 0 }}
        onClose={() => {}}
      />
    );
    const root = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toContain('bg-neo-cream');
  });

  it('Given continue is tapped, Then onClose fires', () => {
    const onClose = vi.fn();
    render(
      <RewardChest
        reveal={{ gameCode: 'ABC', roundId: 'r1', rarity: 'epic', xp: 60, itemId: 'tile-default', roundCash: 0, rank: null, size: 0 }}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText('economy.chest.continue'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Given the odds list, Then each percentage comes from the shared odds constant', () => {
    render(
      <RewardChest
        reveal={{ gameCode: 'ABC', roundId: 'r1', rarity: 'common', xp: 10, itemId: 'tile-default', roundCash: 0, rank: null, size: 0 }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(new RegExp(`\\s${Math.round(CHEST_ODDS.common * 100)}%$`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`\\s${Math.round(CHEST_ODDS.epic * 100)}%$`))).toBeTruthy();
  });
});

describe('PowerUpShop', () => {
  it('Given the teacher turned power-ups off, Then the shop renders nothing', () => {
    const { container } = render(
      <PowerUpShop snapshot={snap({ config: { wrongAnswerCost: false, powerUps: false } })} onBuy={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('Given too little cash, Then power-up buttons are disabled', () => {
    render(<PowerUpShop snapshot={snap({ cash: 1 })} onBuy={() => {}} />);
    const buttons = screen.getAllByRole('button') as HTMLButtonElement[];
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });

  it('Given enough cash, When a power-up is tapped, Then it is bought by id only', () => {
    const onBuy = vi.fn();
    render(<PowerUpShop snapshot={snap({ cash: 50 })} onBuy={onBuy} />);
    fireEvent.click(screen.getByText('economy.shop.hintReveal.name'));
    expect(onBuy).toHaveBeenCalledWith('hintReveal');
  });
});

describe('EconomyHud', () => {
  it('Given a streak of 3, Then the multiplier badge shows once', () => {
    render(<EconomyHud snapshot={snap({ streak: 3, multiplier: 2, cash: 9 })} />);
    expect(screen.getByTestId('hud-streak')).toBeTruthy();
    expect(screen.getByText('economy.hud.multiplier:2')).toBeTruthy();
  });

  it('Given a streak below 3, Then no flame shows', () => {
    render(<EconomyHud snapshot={snap({ streak: 2 })} />);
    expect(screen.queryByTestId('hud-streak')).toBeNull();
  });

  it('Given a correct word, Then the delta is shown as a pop', () => {
    render(
      <EconomyHud
        snapshot={snap({ lastDelta: { kind: 'correct', delta: 4, multiplier: 1, cost: 0 } })}
      />
    );
    expect(screen.getByText('+4')).toBeTruthy();
  });
});
