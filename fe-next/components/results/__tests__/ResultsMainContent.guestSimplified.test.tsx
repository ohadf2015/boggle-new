/**
 * Guest-simplified MP results.
 *
 * An unregistered player has no XP, no level, no rank tier and no history, so
 * most of the recap below the standings is noise to them. For guests the screen
 * keeps the verdict + standings and swaps the secondary stack for one signup
 * CTA. Registered players keep the full recap.
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
  __esModule: true, default: () => null,
}));
vi.mock('@/components/results/HighlightsBar', () => ({
  __esModule: true, default: () => <div data-testid="highlights-bar" />,
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
vi.mock('@/components/feedback/GameFeedback', () => ({
  __esModule: true, default: () => <div data-testid="game-feedback" />,
  GameFeedback: () => <div data-testid="game-feedback" />,
}));
vi.mock('@/components/auth/InlineSignupCard', () => ({
  __esModule: true, default: () => <div data-testid="inline-signup-card" />,
}));
vi.mock('@/utils/consolationCrowns', () => ({
  assignConsolationCrowns: () => [],
}));
// Auth resolved — the guest layout is gated on resolution, not on the initial
// `isAuthenticated === false` that every session starts with.
const auth = vi.hoisted(() => ({ current: { user: null, profile: null, isAuthenticated: false, loading: false } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.current }));

import { ResultsMainContent } from '../ResultsMainContent';

const players = [
  { username: 'alice', score: 500, allWords: [] },
  { username: 'bob', score: 400, allWords: [] },
  { username: 'cara', score: 300, allWords: [] },
];

const baseProps = {
  sortedScores: players,
  nearMisses: [],
  isHost: false,
  onStartGame: vi.fn(),
  onMarkReady: vi.fn(),
  onExit: vi.fn(),
  winStreakData: null,
  isAuthenticated: true,
  currentPlayerData: { username: 'bob', score: 400, allWords: [] },
  isCurrentUserWinner: false,
  currentPlayerValidWords: [{ word: 'test', score: 10 }],
  currentPlayerRank: 2,
  normalizeUsername: (n: string) => n || '',
  username: 'bob',
  isBotsOnlyGame: false,
  isCurrentPlayerReady: false,
  readyUsernames: [],
  duplicateRuleDisabled: false,
  t: (k: string) => k,
} as unknown as React.ComponentProps<typeof ResultsMainContent>;

describe('ResultsMainContent — guest simplification', () => {
  it('keeps verdict + standings for a guest', () => {
    render(<ResultsMainContent {...baseProps} isAuthenticated={false} />);
    expect(screen.getByTestId('results-hero')).toBeInTheDocument();
    expect(screen.getByTestId('results-podium')).toBeInTheDocument();
  });

  it('shows one signup CTA for a guest', () => {
    render(<ResultsMainContent {...baseProps} isAuthenticated={false} />);
    expect(screen.getByTestId('inline-signup-card')).toBeInTheDocument();
  });

  it('hides the details toggle and round-feedback prompt for a guest', () => {
    render(<ResultsMainContent {...baseProps} isAuthenticated={false} />);
    expect(screen.queryByText('results.showDetails')).toBeNull();
    expect(screen.queryByTestId('game-feedback')).toBeNull();
  });

  it('does not flash the guest layout while auth is still resolving', () => {
    auth.current = { ...auth.current, loading: true };
    try {
      // A logged-in player renders with isAuthenticated=false for the first
      // paint; the full recap must hold until the session resolves.
      render(<ResultsMainContent {...baseProps} isAuthenticated={false} />);
      expect(screen.getByText('results.showDetails')).toBeInTheDocument();
      expect(screen.queryByTestId('inline-signup-card')).toBeNull();
    } finally {
      auth.current = { ...auth.current, loading: false };
    }
  });

  it('keeps the full recap for a registered player', () => {
    render(<ResultsMainContent {...baseProps} isAuthenticated />);
    expect(screen.getByText('results.showDetails')).toBeInTheDocument();
    expect(screen.queryByTestId('inline-signup-card')).toBeNull();
  });
});
