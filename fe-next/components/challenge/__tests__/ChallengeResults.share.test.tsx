// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

describe('ChallengeResults share button', () => {
  const setNav = (share: unknown, writeText: unknown) => {
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  };
  const renderResults = () => render(
    <ChallengeResults
      results={results}
      challenge={challenge}
      attemptResult={null}
      onPlayAgain={vi.fn()}
      onBackToHome={vi.fn()}
    />,
  );

  afterEach(() => setNav(undefined, undefined));

  it('Given the sheet is dismissed, Then nothing is copied and no copied state shows', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
    setNav(share, writeText);
    renderResults();
    await act(async () => {
      fireEvent.click(screen.getByText('common.share'));
    });
    expect(share).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText('common.copied')).toBeNull();
  });

  it('Given no native share, Then the link is copied and the copied state shows', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav(undefined, writeText);
    renderResults();
    await act(async () => {
      fireEvent.click(screen.getByText('common.share'));
    });
    expect(writeText).toHaveBeenCalledWith('https://app.com/challenge/TESTCODE');
    expect(screen.getByText('common.copied')).toBeInTheDocument();
  });
});
