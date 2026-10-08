import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

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

afterEach(() => cleanup());

const reveal = { gameCode: 'ABC', roundId: 'r1', rarity: 'epic' as const, xp: 60, itemId: 'tile-neon', roundCash: 42, rank: 2, size: 5 };

describe('RewardChest collect moment', () => {
  it('Given the reveal, Then the item name is headline size and the XP is large', () => {
    render(<RewardChest reveal={reveal} onClose={() => {}} />);
    expect(screen.getByText('cosmetics.items.tileNeon').className).toContain('text-3xl');
    expect(screen.getByText('economy.chest.xp:60').className).toContain('text-2xl');
  });

  it('Given the reveal, Then the round cash and placing show under the item', () => {
    render(<RewardChest reveal={reveal} onClose={() => {}} />);
    expect(screen.getByText('economy.reward.round:42')).toBeTruthy();
    expect(screen.getByText('economy.reward.rank:2,5')).toBeTruthy();
    expect(screen.getByText('economy.locker.added')).toBeTruthy();
  });

  it('Given no rank for this round, Then the placing line is left out', () => {
    render(<RewardChest reveal={{ ...reveal, rank: null, size: 0 }} onClose={() => {}} />);
    expect(screen.queryByText(/economy\.reward\.rank/)).toBeNull();
  });

  it('Given the sealed chest, Then the odds are one list with each rarity percentage', () => {
    render(<RewardChest reveal={{ ...reveal, rarity: 'common' }} onClose={() => {}} />);
    const sealed = screen.getByRole('dialog');
    expect(sealed.querySelector('ul')).toBeTruthy();
    expect(sealed.textContent).toContain('70%');
    expect(sealed.textContent).toContain('25%');
    expect(sealed.textContent).toContain('5%');
  });
});
