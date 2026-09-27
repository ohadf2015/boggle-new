/**
 * Coins no longer own a standalone full-width RewardsSummary row in the MP
 * results body. They fold into the HighlightsBar stats strip ("Coins Earned")
 * for signed-in players who actually earned coins. Guests / zero / null get no
 * coin stat (and there is no separate rewards card to render).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'control' }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: () => {} }));

// Mock heavy sub-components to keep test focused
vi.mock('@/components/results/ResultsHeroSection', () => ({ __esModule: true, default: () => <div data-testid="results-hero" /> }));
vi.mock('@/components/results/ResultsPodium', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ConsolationRows', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsRivalsPanel', () => ({ __esModule: true, default: () => <div data-testid="rivals" /> }));
vi.mock('@/components/results/ResultsRevengeSection', () => ({ ResultsRevengeSection: () => null }));
vi.mock('@/components/results/SeriesStandingsBanner', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsWordsSection', () => ({ ResultsWordsSection: () => null }));
vi.mock('@/components/results/MpBragCard', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ImprovementPanel', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/feedback/GameFeedback', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/multiplayer/NearRankTeaser', () => ({ NearRankTeaser: () => null }));
vi.mock('@/utils/consolationCrowns', () => ({ assignConsolationCrowns: () => [] }));

// HighlightsBar rendered for real-ish: expose the stat labels it received so we
// can assert the coins stat is folded in (or not).
vi.mock('@/components/results/HighlightsBar', () => ({
  __esModule: true,
  default: ({ stats }: { stats: Array<{ label: string }> }) => (
    <div data-testid="highlights">{stats.map(s => s.label).join('|')}</div>
  ),
}));

import { ResultsMainContent } from '../ResultsMainContent';
import type { CoinReward } from '../CoinRewardDisplay';

describe('ResultsMainContent — coins fold into the stats strip', () => {
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
  } as any;

  const sampleReward: CoinReward = {
    awarded: 75,
    breakdown: { base: 20, scoreBonus: 30, placement: 15, streakBonus: 10 },
  };

  it('adds a coins stat to HighlightsBar when a signed-in player earned coins', () => {
    render(<ResultsMainContent {...baseProps} coinReward={sampleReward} />);
    expect(screen.getByTestId('highlights').textContent).toContain('results.coinsEarned');
  });

  it('omits the coins stat when coinReward is null', () => {
    render(<ResultsMainContent {...baseProps} coinReward={null} />);
    expect(screen.getByTestId('highlights').textContent).not.toContain('results.coinsEarned');
  });

  it('omits the coins stat when coinReward is omitted', () => {
    render(<ResultsMainContent {...baseProps} />);
    expect(screen.getByTestId('highlights').textContent).not.toContain('results.coinsEarned');
  });

  it('omits the coins stat for guests (they do not earn coins)', () => {
    render(<ResultsMainContent {...baseProps} isAuthenticated={false} coinReward={sampleReward} />);
    expect(screen.getByTestId('highlights').textContent).not.toContain('results.coinsEarned');
  });

  it('omits the coins stat when zero coins were awarded', () => {
    render(<ResultsMainContent {...baseProps} coinReward={{ awarded: 0 }} />);
    expect(screen.getByTestId('highlights').textContent).not.toContain('results.coinsEarned');
  });

  it('no longer renders a standalone RewardsSummary card', () => {
    render(<ResultsMainContent {...baseProps} coinReward={sampleReward} />);
    expect(screen.queryByTestId('rewards-summary')).not.toBeInTheDocument();
  });
});
