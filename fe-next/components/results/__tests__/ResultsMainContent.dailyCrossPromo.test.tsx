/**
 * The daily challenge had no cross-promo on the multiplayer results screen.
 *
 * `ResultsCtaSection` — which renders NextStepPrompt and is covered by
 * __tests__/crazygames/multiplayer-only-gating.test.tsx — is imported by that
 * test and by nothing else: it never shipped. So the surface with 4,963
 * `mp_results_viewed` + 6,387 `results_viewed` in 14 days offered no route into
 * the daily challenge, which took 151 opens in the same window while converting
 * 109 of them (72%). Discovery was the whole problem.
 *
 * Placement rule these tests lock in: the promo renders AFTER the rematch/ready
 * controls and the details disclosure, never before. Rematch is the primary
 * action on this screen and must not be out-competed.
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
vi.mock('@/components/results/NextStepPrompt', () => ({
  __esModule: true,
  default: ({ currentMode }: { currentMode: string }) => (
    <div data-testid="next-step" data-mode={currentMode} />
  ),
}));
let onCrazyGames = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: onCrazyGames }),
}));
vi.mock('@/components/android-install/GetAppMenuRow', () => ({
  __esModule: true,
  default: ({ source }: { source?: string }) => <div data-testid="get-app" data-source={source} />,
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

beforeEach(() => {
  trackGrowthEvent.mockClear();
  onCrazyGames = false;
});

describe('MP results — daily challenge cross-promo', () => {
  it('offers the daily challenge', () => {
    render(<ResultsMainContent {...baseProps} />);

    const promo = screen.getByTestId('next-step');
    // 'multiplayer-bots' is the NextStepMode whose destination is /daily.
    expect(promo.getAttribute('data-mode')).toBe('multiplayer-bots');
  });

  it('renders it after the details disclosure, so rematch stays the primary action', () => {
    render(<ResultsMainContent {...baseProps} />);

    const details = screen.getByRole('button', { name: /results.showDetails/i });
    const promo = screen.getByTestId('next-step');

    // DOCUMENT_POSITION_FOLLOWING === 4: promo comes after the disclosure.
    expect(details.compareDocumentPosition(promo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('is shown to guests too — they are the ones with nothing to come back for', () => {
    render(<ResultsMainContent {...baseProps} isAuthenticated={false} />);

    expect(screen.getByTestId('next-step')).toBeInTheDocument();
  });

  // Multiplayer is the only mode published on CrazyGames, so a daily-challenge
  // CTA there sends the player to a surface that platform does not have. The
  // dead ResultsCtaSection carried this guard; it has to move with the CTA.
  it('is suppressed on CrazyGames, where daily does not exist', () => {
    onCrazyGames = true;
    render(<ResultsMainContent {...baseProps} />);

    expect(screen.queryByTestId('next-step')).toBeNull();
  });

  it('also suppresses the app-install row on CrazyGames', () => {
    onCrazyGames = true;
    render(<ResultsMainContent {...baseProps} />);

    expect(screen.queryByTestId('get-app')).toBeNull();
  });

  it('offers the app-install row off CrazyGames, tagged as the results placement', () => {
    render(<ResultsMainContent {...baseProps} />);

    expect(screen.getByTestId('get-app').getAttribute('data-source')).toBe('results');
  });
});
