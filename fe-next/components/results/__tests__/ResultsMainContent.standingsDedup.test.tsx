/**
 * Standings dedup: the player's rank/score must not be restated by both the
 * Podium AND the RivalsPanel on the same screen. Rule:
 *   - 2 players  → RivalsPanel only (head-to-head + delta); no 2-bar podium.
 *   - 3+ players → Podium (top-3) only; the full rival list lives in Details.
 *   - hideStandings (wheel-rush/blast own scene) → neither.
 * This kills the Podium↔RivalsPanel adjacency duplication seen in every variant.
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
vi.mock('@/components/results/ResultsHeroSection', () => ({
  __esModule: true, default: () => <div data-testid="results-hero" />,
}));
vi.mock('@/components/results/ResultsPodium', () => ({
  __esModule: true, default: () => <div data-testid="results-podium" />,
}));
vi.mock('@/components/results/ConsolationRows', () => ({
  __esModule: true, default: () => <div data-testid="consolation-rows" />,
}));
vi.mock('@/components/results/ResultsRivalsPanel', () => ({
  __esModule: true, default: () => <div data-testid="results-rivals-panel" />,
}));
vi.mock('@/components/results/HighlightsBar', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/MpBragCard', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ImprovementPanel', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/feedback/GameFeedback', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/multiplayer/NearRankTeaser', () => ({ NearRankTeaser: () => null }));
vi.mock('@/components/results/ResultsRevengeSection', () => ({ ResultsRevengeSection: () => null }));
vi.mock('@/components/results/SeriesStandingsBanner', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsWordsSection', () => ({ ResultsWordsSection: () => null }));
vi.mock('@/components/results/RewardsSummary', () => ({ __esModule: true, default: () => null }));
vi.mock('@/utils/consolationCrowns', () => ({ assignConsolationCrowns: () => [] }));

import { ResultsMainContent } from '../ResultsMainContent';

const mk = (username: string, score: number) => ({ username, score, allWords: [] });

const baseProps = {
  nearMisses: [],
  isHost: false,
  onStartGame: vi.fn(),
  onMarkReady: vi.fn(),
  onExit: vi.fn(),
  winStreakData: null,
  isAuthenticated: true,
  currentPlayerValidWords: [{ word: 'test', score: 10 }],
  normalizeUsername: (n: any) => n || '',
  isBotsOnlyGame: false,
  isCurrentPlayerReady: false,
  readyUsernames: [],
  duplicateRuleDisabled: false,
  t: (k: string) => k,
} as any;

describe('ResultsMainContent standings dedup', () => {
  it('2 players → RivalsPanel only, no Podium', () => {
    render(
      <ResultsMainContent
        {...baseProps}
        sortedScores={[mk('alice', 500), mk('bob', 400)]}
        currentPlayerData={mk('bob', 400)}
        currentPlayerRank={2}
        isCurrentUserWinner={false}
        username="bob"
      />
    );
    expect(screen.getByTestId('results-rivals-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('results-podium')).not.toBeInTheDocument();
  });

  it('4 players → Podium only, no standalone RivalsPanel', () => {
    render(
      <ResultsMainContent
        {...baseProps}
        sortedScores={[mk('alice', 500), mk('bob', 400), mk('cara', 300), mk('dan', 200)]}
        currentPlayerData={mk('dan', 200)}
        currentPlayerRank={4}
        isCurrentUserWinner={false}
        username="dan"
      />
    );
    expect(screen.getByTestId('results-podium')).toBeInTheDocument();
    expect(screen.queryByTestId('results-rivals-panel')).not.toBeInTheDocument();
  });

  it('hideStandings → neither Podium nor RivalsPanel', () => {
    render(
      <ResultsMainContent
        {...baseProps}
        hideStandings
        sortedScores={[mk('alice', 500), mk('bob', 400), mk('cara', 300)]}
        currentPlayerData={mk('bob', 400)}
        currentPlayerRank={2}
        isCurrentUserWinner={false}
        username="bob"
      />
    );
    expect(screen.queryByTestId('results-podium')).not.toBeInTheDocument();
    expect(screen.queryByTestId('results-rivals-panel')).not.toBeInTheDocument();
  });
});
