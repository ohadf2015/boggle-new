import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ZERO_ECONOMY_SNAPSHOT, type ClassroomEconomySnapshot } from '@/shared/constants/classroomEconomy';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${Object.values(params).join(',')}` : key),
    language: 'en',
  }),
}));
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});
const econ = { snapshot: ZERO_ECONOMY_SNAPSHOT as ClassroomEconomySnapshot };
vi.mock('../useClassroomEconomy', () => ({
  useClassroomEconomy: () => ({ snapshot: econ.snapshot, board: null, hint: null, error: null, requestState: vi.fn(), buy: vi.fn(), useHint: vi.fn() }),
}));

import ClassroomEconomyDock from '../ClassroomEconomyDock';
import { claimHudFlame, useEconomyStreakStore } from '../streakFlame';

afterEach(() => {
  cleanup();
  useEconomyStreakStore.setState({ streak: 0, multiplier: 1, live: false, hudFlames: 0 });
});

describe('ClassroomEconomyDock shop button', () => {
  it('Given cash for a power-up, Then the shop button shows how many are ready', () => {
    econ.snapshot = { ...ZERO_ECONOMY_SNAPSHOT, cash: 16 };
    render(<ClassroomEconomyDock gameCode="ABC" />);
    expect(screen.getByTestId('shop-ready-count').textContent).toBe('2');
    expect(screen.getByText('economy.shop.readyCount:2')).toBeTruthy();
  });

  it('Given nothing affordable, Then no badge', () => {
    econ.snapshot = { ...ZERO_ECONOMY_SNAPSHOT, cash: 3 };
    render(<ClassroomEconomyDock gameCode="ABC" />);
    expect(screen.queryByTestId('shop-ready-count')).toBeNull();
  });
});

describe('ClassroomEconomyDock: two buttons, cash on the shop', () => {
  it('Given power-ups on, When the dock shows, Then it is just Power-ups and Class board, with my cash on the Power-ups button for screen readers too', () => {
    econ.snapshot = { ...ZERO_ECONOMY_SNAPSHOT, cash: 140, config: { ...ZERO_ECONOMY_SNAPSHOT.config, powerUps: true } };
    render(<ClassroomEconomyDock gameCode="ABC" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    const cash = screen.getByTestId('dock-cash');
    expect(buttons[0]).toContainElement(cash);
    expect(cash.textContent).toContain('140');
    expect(screen.getByText('economy.hud.cash:140')).toBeTruthy();
    expect(screen.queryByTestId('hud-cash')).toBeNull();
  });

  it('Given power-ups off, When the dock shows, Then my cash rides the Class board button', () => {
    econ.snapshot = { ...ZERO_ECONOMY_SNAPSHOT, cash: 40, config: { ...ZERO_ECONOMY_SNAPSHOT.config, powerUps: false } };
    render(<ClassroomEconomyDock gameCode="ABC" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toContainElement(screen.getByTestId('dock-cash'));
  });

  it('Given a streak, When the dock renders, Then it publishes the streak for the HUD flame', () => {
    econ.snapshot = { ...ZERO_ECONOMY_SNAPSHOT, streak: 4, multiplier: 2 };
    render(<ClassroomEconomyDock gameCode="ABC" />);
    expect(useEconomyStreakStore.getState()).toMatchObject({ streak: 4, multiplier: 2, live: true });
  });

  it('Given no HUD flame is mounted, When I have a streak, Then the dock shows the flame itself so it is never lost', () => {
    econ.snapshot = { ...ZERO_ECONOMY_SNAPSHOT, streak: 3, multiplier: 2 };
    render(<ClassroomEconomyDock gameCode="ABC" />);
    expect(screen.getByTestId('streak-flame')).toBeTruthy();
  });

  it('Given the HUD already shows the flame, When I have a streak, Then the dock does not show a second one', () => {
    econ.snapshot = { ...ZERO_ECONOMY_SNAPSHOT, streak: 3, multiplier: 2 };
    const release = claimHudFlame();
    render(<ClassroomEconomyDock gameCode="ABC" />);
    expect(screen.queryByTestId('streak-flame')).toBeNull();
    release();
  });
});
