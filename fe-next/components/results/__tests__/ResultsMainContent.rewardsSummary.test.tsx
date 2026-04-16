/**
 * TDD RED: Verify RewardsSummary is wired into ResultsMainContent
 * when coinReward is provided, and hidden when null/undefined.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => false,
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

// Mock heavy sub-components to keep test focused
vi.mock('@/components/results/ResultsHeroSection', () => ({
  __esModule: true,
  default: () => <div data-testid="results-hero" />,
}));
vi.mock('@/components/results/ResultsPodium', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@/components/results/ConsolationRows', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@/components/results/HighlightsBar', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@/components/results/ResultsRevengeSection', () => ({
  ResultsRevengeSection: () => null,
}));
vi.mock('@/components/results/SeriesStandingsBanner', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@/components/results/ResultsWordsSection', () => ({
  ResultsWordsSection: () => null,
}));
vi.mock('@/utils/consolationCrowns', () => ({
  assignConsolationCrowns: () => [],
}));

// Mock RewardsSummary — render stub with testid so we can assert presence
vi.mock('@/components/results/RewardsSummary', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="rewards-summary" data-coin-reward={JSON.stringify(props.coinReward)} />
  ),
}));

import { ResultsMainContent } from '../ResultsMainContent';
import type { CoinReward } from '../CoinRewardDisplay';

describe('ResultsMainContent — RewardsSummary wiring', () => {
  const baseProps = {
    sortedScores: [
      { username: 'alice', score: 500, allWords: [] },
      { username: 'bob', score: 300, allWords: [] },
    ],
    nearMisses: [],
    isHost: false,
    onStartGame: vi.fn(),
    onMarkReady: vi.fn(),
    onExit: vi.fn(),
    winStreakData: null,
    isAuthenticated: true,
    currentPlayerData: { username: 'alice', score: 500, allWords: [] },
    isCurrentUserWinner: true,
    currentPlayerValidWords: [{ word: 'test', score: 10 }],
    currentPlayerRank: 1,
    normalizeUsername: (n: any) => n || '',
    username: 'alice',
    isBotsOnlyGame: false,
    isCurrentPlayerReady: false,
    readyUsernames: [],
    duplicateRuleDisabled: false,
    t: (k: string) => k,
  };

  const sampleReward: CoinReward = {
    awarded: 75,
    breakdown: { base: 20, scoreBonus: 30, placement: 15, streakBonus: 10 },
  };

  it('renders RewardsSummary when coinReward is provided', () => {
    render(<ResultsMainContent {...baseProps} coinReward={sampleReward} />);
    expect(screen.getByTestId('rewards-summary')).toBeInTheDocument();
  });

  it('does not render RewardsSummary when coinReward is null', () => {
    render(<ResultsMainContent {...baseProps} coinReward={null} />);
    expect(screen.queryByTestId('rewards-summary')).not.toBeInTheDocument();
  });

  it('does not render RewardsSummary when coinReward is omitted', () => {
    render(<ResultsMainContent {...baseProps} />);
    expect(screen.queryByTestId('rewards-summary')).not.toBeInTheDocument();
  });

  it('passes coinReward data through to RewardsSummary', () => {
    render(<ResultsMainContent {...baseProps} coinReward={sampleReward} />);
    const el = screen.getByTestId('rewards-summary');
    const passed = JSON.parse(el.getAttribute('data-coin-reward') || 'null');
    expect(passed).toEqual(sampleReward);
  });
});
