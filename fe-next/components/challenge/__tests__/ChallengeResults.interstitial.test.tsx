// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ChallengeResults from '../ChallengeResults';

const showInterstitial = vi.hoisted(() => vi.fn());

vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
vi.mock('@/components/CrazyGamesBanner', () => ({ default: () => null }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/utils/challenges', () => ({
  getChallengeUrl: vi.fn(() => 'https://app.com/challenge/TESTCODE'),
  generateChallengeShareMessage: vi.fn(() => 'Beat my score!'),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/components/results/ResultsWinnerBanner', () => ({ default: () => <div /> }));
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) =>
      <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<unknown>) => <>{children}</>,
}));
vi.mock('@/hooks/useInterstitialAd', () => ({ useInterstitialAd: () => ({ showInterstitial }) }));

const challenge = {
  challengeCode: 'TESTCODE',
  creatorUsername: 'Creator',
  creatorScore: 200,
} as never;
const results = { playerScore: 300, playerWords: ['cat', 'bat'] } as never;

describe('ChallengeResults interstitial timing', () => {
  const onPlayAgain = vi.fn();
  const onBackToHome = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    showInterstitial.mockResolvedValue(undefined);
  });

  const renderResults = () => render(
    <ChallengeResults
      results={results}
      challenge={challenge}
      attemptResult={null}
      onPlayAgain={onPlayAgain}
      onBackToHome={onBackToHome}
    />,
  );

  it('does not fire on mount', () => {
    renderResults();
    expect(showInterstitial).not.toHaveBeenCalled();
  });

  it('fires before play again navigates', async () => {
    renderResults();
    fireEvent.click(screen.getByText('common.playAgain'));
    expect(onPlayAgain).not.toHaveBeenCalled();
    await waitFor(() => expect(onPlayAgain).toHaveBeenCalledTimes(1));
    expect(showInterstitial).toHaveBeenCalledWith('challenge-complete');
  });

  it('fires before back to home navigates', async () => {
    renderResults();
    fireEvent.click(screen.getByText('common.backToHome'));
    await waitFor(() => expect(onBackToHome).toHaveBeenCalledTimes(1));
    expect(showInterstitial).toHaveBeenCalledWith('challenge-complete');
  });

  it('still navigates when the interstitial rejects', async () => {
    showInterstitial.mockRejectedValue(new Error('ad failed'));
    renderResults();
    fireEvent.click(screen.getByText('common.playAgain'));
    await waitFor(() => expect(onPlayAgain).toHaveBeenCalledTimes(1));
  });
});
