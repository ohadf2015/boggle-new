/**
 * Wiring tests: WinStreakBadge and NearRankTeaser in ResultsMainContent
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

// Do NOT mock WinStreakBadge and NearRankTeaser — we test their presence

import { ResultsMainContent } from '../ResultsMainContent';

describe('ResultsMainContent wiring', () => {
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

  // Streak now lives inside ImprovementPanel ("Your Progress"), not a standalone
  // WinStreakBadge — single home for streak/XP/level avoids showing it twice.
  it('surfaces the win streak via ImprovementPanel when streak >= 2', () => {
    render(
      <ResultsMainContent
        {...baseProps}
        winStreakData={{ currentStreak: 3, bestStreak: 5, isNewMilestone: false, previousStreak: 2 }}
      />
    );
    expect(screen.getByTestId('improvement-streak')).toBeInTheDocument();
  });

  it('does not surface a streak when streak < 2', () => {
    render(
      <ResultsMainContent
        {...baseProps}
        winStreakData={{ currentStreak: 1, bestStreak: 1, isNewMilestone: false, previousStreak: 0 }}
      />
    );
    expect(screen.queryByTestId('improvement-streak')).not.toBeInTheDocument();
  });

  it('renders NearRankTeaser when nearRankData is provided', () => {
    render(
      <ResultsMainContent
        {...baseProps}
        nearRankData={{ nextTier: { name: 'Gold', color: '#FFD700', minRating: 1200 }, eloNeeded: 30 }}
      />
    );
    expect(screen.getByTestId('near-rank-teaser')).toBeInTheDocument();
  });
});
