// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DuelLobby from '../DuelLobby';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { getPendingDuelsForStudent } from '@/lib/supabase/education/duels';

vi.mock('@/hooks/useDuelSocket');
vi.mock('@/lib/supabase/education/duels', () => ({
  getPendingDuelsForStudent: vi.fn(),
}));

const mockOnTabChange = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string) => {
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
      };
      return translations[key] || key;
    },
  }),
}));

describe('DuelLobby — empty state improvements', () => {
  const defaultProps = {
    classroomId: 'classroom-1',
    studentId: 'student-1',
    lessons: [{ id: 'lesson-1', name: 'Lesson 1' }],
    onTabChange: mockOnTabChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useDuelSocket as any).mockReturnValue({
      socket: {},
      isConnected: true,
      connectionStatus: 'connected',
      joinLobby: vi.fn(),
      leaveLobby: vi.fn(),
      acceptChallenge: vi.fn(),
      declineChallenge: vi.fn(),
      onLobbyUpdate: vi.fn(() => () => {}),
      onChallengeReceived: vi.fn(() => () => {}),
    });
    getPendingDuelsForStudent.mockResolvedValue({ data: [], error: null });
  });

  it('shows friendly empty message when no opponents after loading', async () => {
    render(<DuelLobby {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No classmates are online right now')).toBeInTheDocument();
    });
  });

  it('shows "Challenge someone!" button that calls onTabChange', async () => {
    render(<DuelLobby {...defaultProps} />);

    await waitFor(() => {
      const challengeBtn = screen.getByText('Challenge someone!');
      expect(challengeBtn).toBeInTheDocument();
      fireEvent.click(challengeBtn);
      expect(mockOnTabChange).toHaveBeenCalledWith('classmates');
    });
  });
});
