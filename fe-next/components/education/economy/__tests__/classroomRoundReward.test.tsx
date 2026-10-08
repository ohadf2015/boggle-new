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

import ClassroomRoundReward from '../ClassroomRoundReward';

afterEach(() => {
  cleanup();
  reward.value = null;
});

describe('ClassroomRoundReward', () => {
  it('Given no reward from the server, Then nothing is offered', () => {
    render(<ClassroomRoundReward gameCode="ABC" roundId="7" />);
    expect(screen.queryByText('economy.reward.ready')).toBeNull();
  });

  it('Given a reward, When the student taps it, Then the full chest opens and closing collects it', () => {
    reward.value = { gameCode: 'ABC', roundId: '7', rarity: 'rare', xp: 25, itemId: 'tile-neon', roundCash: 9, rank: 1, size: 3 };
    render(<ClassroomRoundReward gameCode="ABC" roundId="7" />);
    fireEvent.click(screen.getByText('economy.reward.ready'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByText('economy.chest.continue'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('economy.reward.collected')).toBeTruthy();
  });
});
