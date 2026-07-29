// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ChallengeResults from '../ChallengeResults';

// --- Mock ResultsBannerSlot (added in 2026-05-05; pulls in useAdMob) ---
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));

// --- Mock LanguageContext ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

// --- Mock challenges utils ---
vi.mock('@/utils/challenges', () => ({
  getChallengeUrl: vi.fn(() => 'https://app.com/challenge/TESTCODE'),
  generateChallengeShareMessage: vi.fn(() => 'Beat my score!'),
}));

// --- Mock confetti ---
vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

// --- Mock ResultsWinnerBanner ---
vi.mock('@/components/results/ResultsWinnerBanner', () => {
  const MockResultsWinnerBanner = ({ customMessage }: { customMessage?: string }) => {
    return <div data-testid="winner-banner">{customMessage}</div>;
  };
  return { default: MockResultsWinnerBanner };
});

// --- Mock framer-motion ---
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      <div className={className as string} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<unknown>) => <>{children}</>,
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

// --- Clipboard API ---
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  share: undefined, // disable native share by default
});

// --- Shared fixtures ---
const mockChallenge = {
  id: 'challenge-id-1',
  challengeCode: 'TESTCODE',
  creatorUsername: 'Creator',
  creatorAvatarEmoji: '🏆',
  creatorAvatarColor: '#FF0000',
  creatorScore: 200,
  creatorWordCount: 5,
  creatorLongestWord: 'apple',
  gridSeed: 'seed',
  difficulty: 'medium',
  durationSeconds: 120,
  language: 'en',
  minWordLength: 3,
  totalAttempts: 10,
  totalBeaten: 4,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  creatorMaxCombo: 3,
  creatorAchievements: [],
  createdAt: new Date().toISOString(),
} as any;

const mockResults = {
  playerScore: 300,
  playerWords: ['cat', 'bat', 'rat', 'sat', 'mat', 'hat'],
  playerWordData: [],
  gameDuration: 120,
  botScores: [],
  grid: [['a', 'b'], ['c', 'd']],
  allPossibleWords: [],
  isNewHighScore: false,
} as any;

describe('ChallengeResults', () => {
  const onPlayAgain = vi.fn();
  const onBackToHome = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Score display', () => {
    it('renders player score and creator score', () => {
      // Given: player beat creator
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={{ beatCreator: true, scoreDifference: 100 }}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      // Then: both scores visible
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('displays word count', () => {
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      expect(screen.getByText('6')).toBeInTheDocument(); // 6 words
    });

    it('displays creator username', () => {
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      expect(screen.getByText('Creator')).toBeInTheDocument();
    });
  });

  describe('Beat creator', () => {
    it('shows "you won" message when player beats creator', () => {
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={{ beatCreator: true, scoreDifference: 100 }}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      expect(screen.getByTestId('winner-banner')).toHaveTextContent('challengeResults.youWon');
    });

    it('shows positive score difference when beating creator', () => {
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={{ beatCreator: true, scoreDifference: 100 }}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      // Score diff display uses + prefix for positive diffs
      expect(screen.getByText(/\+/)).toBeInTheDocument();
    });

    it('falls back to computed beatCreator when attemptResult is null and score higher', () => {
      const higherScoreResults = { ...mockResults, playerScore: 500 };
      render(
        <ChallengeResults
          results={higherScoreResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      expect(screen.getByTestId('winner-banner')).toHaveTextContent('challengeResults.youWon');
    });
  });

  describe("Didn't beat creator", () => {
    it('shows "so close" message when player loses', () => {
      const lowerScoreResults = { ...mockResults, playerScore: 100 };
      render(
        <ChallengeResults
          results={lowerScoreResults}
          challenge={mockChallenge}
          attemptResult={{ beatCreator: false, scoreDifference: -100 }}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      expect(screen.getByTestId('winner-banner')).toHaveTextContent('challengeResults.soClose');
    });

    it('falls back to computed beatCreator when attemptResult is null and score lower', () => {
      const lowerScoreResults = { ...mockResults, playerScore: 50 };
      render(
        <ChallengeResults
          results={lowerScoreResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      expect(screen.getByTestId('winner-banner')).toHaveTextContent('challengeResults.soClose');
    });
  });

  describe('Action buttons', () => {
    it('calls onPlayAgain when play again button is clicked', async () => {
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      fireEvent.click(screen.getByText('common.playAgain'));
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });

    it('calls onBackToHome when back to home button is clicked', async () => {
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      fireEvent.click(screen.getByText('common.backToHome'));
      expect(onBackToHome).toHaveBeenCalledTimes(1);
    });
  });

  describe('Share functionality', () => {
    it('copies link to clipboard when copy button is clicked', async () => {
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      fireEvent.click(screen.getByText('common.copy'));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://app.com/challenge/TESTCODE');
    });

    it('shows "copied" feedback after copy', async () => {
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      fireEvent.click(screen.getByText('common.copy'));
      await waitFor(() => expect(screen.getByText('common.copied')).toBeInTheDocument());
    });

    it('falls back to copy when native share is unavailable', async () => {
      // native share not defined (set in beforeEach at top level)
      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      fireEvent.click(screen.getByText('common.share'));
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('uses native share when available', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });

      render(
        <ChallengeResults
          results={mockResults}
          challenge={mockChallenge}
          attemptResult={null}
          onPlayAgain={onPlayAgain}
          onBackToHome={onBackToHome}
        />
      );

      fireEvent.click(screen.getByText('common.share'));
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://app.com/challenge/TESTCODE' })
      );

      // Clean up
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    });
  });
});
