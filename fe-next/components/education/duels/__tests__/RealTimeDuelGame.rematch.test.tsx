// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RealTimeDuelGame } from '../RealTimeDuelGame';
import { useDuelSocket } from '@/hooks/useDuelSocket';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/hooks/useDuelSocket');
vi.mock('@/hooks/useSafeTimeout', () => ({
  useInterval: vi.fn(),
}));
vi.mock('framer-motion', () => ({
  m: {
    div: Object.assign(
      React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
        return <div ref={ref} {...props}>{children}</div>;
      }),
      { displayName: 'm.div' }
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/components/ui/Loader', () => ({
  Loader: () => <div data-testid="loader" />,
}));
vi.mock('../OpponentProgressBar', () => ({
  OpponentProgressBar: () => <div data-testid="progress-bar" />,
}));
vi.mock('../DuelDisconnectOverlay', () => ({
  DuelDisconnectOverlay: () => <div data-testid="disconnect-overlay" />,
}));
vi.mock('../ForfeitConfirmDialog', () => ({
  ForfeitConfirmDialog: () => <div data-testid="forfeit-dialog" />,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'duels.waitingForOpponent': 'Waiting for opponent...',
        'duels.youWin': 'You Win!',
        'duels.youLose': 'You Lose!',
        'duels.draw': 'Draw!',
        'duels.you': 'You',
        'duels.xpEarned': 'XP Earned',
        'duels.backToLobby': 'Back to Lobby',
        'education.duels.rematch': 'Rematch',
        'education.duels.rematchSent': 'Waiting for them...',
      };
      return translations[key] || key;
    },
  }),
}));

describe('RealTimeDuelGame — rematch', () => {
  const mockEmit = vi.fn();
  let completedCallback: ((data: any) => void) | null = null;
  let createdCallback: ((data: any) => void) | null = null;
  let errorCallback: ((data: any) => void) | null = null;

  const defaultProps = {
    duelId: 'duel-1',
    studentId: 'student-1',
    opponentName: 'Opponent',
    opponentId: 'opponent-1',
    lessonId: 'lesson-1',
    onBackToLobby: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    completedCallback = null;
    createdCallback = null;
    errorCallback = null;
    (useDuelSocket as any).mockReturnValue({
      socket: { emit: mockEmit },
      isConnected: true,
      connectionStatus: 'connected',
      submitWord: vi.fn(),
      forfeitDuel: vi.fn(),
      onDuelStarted: vi.fn(() => () => {}),
      onWordAccepted: vi.fn(() => () => {}),
      onWordRejected: vi.fn(() => () => {}),
      onOpponentProgress: vi.fn(() => () => {}),
      onOpponentDisconnected: vi.fn(() => () => {}),
      onOpponentReconnected: vi.fn(() => () => {}),
      onDuelCompleted: vi.fn((cb) => {
        completedCallback = cb;
        return () => {};
      }),
      onDuelCreated: vi.fn((cb) => {
        createdCallback = cb;
        return () => {};
      }),
      onError: vi.fn((cb) => {
        errorCallback = cb;
        return () => {};
      }),
    });
  });

  it('shows Rematch button in completed phase', async () => {
    render(<RealTimeDuelGame {...defaultProps} />);

    // Trigger completed phase
    act(() => {
      completedCallback?.({
        winnerId: 'student-1',
        challengerScore: 100,
        opponentScore: 50,
        xpAwarded: { winner: 20, loser: 10 },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Rematch')).toBeInTheDocument();
    });
  });

  it('emits duel:rematch on Rematch button click', async () => {
    render(<RealTimeDuelGame {...defaultProps} />);

    act(() => {
      completedCallback?.({
        winnerId: 'student-1',
        challengerScore: 100,
        opponentScore: 50,
        xpAwarded: { winner: 20, loser: 10 },
      });
    });

    await waitFor(() => {
      const rematchBtn = screen.getByText('Rematch');
      fireEvent.click(rematchBtn);
    });

    expect(mockEmit).toHaveBeenCalledWith('duel:rematch', {
      opponentId: 'opponent-1',
      lessonId: 'lesson-1',
    });
  });
});

describe('RealTimeDuelGame — rematch destination', () => {
  const mockEmit = vi.fn();
  let completedCallback: ((data: any) => void) | null = null;
  let createdCallback: ((data: any) => void) | null = null;
  let errorCallback: ((data: any) => void) | null = null;

  const defaultProps = {
    duelId: 'duel-1',
    studentId: 'student-1',
    opponentName: 'Opponent',
    opponentId: 'opponent-1',
    lessonId: 'lesson-1',
    onBackToLobby: vi.fn(),
  };

  const complete = () =>
    act(() => {
      completedCallback?.({
        winnerId: 'student-1',
        challengerScore: 100,
        opponentScore: 50,
        xpAwarded: { winner: 20, loser: 10 },
      });
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    completedCallback = null;
    createdCallback = null;
    errorCallback = null;
    (useDuelSocket as any).mockReturnValue({
      socket: { emit: mockEmit },
      isConnected: true,
      connectionStatus: 'connected',
      submitWord: vi.fn(),
      forfeitDuel: vi.fn(),
      onDuelStarted: vi.fn(() => () => {}),
      onWordAccepted: vi.fn(() => () => {}),
      onWordRejected: vi.fn(() => () => {}),
      onOpponentProgress: vi.fn(() => () => {}),
      onOpponentDisconnected: vi.fn(() => () => {}),
      onOpponentReconnected: vi.fn(() => () => {}),
      onDuelCompleted: vi.fn((cb) => {
        completedCallback = cb;
        return () => {};
      }),
      onDuelCreated: vi.fn((cb) => {
        createdCallback = cb;
        return () => {};
      }),
      onError: vi.fn((cb) => {
        errorCallback = cb;
        return () => {};
      }),
    });
  });

  // The server answers duel:rematch with duel:created carrying a NEW duelId.
  // Without this listener the button emitted into the void and the student sat
  // on the reveal screen forever (recurring-pitfalls Class 4).
  it('navigates to the duel the server created', async () => {
    render(<RealTimeDuelGame {...defaultProps} />);
    complete();

    await waitFor(() => fireEvent.click(screen.getByTestId('duel-rematch-btn')));

    act(() => {
      createdCallback?.({ duelId: 'duel-2' });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/education/duels/duel-2');
    });
  });

  it('shows a waiting state on the button until the server answers', async () => {
    render(<RealTimeDuelGame {...defaultProps} />);
    complete();

    await waitFor(() => fireEvent.click(screen.getByTestId('duel-rematch-btn')));

    expect(screen.getByTestId('duel-rematch-btn')).toHaveAttribute('data-pending', 'true');
  });

  // A rejected rematch (rate limit, lesson gone) must not leave a dead button.
  it('re-enables the button when the server rejects the rematch', async () => {
    render(<RealTimeDuelGame {...defaultProps} />);
    complete();

    await waitFor(() => fireEvent.click(screen.getByTestId('duel-rematch-btn')));

    act(() => {
      errorCallback?.({ message: 'Rate limited' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('duel-rematch-btn')).toHaveAttribute('data-pending', 'false');
    });
  });

  // A duel:created that arrives without anyone pressing REMATCH (the opponent
  // pressed theirs) must not yank this student off their own reveal screen.
  it('ignores duel:created when this student did not ask for a rematch', async () => {
    render(<RealTimeDuelGame {...defaultProps} />);
    complete();

    await waitFor(() => expect(screen.getByTestId('duel-rematch-btn')).toBeInTheDocument());

    act(() => {
      createdCallback?.({ duelId: 'duel-99' });
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('RealTimeDuelGame — a new duel is a clean slate', () => {
  const mockEmit = vi.fn();
  let completedCallback: ((data: any) => void) | null = null;

  const defaultProps = {
    duelId: 'duel-1',
    studentId: 'student-1',
    opponentName: 'Opponent',
    opponentId: 'opponent-1',
    lessonId: 'lesson-1',
    onBackToLobby: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    completedCallback = null;
    (useDuelSocket as any).mockReturnValue({
      socket: { emit: mockEmit },
      isConnected: true,
      connectionStatus: 'connected',
      submitWord: vi.fn(),
      forfeitDuel: vi.fn(),
      onDuelStarted: vi.fn(() => () => {}),
      onWordAccepted: vi.fn(() => () => {}),
      onWordRejected: vi.fn(() => () => {}),
      onOpponentProgress: vi.fn(() => () => {}),
      onOpponentDisconnected: vi.fn(() => () => {}),
      onOpponentReconnected: vi.fn(() => () => {}),
      onDuelCompleted: vi.fn((cb) => {
        completedCallback = cb;
        return () => {};
      }),
      onDuelCreated: vi.fn(() => () => {}),
      onError: vi.fn(() => () => {}),
    });
  });

  // Rematch stays inside one route segment, so React reuses the instance.
  // If the completed result survived, game 2 would open on game 1's podium and
  // the best-of-3 tally would never record another game (Class 2).
  it('returns to the waiting phase when the duelId changes', async () => {
    const { rerender } = render(<RealTimeDuelGame {...defaultProps} />);

    act(() => {
      completedCallback?.({
        winnerId: 'student-1',
        challengerScore: 100,
        opponentScore: 50,
        xpAwarded: { winner: 20, loser: 10 },
      });
    });

    await waitFor(() => expect(screen.getByTestId('duel-reveal')).toBeInTheDocument());

    rerender(<RealTimeDuelGame {...defaultProps} duelId="duel-2" />);

    await waitFor(() => {
      expect(screen.queryByTestId('duel-reveal')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Waiting for opponent...')).toBeInTheDocument();
  });
});
