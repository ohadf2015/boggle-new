import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
    language: 'en',
  }),
}));
vi.mock('@/utils/haptics', () => ({ hapticGameWin: vi.fn() }));
vi.mock('@/components/avatar/AvatarRenderer', async () => {
  const React = await import('react');
  return {
    default: ({ config }: { config: { eyes?: string } }) =>
      React.createElement('div', { 'data-testid': 'chest-avatar', 'data-eyes': config.eyes }),
  };
});
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

import RewardChest from '../RewardChest';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

afterEach(() => cleanup());

const reveal = { gameCode: 'ABC', roundId: 'r1', rarity: 'epic' as const, xp: 60, itemId: 'eyes:starEye', roundCash: 42, rank: 2, size: 5 };

describe('RewardChest collect moment', () => {
  it('Given the reveal, Then the part name is headline size and the XP is large', () => {
    render(<RewardChest reveal={reveal} onClose={() => {}} wearing={DEFAULT_AVATAR_CONFIG} />);
    expect(screen.getByText('revealUnlock.parts.starEye').className).toContain('text-3xl');
    expect(screen.getByText('economy.chest.xp:60').className).toContain('text-2xl');
  });

  it('Given the reveal, Then the student avatar wears the part and the part shows its category and tier', () => {
    render(<RewardChest reveal={reveal} onClose={() => {}} wearing={{ ...DEFAULT_AVATAR_CONFIG, eyes: 'kawaii' }} />);
    expect(screen.getByTestId('chest-avatar').getAttribute('data-eyes')).toBe('starEye');
    expect(screen.getByText('avatarBuilder.eyes')).toBeTruthy();
    expect(screen.getByText('avatarBuilder.tiers.epic')).toBeTruthy();
  });

  it('Given a legacy cosmetic id from an older row, Then the reveal still names the old item', () => {
    render(<RewardChest reveal={{ ...reveal, itemId: 'tile-neon' }} onClose={() => {}} wearing={DEFAULT_AVATAR_CONFIG} />);
    expect(screen.getByText('cosmetics.items.tileNeon')).toBeTruthy();
  });

  it('Given the reveal, Then the round cash and placing show under the item', () => {
    render(<RewardChest reveal={reveal} onClose={() => {}} wearing={DEFAULT_AVATAR_CONFIG} />);
    expect(screen.getByText('economy.reward.round:42')).toBeTruthy();
    expect(screen.getByText('economy.reward.rank:2,5')).toBeTruthy();
    expect(screen.getByText('economy.locker.added')).toBeTruthy();
  });

  it('Given no rank for this round, Then the placing line is left out', () => {
    render(<RewardChest reveal={{ ...reveal, rank: null, size: 0 }} onClose={() => {}} wearing={DEFAULT_AVATAR_CONFIG} />);
    expect(screen.queryByText(/economy\.reward\.rank/)).toBeNull();
  });

  it('Given the sealed chest, Then the odds are one list with each rarity percentage', () => {
    render(<RewardChest reveal={{ ...reveal, rarity: 'common' }} onClose={() => {}} wearing={DEFAULT_AVATAR_CONFIG} />);
    const sealed = screen.getByRole('dialog');
    expect(sealed.querySelector('ul')).toBeTruthy();
    expect(sealed.textContent).toContain('70%');
    expect(sealed.textContent).toContain('25%');
    expect(sealed.textContent).toContain('5%');
  });
});
