/**
 * hideStandings: wheel-rush results already show every placement on the wheel
 * (WheelRushResultsScene — winner centered, runners-up orbiting). Rendering the
 * generic Top-3 Podium and Consolation rows below it repeats every name/score/
 * avatar/rank 2-3×. `hideStandings` suppresses that duplicate block while the
 * rest of the recap (hero / highlights / rewards) stays intact.
 *
 * Mode-agnostic by design: ResultsPage passes hideStandings for wheel-rush only,
 * so classic / word-hunt / blast keep their podium + consolation rows.
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
vi.mock('@/components/results/ResultsHeroSection', () => ({
  __esModule: true, default: () => <div data-testid="results-hero" />,
}));
vi.mock('@/components/results/ResultsPodium', () => ({
  __esModule: true, default: () => <div data-testid="results-podium" />,
}));
vi.mock('@/components/results/ConsolationRows', () => ({
  __esModule: true, default: () => <div data-testid="consolation-rows" />,
}));
vi.mock('@/components/results/HighlightsBar', () => ({
  __esModule: true, default: () => null,
}));
vi.mock('@/components/results/ResultsRevengeSection', () => ({
  ResultsRevengeSection: () => null,
}));
vi.mock('@/components/results/SeriesStandingsBanner', () => ({
  __esModule: true, default: () => null,
}));
vi.mock('@/components/results/ResultsWordsSection', () => ({
  ResultsWordsSection: () => null,
}));
vi.mock('@/utils/consolationCrowns', () => ({
  assignConsolationCrowns: () => [],
}));

import { ResultsMainContent } from '../ResultsMainContent';

const fourPlayers = [
  { username: 'alice', score: 500, allWords: [] },
  { username: 'bob', score: 400, allWords: [] },
  { username: 'cara', score: 300, allWords: [] },
  { username: 'dan', score: 200, allWords: [] },
];

const baseProps = {
  sortedScores: fourPlayers,
  nearMisses: [],
  isHost: false,
  onStartGame: vi.fn(),
  onMarkReady: vi.fn(),
  onExit: vi.fn(),
  winStreakData: null,
  isAuthenticated: true,
  // current player is 4th → triggers the consolation row
  currentPlayerData: { username: 'dan', score: 200, allWords: [] },
  isCurrentUserWinner: false,
  currentPlayerValidWords: [{ word: 'test', score: 10 }],
  currentPlayerRank: 4,
  normalizeUsername: (n: any) => n || '',
  username: 'dan',
  isBotsOnlyGame: false,
  isCurrentPlayerReady: false,
  readyUsernames: [],
  duplicateRuleDisabled: false,
  t: (k: string) => k,
} as any;

describe('ResultsMainContent hideStandings', () => {
  it('renders Podium + Consolation rows by default (other modes unaffected)', () => {
    render(<ResultsMainContent {...baseProps} />);
    expect(screen.getByTestId('results-podium')).toBeInTheDocument();
    expect(screen.getByTestId('consolation-rows')).toBeInTheDocument();
  });

  it('hides Podium + Consolation rows when hideStandings is true (wheel-rush)', () => {
    render(<ResultsMainContent {...baseProps} hideStandings />);
    expect(screen.queryByTestId('results-podium')).not.toBeInTheDocument();
    expect(screen.queryByTestId('consolation-rows')).not.toBeInTheDocument();
  });

  it('keeps the rest of the recap (hero) when standings are hidden', () => {
    render(<ResultsMainContent {...baseProps} hideStandings />);
    expect(screen.getByTestId('results-hero')).toBeInTheDocument();
  });
});
