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

const onCrazyGames = { isOnCrazyGamesPlatform: true };
const offCrazyGames = { isOnCrazyGamesPlatform: false };
let cgFlag = onCrazyGames;

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => cgFlag,
}));

const reward: CoinReward = { awarded: 10, breakdown: { base: 10 } };

describe('RewardsSummary on CrazyGames — guest tease suppression', () => {
  beforeEach(() => {
    cgFlag = onCrazyGames;
  });

  it('renders nothing when guest has only the coin tease on CG', async () => {
    const { container } = render(
      <RewardsSummary coinReward={reward} isAuthenticated={false} />
    );
    await new Promise((r) => setTimeout(r, 350));
    expect(container.textContent).not.toMatch(/signInToEarn/);
    expect(container.firstChild).toBeNull();
  });

  it('still renders the streak chip when CG guest has a streak reward', async () => {
    const { container } = render(
      <RewardsSummary
        coinReward={reward}
        isAuthenticated={false}
        winStreak={{ currentStreak: 3, bestStreak: 5 }}
      />
    );
    await waitFor(() => {
      expect(container.querySelector('.bg-neo-orange\\/90')).not.toBeNull();
    });
    expect(screen.queryByText(/signInToEarn/)).not.toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('still shows the guest tease off CG (web)', async () => {
    cgFlag = offCrazyGames;
    render(
      <RewardsSummary coinReward={reward} isAuthenticated={false} />
    );
    await waitFor(() => {
      expect(screen.getByText(/signInToEarn/)).toBeInTheDocument();
    });
  });
});
