// @ts-nocheck
/**
 * The async lobby used to print `challengeFrom <raw uuid>` with two buttons and
 * nothing to do while waiting. It now renders a turn card with the score to
 * beat and a taunt sticker picker.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DuelLobby from '../DuelLobby';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { getPendingDuelsForStudent } from '@/lib/supabase/education/duels';

vi.mock('@/hooks/useDuelSocket');
vi.mock('@/lib/supabase/education/duels', () => ({
  getPendingDuelsForStudent: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, _f?: string, p?: Record<string, unknown>) =>
      p ? `${key} ${Object.values(p).join(' ')}` : key,
  }),
}));
vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockSendTaunt = vi.fn();

const props = {
  classroomId: 'classroom-1',
  studentId: 'student-1',
  lessons: [{ id: 'lesson-1', name: 'Unit 3 verbs' }],
  opponentNames: { 'challenger-1': 'Maya' },
};

function pending(overrides = {}) {
  return {
    data: [
      {
        id: 'duel-1',
        challenger_id: 'challenger-1',
        lesson_id: 'lesson-1',
        challenger_score: 340,
        created_at: new Date().toISOString(),
        ...overrides,
      },
    ],
    error: null,
  };
}

describe('DuelLobby — async turn card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useDuelSocket.mockReturnValue({
      joinLobby: vi.fn(),
      leaveLobby: vi.fn(),
      acceptChallenge: vi.fn(),
      declineChallenge: vi.fn(),
      sendTaunt: mockSendTaunt,
      onLobbyUpdate: vi.fn(() => () => {}),
      onChallengeReceived: vi.fn(() => () => {}),
      onTauntReceived: vi.fn(() => () => {}),
    });
    getPendingDuelsForStudent.mockResolvedValue(pending());
  });

  it('renders a turn card instead of a raw id row', async () => {
    render(<DuelLobby {...props} />);

    await waitFor(() => expect(screen.getByTestId('duel-turn-card')).toBeInTheDocument());
    expect(screen.getByTestId('duel-turn-target')).toHaveTextContent('340');
    expect(screen.getByText(/Maya/)).toBeInTheDocument();
    expect(screen.queryByText(/challenger-1/)).not.toBeInTheDocument();
  });

  it('names the lesson rather than an id', async () => {
    render(<DuelLobby {...props} />);
    await waitFor(() => expect(screen.getByText('Unit 3 verbs')).toBeInTheDocument());
  });

  it('sends a taunt over the socket and remembers it', async () => {
    render(<DuelLobby {...props} />);
    await waitFor(() => screen.getByTestId('duel-turn-card'));

    fireEvent.click(screen.getAllByTestId('duel-taunt-option')[0]);

    expect(mockSendTaunt).toHaveBeenCalledWith('duel-1', 'fire');
    await waitFor(() => {
      const fire = screen
        .getAllByTestId('duel-taunt-option')
        .find((o) => o.getAttribute('data-taunt') === 'fire');
      expect(fire).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('survives a socket that predates taunts', async () => {
    useDuelSocket.mockReturnValue({
      joinLobby: vi.fn(),
      leaveLobby: vi.fn(),
      acceptChallenge: vi.fn(),
      declineChallenge: vi.fn(),
      onLobbyUpdate: vi.fn(() => () => {}),
      onChallengeReceived: vi.fn(() => () => {}),
    });

    render(<DuelLobby {...props} />);
    await waitFor(() => screen.getByTestId('duel-turn-card'));

    expect(() =>
      fireEvent.click(screen.getAllByTestId('duel-taunt-option')[0])
    ).not.toThrow();
  });
});
