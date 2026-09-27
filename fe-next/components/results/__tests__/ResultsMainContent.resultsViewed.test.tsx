/**
 * Canonical results_viewed funnel event for multiplayer classic / survival /
 * wheel-rush. Those modes already fire mp_results_viewed, but PostHog
 * mode-split dashboards query the shared results_viewed name (same shape as
 * word-wheel / word-hunt / blast). Without this, classic (~375 starts / 14d)
 * is invisible on the results funnel.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'control' }) }));
const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));
vi.mock('@/components/results/ResultsHeroSection', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsPodium', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ConsolationRows', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsRivalsPanel', () => ({ __esModule: true, default: () => null }));
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
  normalizeUsername: (n: string) => n || '',
  isBotsOnlyGame: false,
  isCurrentPlayerReady: false,
  readyUsernames: [],
  duplicateRuleDisabled: false,
  t: (k: string) => k,
  sortedScores: [mk('bob', 500), mk('alice', 400)],
  currentPlayerData: mk('bob', 500),
  currentPlayerRank: 1,
  isCurrentUserWinner: true,
  username: 'bob',
  language: 'en',
} as any;

beforeEach(() => {
  trackGrowthEvent.mockClear();
});

describe('ResultsMainContent — results_viewed instrumentation', () => {
  it('fires canonical results_viewed on mount with mode + score (classic)', () => {
    // GIVEN multiplayer classic results
    // WHEN the results surface mounts
    render(<ResultsMainContent {...baseProps} gameMode="classic" />);

    // THEN the shared funnel event fires with the same shape as word-wheel/blast
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'results_viewed',
      expect.objectContaining({ mode: 'classic', score: 500 }),
    );
  });

  it('fires results_viewed for survival and wheel-rush modes', () => {
    render(<ResultsMainContent {...baseProps} gameMode="survival" />);
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'results_viewed',
      expect.objectContaining({ mode: 'survival', score: 500 }),
    );

    trackGrowthEvent.mockClear();
    render(<ResultsMainContent {...baseProps} gameMode="wheel-rush" />);
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'results_viewed',
      expect.objectContaining({ mode: 'wheel-rush', score: 500 }),
    );
  });

  it('still fires mp_results_viewed for multiplayer (does not regress)', () => {
    render(<ResultsMainContent {...baseProps} gameMode="classic" />);
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'mp_results_viewed',
      expect.objectContaining({ gameMode: 'classic' }),
    );
  });

  it('uses mode unknown and score 0 when props are missing', () => {
    render(
      <ResultsMainContent
        {...baseProps}
        gameMode={undefined}
        currentPlayerData={undefined}
        sortedScores={[mk('solo', 0)]}
      />,
    );
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'results_viewed',
      expect.objectContaining({ mode: 'unknown', score: 0 }),
    );
  });
});
