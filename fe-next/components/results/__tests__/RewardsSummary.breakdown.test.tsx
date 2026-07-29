import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RewardsSummary from '../RewardsSummary';
import type { CoinReward } from '../CoinRewardDisplay';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => true,
}));

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

vi.mock('../WinStreakDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="win-streak" />,
}));

const makeReward = (breakdown: CoinReward['breakdown']): CoinReward => ({
  awarded: 100,
  breakdown,
});

describe('RewardsSummary breakdown tooltip', () => {
  it('exposes streakBonus, efficiency, streak alongside existing fields via the chip title', async () => {
    const reward = makeReward({
      base: 10,
      scoreBonus: 20,
      placement: 30,
      efficiency: 5,
      streak: 7,
      streakBonus: 15,
    });

    const { container } = render(
      <RewardsSummary coinReward={reward} isAuthenticated={true} />
    );

    let chip: HTMLElement | null = null;
    await waitFor(() => {
      chip = container.querySelector('[title]');
      expect(chip).not.toBeNull();
    });

    const title = chip!.getAttribute('title') ?? '';
    expect(title).toMatch(/reveal\.base/);
    expect(title).toMatch(/coins\.score/);
    expect(title).toMatch(/coins\.placement/);
    expect(title).toMatch(/coins\.efficiency/);
    expect(title).toMatch(/coins\.streak\b/);
    expect(title).toMatch(/\+15/);
  });

  it('omits zero-value segments from the title tooltip', async () => {
    const reward = makeReward({
      base: 10,
      scoreBonus: 0,
      placement: 0,
      efficiency: 0,
      streak: 0,
      streakBonus: 0,
    });

    const { container } = render(
      <RewardsSummary coinReward={reward} isAuthenticated={true} />
    );

    let chip: HTMLElement | null = null;
    await waitFor(() => {
      chip = container.querySelector('[title]');
      expect(chip).not.toBeNull();
    });

    const title = chip!.getAttribute('title') ?? '';
    expect(title).toMatch(/reveal\.base/);
    expect(title).not.toMatch(/coins\.score/);
    expect(title).not.toMatch(/coins\.efficiency/);
    expect(title).not.toMatch(/coins\.streak\b/);
  });
});
