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

describe('RewardsSummary breakdown line items', () => {
  it('renders streakBonus, efficiency, and streak alongside existing line items', async () => {
    const reward = makeReward({
      base: 10,
      scoreBonus: 20,
      placement: 30,
      efficiency: 5,
      streak: 7,
      streakBonus: 15,
    });

    render(
      <RewardsSummary coinReward={reward} isAuthenticated={true} />
    );

    await waitFor(() => {
      expect(screen.getByText('+10', { exact: false })).toBeInTheDocument();
    });

    // Existing fields — now via translation keys
    expect(screen.getByText(/reveal\.base/)).toBeInTheDocument();
    expect(screen.getByText(/coins\.score/)).toBeInTheDocument();
    expect(screen.getByText(/coins\.placement/)).toBeInTheDocument();

    // New fields — the gap this test closes
    expect(screen.getByText(/coins\.efficiency/)).toBeInTheDocument();
    expect(screen.getByText(/coins\.streak\b/)).toBeInTheDocument();
    expect(screen.getByText(/\+15/)).toBeInTheDocument(); // streakBonus value
  });

  it('omits zero-value line items', async () => {
    const reward = makeReward({
      base: 10,
      scoreBonus: 0,
      placement: 0,
      efficiency: 0,
      streak: 0,
      streakBonus: 0,
    });

    render(
      <RewardsSummary coinReward={reward} isAuthenticated={true} />
    );

    await waitFor(() => {
      expect(screen.getByText(/reveal\.base/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/coins\.score/)).not.toBeInTheDocument();
    expect(screen.queryByText(/coins\.efficiency/)).not.toBeInTheDocument();
    expect(screen.queryByText(/coins\.streak\b/)).not.toBeInTheDocument();
  });
});
