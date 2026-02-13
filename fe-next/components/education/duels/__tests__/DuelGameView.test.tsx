/**
 * DuelGameView Component Tests
 *
 * Tests for async duel gameplay screen
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DuelGameView } from '../DuelGameView';
import { getDuelById } from '@/lib/supabase/education/duels';
import { useDuelSocket, type DuelCompletedData, type ScoreSubmittedData } from '@/hooks/useDuelSocket';

// ============================================
// MOCKS
// ============================================

jest.mock('@/lib/supabase/education/duels');
jest.mock('@/hooks/useDuelSocket');
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'duels.loading': 'Loading...',
        'duels.playDuel': 'Play Duel',
        'duels.findWords': 'Find Words',
        'duels.submitScore': 'Submit Score',
        'duels.waitingForOpponent': 'Waiting for opponent...',
        'duels.youWin': 'You Win!',
        'duels.youLose': 'You Lose',
        'duels.draw': 'Draw!',
        'duels.xpEarned': 'XP Earned',
        'duels.backToLobby': 'Back to Lobby',
        'duels.wordsAccepted': 'Words Accepted',
        'duels.wordsRejected': 'Words Rejected',
        'duels.scoreToBeat': 'Score to Beat',
        'duels.typeWord': 'Type a word...',
        'duels.addWord': 'Add Word',
        'duels.vs': 'vs',
        'duels.you': 'You',
      };

      let result = translations[key] || key;
      if (params) {
        Object.keys(params).forEach((k) => {
          result = result.replace(`{${k}}`, String(params[k]));
        });
      }
      return result;
    },
    locale: 'en',
    dir: 'ltr',
  }),
}));

const mockGetDuelById = getDuelById as jest.MockedFunction<typeof getDuelById>;
const mockUseDuelSocket = useDuelSocket as jest.MockedFunction<typeof useDuelSocket>;

// ============================================
// TEST DATA
// ============================================

const mockBoardState = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'S'],
  ['R', 'A', 'T', 'S'],
  ['B', 'I', 'R', 'D'],
];

const mockDuelRow = {
  id: 'duel-123',
  classroom_id: 'class-1',
  challenger_id: 'student-1',
  opponent_id: 'student-2',
  lesson_id: 'lesson-1',
  duel_type: 'async' as const,
  status: 'active' as const,
  board_state: mockBoardState,
  challenger_score: 0,
  opponent_score: 0,
  winner_id: null,
  xp_awarded: false,
  created_at: '2026-02-13T10:00:00Z',
  started_at: '2026-02-13T10:05:00Z',
  completed_at: null,
  expires_at: '2026-02-14T10:00:00Z',
  challenger: {
    id: 'student-1',
    display_name: 'Alice',
    avatar_url: null,
  },
  opponent: {
    id: 'student-2',
    display_name: 'Bob',
    avatar_url: null,
  },
};

// ============================================
// TEST SUITE
// ============================================

describe('DuelGameView', () => {
  let mockSubmitScore: jest.Mock;
  let mockOnDuelCompleted: jest.Mock;
  let mockOnScoreSubmitted: jest.Mock;
  let mockOnError: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup socket hook mocks
    mockSubmitScore = jest.fn();
    mockOnDuelCompleted = jest.fn((cb) => {
      // Store callback for later invocation
      mockOnDuelCompleted.callback = cb;
      return jest.fn(); // cleanup function
    });
    mockOnScoreSubmitted = jest.fn((cb) => {
      mockOnScoreSubmitted.callback = cb;
      return jest.fn();
    });
    mockOnError = jest.fn((cb) => {
      mockOnError.callback = cb;
      return jest.fn();
    });

    mockUseDuelSocket.mockReturnValue({
      socket: {} as any,
      isConnected: true,
      joinLobby: jest.fn(),
      leaveLobby: jest.fn(),
      createChallenge: jest.fn(),
      acceptChallenge: jest.fn(),
      declineChallenge: jest.fn(),
      cancelChallenge: jest.fn(),
      submitScore: mockSubmitScore,
      onChallengeReceived: jest.fn(),
      onLobbyUpdate: jest.fn(),
      onDuelAccepted: jest.fn(),
      onDuelDeclined: jest.fn(),
      onDuelCompleted: mockOnDuelCompleted,
      onScoreSubmitted: mockOnScoreSubmitted,
      onError: mockOnError,
    });
  });

  describe('Initial Loading', () => {
    it('should render loading state initially', () => {
      mockGetDuelById.mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should fetch duel data on mount', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(mockGetDuelById).toHaveBeenCalledWith('duel-123');
      });
    });
  });

  describe('Board Rendering', () => {
    it('should render frozen board grid from board_state', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Play Duel')).toBeInTheDocument();
      });

      // Check board grid is rendered
      const boardGrid = screen.getByTestId('duel-board-grid');
      expect(boardGrid).toBeInTheDocument();

      // Check specific letters by index
      expect(screen.getByTestId('board-letter-0')).toHaveTextContent('C');
      expect(screen.getByTestId('board-letter-1')).toHaveTextContent('A');
      expect(screen.getByTestId('board-letter-4')).toHaveTextContent('D');
      expect(screen.getByTestId('board-letter-5')).toHaveTextContent('O');
    });

    it('should display opponent info in header', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });
    });
  });

  describe('Word Submission', () => {
    it('should allow typing and adding words', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type a word...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Type a word...');
      const addButton = screen.getByText('Add Word');

      // Type a word
      fireEvent.change(input, { target: { value: 'CAT' } });
      expect(input).toHaveValue('CAT');

      // Add word
      fireEvent.click(addButton);

      // Word should appear in found words list
      expect(screen.getByText('CAT')).toBeInTheDocument();

      // Input should be cleared
      expect(input).toHaveValue('');
    });

    it('should submit score with accumulated words', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type a word...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Type a word...');
      const addButton = screen.getByText('Add Word');

      // Add multiple words
      fireEvent.change(input, { target: { value: 'CAT' } });
      fireEvent.click(addButton);

      fireEvent.change(input, { target: { value: 'DOG' } });
      fireEvent.click(addButton);

      // Submit score
      const submitButton = screen.getByText('Submit Score');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitScore).toHaveBeenCalledWith('duel-123', ['CAT', 'DOG']);
      });
    });
  });

  describe('Score Submission Feedback', () => {
    it('should show validated score when duel:score-submitted received', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(mockOnScoreSubmitted).toHaveBeenCalled();
      });

      // Simulate score submitted event
      const scoreData: ScoreSubmittedData = {
        playerId: 'student-1',
        score: 150,
        wordsValidated: 8,
        wordsRejected: 2,
      };

      mockOnScoreSubmitted.callback(scoreData);

      await waitFor(() => {
        expect(screen.getByText('Words Accepted')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('Words Rejected')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Duel Completion', () => {
    it('should show win results when duel:completed received and student won', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(mockOnDuelCompleted).toHaveBeenCalled();
      });

      // Simulate duel completed event (student wins)
      const completedData: DuelCompletedData = {
        winnerId: 'student-1',
        challengerScore: 150,
        opponentScore: 120,
        xpAwarded: { winner: 100, loser: 60 },
      };

      mockOnDuelCompleted.callback(completedData);

      await waitFor(() => {
        expect(screen.getByText('You Win!')).toBeInTheDocument();
        expect(screen.getByText(/100/)).toBeInTheDocument(); // XP awarded
      });
    });

    it('should show loss results when duel:completed received and student lost', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(mockOnDuelCompleted).toHaveBeenCalled();
      });

      // Simulate duel completed event (student loses)
      const completedData: DuelCompletedData = {
        winnerId: 'student-2',
        challengerScore: 120,
        opponentScore: 150,
        xpAwarded: { winner: 100, loser: 60 },
      };

      mockOnDuelCompleted.callback(completedData);

      await waitFor(() => {
        expect(screen.getByText('You Lose')).toBeInTheDocument();
        expect(screen.getByText(/60/)).toBeInTheDocument(); // XP awarded
      });
    });

    it('should show draw results when duel:completed received with no winner', async () => {
      mockGetDuelById.mockResolvedValue({
        data: mockDuelRow,
        error: null,
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        expect(mockOnDuelCompleted).toHaveBeenCalled();
      });

      // Simulate duel completed event (draw)
      const completedData: DuelCompletedData = {
        winnerId: null,
        challengerScore: 150,
        opponentScore: 150,
        xpAwarded: { winner: 80, loser: 80 },
      };

      mockOnDuelCompleted.callback(completedData);

      await waitFor(() => {
        expect(screen.getByText('Draw!')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error when fetching duel fails', async () => {
      mockGetDuelById.mockResolvedValue({
        data: null,
        error: { message: 'Duel not found' },
      });

      render(<DuelGameView duelId="duel-123" studentId="student-1" />);

      await waitFor(() => {
        const errorElement = screen.getByTestId('duel-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent('Duel not found');
      });
    });
  });
});
