// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DuelLobby from '../DuelLobby';
import { useDuelSocket, type OpponentInfo, type ChallengeReceivedData } from '@/hooks/useDuelSocket';
import { getPendingDuelsForStudent } from '@/lib/supabase/education/duels';

// Mock dependencies
vi.mock('@/hooks/useDuelSocket');
vi.mock('@/lib/supabase/education/duels', () => ({
  getPendingDuelsForStudent: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        duelLobbyTitle: 'Duel Lobby',
        pendingChallenges: 'Pending Challenges',
        availableOpponents: 'Available Opponents',
        quickMatch: 'Quick Match',
        accept: 'Accept',
        decline: 'Decline',
        noPendingChallenges: 'No pending challenges',
        noOpponentsOnline: 'No opponents online',
        'education.duels.noClassmatesOnline': 'No classmates are online right now',
        'education.duels.challengeSomeone': 'Challenge someone!',
        challengeFrom: 'Challenge from {name}',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    },
  }),
}));

describe('DuelLobby', () => {
  const mockJoinLobby = vi.fn();
  const mockLeaveLobby = vi.fn();
  const mockAcceptChallenge = vi.fn();
  const mockDeclineChallenge = vi.fn();
  const mockOnLobbyUpdate = vi.fn((cb) => () => {});
  const mockOnChallengeReceived = vi.fn((cb) => () => {});

  const defaultProps = {
    classroomId: 'classroom-1',
    studentId: 'student-1',
    lessons: [
      { id: 'lesson-1', name: 'Lesson 1' },
      { id: 'lesson-2', name: 'Lesson 2' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useDuelSocket as jest.Mock).mockReturnValue({
      socket: {},
      isConnected: true,
      joinLobby: mockJoinLobby,
      leaveLobby: mockLeaveLobby,
      acceptChallenge: mockAcceptChallenge,
      declineChallenge: mockDeclineChallenge,
      onLobbyUpdate: mockOnLobbyUpdate,
      onChallengeReceived: mockOnChallengeReceived,
    });


    getPendingDuelsForStudent.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  describe('lobby lifecycle', () => {
    it('joins lobby on mount', () => {
      render(<DuelLobby {...defaultProps} />);

      expect(mockJoinLobby).toHaveBeenCalledWith('classroom-1');
    });

    it('leaves lobby on unmount', () => {
      const { unmount } = render(<DuelLobby {...defaultProps} />);

      unmount();

      expect(mockLeaveLobby).toHaveBeenCalledWith('classroom-1');
    });

    it('registers lobby update listener', () => {
      render(<DuelLobby {...defaultProps} />);

      expect(mockOnLobbyUpdate).toHaveBeenCalled();
    });

    it('registers challenge received listener', () => {
      render(<DuelLobby {...defaultProps} />);

      expect(mockOnChallengeReceived).toHaveBeenCalled();
    });
  });

  describe('pending challenges section', () => {
    it('renders pending challenges when they exist', async () => {

      getPendingDuelsForStudent.mockResolvedValue({
        data: [
          {
            id: 'duel-1',
            challenger_id: 'challenger-1',
            lesson_id: 'lesson-1',
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      render(<DuelLobby {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Pending Challenges')).toBeInTheDocument();
      });
    });

    it('shows "no pending challenges" when empty', async () => {
      render(<DuelLobby {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No pending challenges')).toBeInTheDocument();
      });
    });

    it('calls acceptChallenge when Accept button clicked', async () => {

      getPendingDuelsForStudent.mockResolvedValue({
        data: [
          {
            id: 'duel-1',
            challenger_id: 'challenger-1',
            lesson_id: 'lesson-1',
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      render(<DuelLobby {...defaultProps} />);

      await waitFor(() => {
        const acceptButton = screen.getByText('Accept');
        fireEvent.click(acceptButton);

        expect(mockAcceptChallenge).toHaveBeenCalledWith('duel-1');
      });
    });

    it('calls declineChallenge when Decline button clicked', async () => {

      getPendingDuelsForStudent.mockResolvedValue({
        data: [
          {
            id: 'duel-1',
            challenger_id: 'challenger-1',
            lesson_id: 'lesson-1',
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      render(<DuelLobby {...defaultProps} />);

      await waitFor(() => {
        const declineButton = screen.getByText('Decline');
        fireEvent.click(declineButton);

        expect(mockDeclineChallenge).toHaveBeenCalledWith('duel-1');
      });
    });
  });

  describe('available opponents section', () => {
    it('renders available opponents from lobby updates', async () => {
      let updateCallback: ((data: any) => void) | null = null;
      mockOnLobbyUpdate.mockImplementation((cb) => {
        updateCallback = cb;
        return () => {};
      });

      render(<DuelLobby {...defaultProps} />);

      const opponents: OpponentInfo[] = [
        {
          userId: 'user-1',
          displayName: 'Player 1',
          avatarUrl: null,
        },
        {
          userId: 'user-2',
          displayName: 'Player 2',
          avatarUrl: null,
        },
      ];

      if (updateCallback) {
        updateCallback({ availableOpponents: opponents });
      }

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
        expect(screen.getByText('Player 2')).toBeInTheDocument();
      });
    });

    it('shows empty state message when no opponents', () => {
      render(<DuelLobby {...defaultProps} />);

      expect(screen.getByText('No classmates are online right now')).toBeInTheDocument();
    });

    it('opens challenge modal when opponent card clicked', async () => {
      let updateCallback: ((data: any) => void) | null = null;
      mockOnLobbyUpdate.mockImplementation((cb) => {
        updateCallback = cb;
        return () => {};
      });

      const { container } = render(<DuelLobby {...defaultProps} />);

      const opponents: OpponentInfo[] = [
        {
          userId: 'user-1',
          displayName: 'Player 1',
          avatarUrl: null,
        },
      ];

      if (updateCallback) {
        updateCallback({ availableOpponents: opponents });
      }

      // Wait for opponent to appear
      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      // Find the opponent button (it's in the Available Opponents section)
      const availableOpponentsSection = container.querySelector('section:last-of-type');
      const opponentButton = availableOpponentsSection?.querySelector('button');
      expect(opponentButton).toBeTruthy();

      if (opponentButton) {
        fireEvent.click(opponentButton);
      }

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId('duel-challenge-modal')).toBeInTheDocument();
      });
    });
  });

  describe('quick match feature', () => {
    it('renders Quick Match button', () => {
      render(<DuelLobby {...defaultProps} />);

      expect(screen.getByText('Quick Match')).toBeInTheDocument();
    });

    it('opens challenge modal with random opponent when clicked', async () => {
      let updateCallback: ((data: any) => void) | null = null;
      mockOnLobbyUpdate.mockImplementation((cb) => {
        updateCallback = cb;
        return () => {};
      });

      render(<DuelLobby {...defaultProps} />);

      const opponents: OpponentInfo[] = [
        {
          userId: 'user-1',
          displayName: 'Player 1',
          avatarUrl: null,
        },
      ];

      if (updateCallback) {
        updateCallback({ availableOpponents: opponents });
      }

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });

      const quickMatchButton = screen.getByText('Quick Match');
      fireEvent.click(quickMatchButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId('duel-challenge-modal')).toBeInTheDocument();
      });
    });

    it('does nothing when no opponents available', () => {
      render(<DuelLobby {...defaultProps} />);

      const quickMatchButton = screen.getByText('Quick Match');
      fireEvent.click(quickMatchButton);

      // Modal should not open (no "Challenge" title)
      expect(screen.queryByText(/Challenge Player/)).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows empty state when getPendingDuelsForStudent rejects', async () => {
      // RED: Before fix, this will hang with loading spinner. After fix, it should show empty state.
      getPendingDuelsForStudent.mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<DuelLobby {...defaultProps} />);

      // Wait for the rejection to settle
      await waitFor(() => {
        // The spinner should disappear after the error
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();

        // The "no pending challenges" message should appear instead
        expect(screen.getByText('No pending challenges')).toBeInTheDocument();
      });
    });
  });

  describe('neo-brutalist styling', () => {
    it('uses neo-brutalist design classes', () => {
      render(<DuelLobby {...defaultProps} />);

      const container = screen.getByTestId('duel-lobby-container');
      expect(container).toHaveClass('border-3');
      expect(container).toHaveClass('border-neo-black');
      expect(container).toHaveClass('shadow-hard-sm');
    });
  });
});
