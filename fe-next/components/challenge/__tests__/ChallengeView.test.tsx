import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChallengeView from '../ChallengeView';

// --- Mock next/navigation ---
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// --- Mock LanguageContext ---
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

// --- Mock AuthContext ---
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { username: 'TestUser', avatar_emoji: '🎯', avatar_color: '#333' },
    isAuthenticated: true,
  }),
}));

// --- Mock ThemeContext ---
jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

// --- Mock guestManager ---
jest.mock('@/utils/guestManager', () => ({
  getGuestSessionId: jest.fn().mockReturnValue('guest-session-id'),
}));

// --- Mock challenges utils ---
const mockGetChallenge = jest.fn();
const mockParseGridSeed = jest.fn();
const mockRecordChallengeAttempt = jest.fn();

jest.mock('@/utils/challenges', () => ({
  getChallenge: (...args: unknown[]) => mockGetChallenge(...args),
  parseGridSeed: (...args: unknown[]) => mockParseGridSeed(...args),
  recordChallengeAttempt: (...args: unknown[]) => mockRecordChallengeAttempt(...args),
}));

// --- Mock SinglePlayerGame ---
jest.mock('@/components/singleplayer/SinglePlayerGame', () => {
  return function MockSinglePlayerGame({ onGameEnd, onQuit }: { onGameEnd: (r: any) => void; onQuit: () => void }) {
    return (
      <div data-testid="single-player-game">
        <button onClick={() => onGameEnd({
          playerScore: 250,
          playerWords: ['cat', 'bat', 'rat'],
          playerWordData: [{ word: 'cat', comboBonus: 0 }, { word: 'bat', comboBonus: 0 }, { word: 'rat', comboBonus: 0 }],
        })}>End Game</button>
        <button onClick={onQuit}>Quit</button>
      </div>
    );
  };
});

// --- Mock ChallengeResults ---
jest.mock('../ChallengeResults', () => {
  return function MockChallengeResults({ onPlayAgain, onBackToHome }: { onPlayAgain: () => void; onBackToHome: () => void }) {
    return (
      <div data-testid="challenge-results">
        <button onClick={onPlayAgain}>Play Again</button>
        <button onClick={onBackToHome}>Back to Home</button>
      </div>
    );
  };
});

// --- Mock PageLoader ---
jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text: string }) => <div data-testid="page-loader">{text}</div>,
}));

// --- Mock framer-motion ---
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, onClick, className }: any) => <button onClick={onClick} className={className}>{children}</button>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<unknown>) => <>{children}</>,
}));

// --- Shared fixture ---
const mockChallenge = {
  id: 'challenge-id-1',
  challengeCode: 'TESTCODE',
  creatorUsername: 'Creator',
  creatorAvatarEmoji: '🏆',
  creatorAvatarColor: '#FF0000',
  creatorScore: 200,
  creatorWordCount: 5,
  creatorLongestWord: 'apple',
  gridSeed: 'ABCDEFGHIJKLMNOP',
  difficulty: 'medium',
  durationSeconds: 120,
  language: 'en',
  minWordLength: 3,
  totalAttempts: 10,
  totalBeaten: 4,
  expiresAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
};

const mockGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

describe('ChallengeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParseGridSeed.mockReturnValue(mockGrid);
    mockRecordChallengeAttempt.mockResolvedValue({
      beatCreator: true,
      scoreDifference: 50,
    });
  });

  describe('Loading state', () => {
    it('shows loading spinner while fetching challenge', async () => {
      // Given: getChallenge never resolves during this test
      mockGetChallenge.mockReturnValue(new Promise(() => {}));

      // When: rendered
      render(<ChallengeView challengeCode="TESTCODE" />);

      // Then: loading indicator is shown
      expect(screen.getByTestId('page-loader')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('shows error when challenge is not found', async () => {
      // Given: challenge not found
      mockGetChallenge.mockResolvedValue(null);

      // When: rendered
      render(<ChallengeView challengeCode="BADCODE" />);

      // Then: error message is displayed
      await waitFor(() => {
        expect(screen.queryByTestId('page-loader')).not.toBeInTheDocument();
      });
      expect(screen.getByText('challengeView.oops')).toBeInTheDocument();
      expect(screen.getByText('challengeView.notFoundOrExpired')).toBeInTheDocument();
    });

    it('shows error when challenge is expired', async () => {
      // Given: challenge is expired
      const expiredChallenge = {
        ...mockChallenge,
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
      };
      mockGetChallenge.mockResolvedValue(expiredChallenge);

      // When: rendered
      render(<ChallengeView challengeCode="EXPIRED" />);

      // Then: error message with expired text
      await waitFor(() => {
        expect(screen.getByText('challengeView.oops')).toBeInTheDocument();
      });
      expect(screen.getByText('challengeView.expired')).toBeInTheDocument();
    });

    it('back-to-home button navigates to language root', async () => {
      // Given: challenge not found
      mockGetChallenge.mockResolvedValue(null);
      render(<ChallengeView challengeCode="BADCODE" />);
      await waitFor(() => expect(screen.getByText('challengeView.oops')).toBeInTheDocument());

      // When: user clicks back to home
      userEvent.click(screen.getByText('challengeView.backToHome'));

      // Then: router navigates
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en'));
    });
  });

  describe('Intro state', () => {
    it('renders challenge intro screen after successful load', async () => {
      // Given: valid challenge
      mockGetChallenge.mockResolvedValue(mockChallenge);

      // When: rendered
      render(<ChallengeView challengeCode="TESTCODE" />);

      // Then: intro content is shown
      await waitFor(() => {
        expect(screen.getByText('challengeView.title')).toBeInTheDocument();
      });
      expect(screen.getByText('Creator')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('displays creator stats on intro screen', async () => {
      // Given: valid challenge with stats
      mockGetChallenge.mockResolvedValue(mockChallenge);
      render(<ChallengeView challengeCode="TESTCODE" />);

      // Then: attempts and beaten count shown
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // totalAttempts
        expect(screen.getByText('4')).toBeInTheDocument(); // totalBeaten
        expect(screen.getByText('40%')).toBeInTheDocument(); // win rate
      });
    });

    it('transitions to playing phase when start button is clicked', async () => {
      // Given: valid challenge loaded
      mockGetChallenge.mockResolvedValue(mockChallenge);
      render(<ChallengeView challengeCode="TESTCODE" />);
      await waitFor(() => expect(screen.getByText('challengeView.startChallenge')).toBeInTheDocument());

      // When: user clicks start
      await userEvent.click(screen.getByText('challengeView.startChallenge'));

      // Then: game component renders
      expect(screen.getByTestId('single-player-game')).toBeInTheDocument();
    });
  });

  describe('Playing state', () => {
    it('renders single player game with challenge settings', async () => {
      // Given: challenge loaded and started
      mockGetChallenge.mockResolvedValue(mockChallenge);
      render(<ChallengeView challengeCode="TESTCODE" />);
      await waitFor(() => expect(screen.getByText('challengeView.startChallenge')).toBeInTheDocument());
      await userEvent.click(screen.getByText('challengeView.startChallenge'));

      // Then: SinglePlayerGame is mounted
      expect(screen.getByTestId('single-player-game')).toBeInTheDocument();
    });

    it('transitions to results after game ends', async () => {
      // Given: challenge loaded and game started
      mockGetChallenge.mockResolvedValue(mockChallenge);
      render(<ChallengeView challengeCode="TESTCODE" />);
      await waitFor(() => expect(screen.getByText('challengeView.startChallenge')).toBeInTheDocument());
      await userEvent.click(screen.getByText('challengeView.startChallenge'));

      // When: game ends
      await userEvent.click(screen.getByText('End Game'));

      // Then: results screen is shown
      await waitFor(() => {
        expect(screen.getByTestId('challenge-results')).toBeInTheDocument();
      });
    });

    it('records attempt when game ends', async () => {
      // Given: challenge loaded and game started
      mockGetChallenge.mockResolvedValue(mockChallenge);
      render(<ChallengeView challengeCode="TESTCODE" />);
      await waitFor(() => expect(screen.getByText('challengeView.startChallenge')).toBeInTheDocument());
      await userEvent.click(screen.getByText('challengeView.startChallenge'));

      // When: game ends
      await userEvent.click(screen.getByText('End Game'));

      // Then: recordChallengeAttempt was called
      await waitFor(() => {
        expect(mockRecordChallengeAttempt).toHaveBeenCalledWith(
          expect.objectContaining({
            challengeId: 'challenge-id-1',
            score: 250,
            wordCount: 3,
          })
        );
      });
    });
  });

  describe('Results state', () => {
    async function renderToResults() {
      mockGetChallenge.mockResolvedValue(mockChallenge);
      render(<ChallengeView challengeCode="TESTCODE" />);
      await waitFor(() => expect(screen.getByText('challengeView.startChallenge')).toBeInTheDocument());
      await userEvent.click(screen.getByText('challengeView.startChallenge'));
      await userEvent.click(screen.getByText('End Game'));
      await waitFor(() => expect(screen.getByTestId('challenge-results')).toBeInTheDocument());
    }

    it('returns to intro when play again is clicked', async () => {
      // Given: results are shown
      await renderToResults();

      // When: user clicks play again
      await userEvent.click(screen.getByText('Play Again'));

      // Then: intro screen is shown again
      await waitFor(() => {
        expect(screen.getByText('challengeView.title')).toBeInTheDocument();
      });
    });
  });
});
