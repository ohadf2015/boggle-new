/**
 * "Only You" (unique-words count) must appear in exactly ONE place per screen.
 * In a 2-player match the RivalsPanel already brags it ("✨ Only you found N"),
 * so HighlightsBar must NOT restate it. In a 3+ match there's no RivalsPanel, so
 * HighlightsBar keeps it. Guards the cross-section number duplication.
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
vi.mock('@/components/results/ResultsHeroSection', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsPodium', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ConsolationRows', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsRivalsPanel', () => ({ __esModule: true, default: () => <div data-testid="rivals" /> }));
// HighlightsBar rendered for real-ish: expose the stat labels it received.
vi.mock('@/components/results/HighlightsBar', () => ({
  __esModule: true,
  default: ({ stats }: { stats: Array<{ label: string }> }) => (
    <div data-testid="highlights">{stats.map(s => s.label).join('|')}</div>
  ),
}));
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
  nearMisses: [], isHost: false, onStartGame: vi.fn(), onMarkReady: vi.fn(), onExit: vi.fn(),
  winStreakData: null, isAuthenticated: true,
  currentPlayerValidWords: [{ word: 'test', score: 10 }],
  normalizeUsername: (n: any) => n || '', isBotsOnlyGame: false, isCurrentPlayerReady: false,
  readyUsernames: [], duplicateRuleDisabled: false, t: (k: string) => k,
} as any;

describe('ResultsMainContent — "Only You" dedup', () => {
  it('2 players → HighlightsBar omits the only-you stat (RivalsPanel carries it)', () => {
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
    expect(screen.getByTestId('rivals')).toBeInTheDocument();
    expect(screen.getByTestId('highlights').textContent).not.toContain('results.uniqueWords.label');
  });

  it('4 players → HighlightsBar keeps the only-you stat (no RivalsPanel)', () => {
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
    expect(screen.queryByTestId('rivals')).not.toBeInTheDocument();
    expect(screen.getByTestId('highlights').textContent).toContain('results.uniqueWords.label');
  });
});
