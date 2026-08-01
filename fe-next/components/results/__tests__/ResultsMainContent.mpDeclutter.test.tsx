/**
 * MP results declutter guards.
 *
 * The screen answers three things in order — did I win, by how much, play again —
 * and everything else is a disclosure. Two blocks used to sit permanently in that
 * path and re-print the verdict:
 *
 *  • MpBragCard: a ~350px card restating avatar/name/score/rival/rival-score plus
 *    a PRIMARY-styled "Challenge a friend" button competing with the sticky
 *    play-again bar. Now behind a one-line strip.
 *  • The word lists (yours + everyone else's + missed): the longest content on
 *    mobile, previously rendered fully expanded. Now inside the single existing
 *    "show details" disclosure via `detailsSlot`.
 *
 * These tests fail if either block comes back into the always-rendered path.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'control' }) }));
const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a) }));
vi.mock('@/components/results/ResultsHeroSection', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsPodium', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ConsolationRows', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsRivalsPanel', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/HighlightsBar', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ImprovementPanel', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/feedback/GameFeedback', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/multiplayer/NearRankTeaser', () => ({ NearRankTeaser: () => null }));
vi.mock('@/components/results/ResultsRevengeSection', () => ({ ResultsRevengeSection: () => null }));
vi.mock('@/components/results/SeriesStandingsBanner', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsWordsSection', () => ({
  ResultsWordsSection: () => <div data-testid="your-words" />,
}));
vi.mock('@/components/results/MpBragCard', () => ({
  __esModule: true,
  default: () => <div data-testid="brag-card" />,
}));
vi.mock('@/utils/consolationCrowns', () => ({ assignConsolationCrowns: () => [] }));
vi.mock('@/utils/share', () => ({ getBragShareUrl: () => 'https://x', trackShareCompleted: () => {} }));

import { ResultsMainContent } from '../ResultsMainContent';

const mk = (username: string, score: number) => ({ username, score, allWords: [] });
const baseProps = {
  nearMisses: [], isHost: false, onStartGame: vi.fn(), onMarkReady: vi.fn(), onExit: vi.fn(),
  winStreakData: null, isAuthenticated: true,
  currentPlayerValidWords: [{ word: 'test', score: 10 }],
  normalizeUsername: (n: string) => n || '', isBotsOnlyGame: false, isCurrentPlayerReady: false,
  readyUsernames: [], duplicateRuleDisabled: false, t: (k: string) => k,
  sortedScores: [mk('alice', 500), mk('bob', 400)],
  currentPlayerData: mk('bob', 400),
  currentPlayerRank: 2,
  isCurrentUserWinner: false,
  username: 'bob',
  gameMode: 'classic',
  gameCode: 'ABCD',
} as any;

beforeEach(() => trackGrowthEvent.mockClear());

describe('MP results — brag card is a disclosure, not a second verdict', () => {
  it('does not render the brag card until the strip is opened', () => {
    render(<ResultsMainContent {...baseProps} />);
    expect(screen.queryByTestId('brag-card')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /brag.strip/i }));
    expect(screen.getByTestId('brag-card')).toBeInTheDocument();
  });

  it('still fires mp_brag_card_viewed on mount so the impression metric keeps its meaning', () => {
    render(<ResultsMainContent {...baseProps} />);
    expect(trackGrowthEvent.mock.calls.map(c => c[0])).toContain('mp_brag_card_viewed');
  });

  it('fires a distinct expand event when opened', () => {
    render(<ResultsMainContent {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /brag.strip/i }));
    expect(trackGrowthEvent.mock.calls.map(c => c[0])).toContain('mp_brag_card_expanded');
  });
});

describe('MP results — every word list lives behind ONE disclosure', () => {
  it('keeps detailsSlot content collapsed until "show details" is opened', () => {
    render(<ResultsMainContent {...baseProps} detailsSlot={<div data-testid="others-words" />} />);
    expect(screen.queryByTestId('your-words')).toBeNull();
    expect(screen.queryByTestId('others-words')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /results.showDetails/i }));
    expect(screen.getByTestId('your-words')).toBeInTheDocument();
    expect(screen.getByTestId('others-words')).toBeInTheDocument();
  });

  it('renders the disclosure even with no detailsSlot (desktop keeps its own column)', () => {
    render(<ResultsMainContent {...baseProps} />);
    expect(screen.getByRole('button', { name: /results.showDetails/i })).toBeInTheDocument();
  });

  it('still shows the slot when currentPlayerData is null — it is about the OTHER players', () => {
    // Spectator / post-reconnect username mismatch: `finalScores` has rows but
    // none is yours. Gating the whole disclosure on your own row would silently
    // drop everyone else's words (rules/60 Class 4).
    render(
      <ResultsMainContent
        {...baseProps}
        currentPlayerData={null}
        detailsSlot={<div data-testid="others-words" />}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /results.showDetails/i }));
    expect(screen.getByTestId('others-words')).toBeInTheDocument();
    expect(screen.queryByTestId('your-words')).toBeNull();
  });
});
