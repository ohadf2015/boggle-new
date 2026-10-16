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

afterEach(() => cleanup());

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
