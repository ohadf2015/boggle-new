import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
const reward = { value: null as null | Record<string, unknown> };
vi.mock('../useRoundReward', () => ({ useRoundReward: () => reward.value }));
vi.mock('../useClassroomEconomy', () => ({
  useClassroomEconomy: () => ({ board: null }),
}));
vi.mock('@/utils/haptics', () => ({ hapticGameWin: vi.fn() }));
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

const locker = { items: [] as Array<Record<string, unknown>> };
const refreshLocker = vi.fn();
vi.mock('../useChestLocker', () => ({ useChestLocker: () => ({ items: locker.items, refresh: refreshLocker }) }));

import ClassroomRoundReward from '../ClassroomRoundReward';

afterEach(() => {
  cleanup();
  reward.value = null;
  locker.items = [];
});

describe('ClassroomRoundReward', () => {
  it('Given collected chests, Then the locker lists each item with its rarity', () => {
    locker.items = [{ gameCode: 'ABC', roundId: '3', rarity: 'epic', xp: 60, itemId: 'tile-neon', createdAt: 'x' }];
    render(<ClassroomRoundReward gameCode="ABC" />);
    expect(screen.getByText('economy.locker.title')).toBeTruthy();
    expect(screen.getByText('cosmetics.items.tileNeon')).toBeTruthy();
  });
});
