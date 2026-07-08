import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RealTimeDuelGame } from '../RealTimeDuelGame';
import type {
  DuelStartedData,
  WordAcceptedData,
  WordRejectedData,
  OpponentProgressData,
  DuelCompletedData,
} from '@/hooks/useDuelSocket.types';

const { mockAwardGameCoins } = vi.hoisted(() => ({
  mockAwardGameCoins: vi.fn(),
}));

vi.mock('@/utils/coinManager', () => ({
  awardGameCoins: mockAwardGameCoins,
}));

// Mock useDuelSocket hook
const mockSubmitWord = vi.fn();
const mockForfeitDuel = vi.fn();
const mockSyncState = vi.fn();
let mockListeners: Record<string, Function> = {};

vi.mock('@/hooks/useDuelSocket', () => ({
  useDuelSocket: () => ({
    isConnected: true,
    submitWord: mockSubmitWord,
    forfeitDuel: mockForfeitDuel,
    syncState: mockSyncState,
    onDuelStarted: (cb: Function) => {
      mockListeners['duel:started'] = cb;
      return () => delete mockListeners['duel:started'];
    },
    onWordAccepted: (cb: Function) => {
      mockListeners['duel:word-accepted'] = cb;
      return () => delete mockListeners['duel:word-accepted'];
    },
    onWordRejected: (cb: Function) => {
      mockListeners['duel:word-rejected'] = cb;
      return () => delete mockListeners['duel:word-rejected'];
    },
    onOpponentProgress: (cb: Function) => {
      mockListeners['duel:opponent-progress'] = cb;
      return () => delete mockListeners['duel:opponent-progress'];
    },
    onOpponentDisconnected: (cb: Function) => {
      mockListeners['duel:opponent-disconnected'] = cb;
      return () => delete mockListeners['duel:opponent-disconnected'];
    },
    onOpponentReconnected: (cb: Function) => {
      mockListeners['duel:opponent-reconnected'] = cb;
      return () => delete mockListeners['duel:opponent-reconnected'];
    },
    onDuelCompleted: (cb: Function) => {
      mockListeners['duel:completed'] = cb;
      return () => delete mockListeners['duel:completed'];
    },
    onStateSynced: (cb: Function) => {
      mockListeners['duel:state-synced'] = cb;
      return () => delete mockListeners['duel:state-synced'];
    },
  }),
}));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

describe('RealTimeDuelGame', () => {
  beforeEach(() => {
    mockListeners = {};
    vi.clearAllMocks();
  });

  it('should render waiting phase initially', () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    expect(screen.getByTestId('realtime-duel-game')).toBeInTheDocument();
    expect(screen.getByText('duels.waitingForOpponent')).toBeInTheDocument();
  });

  it('should transition to playing when duel:started received', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    // Initially waiting
    expect(screen.getByText('duels.waitingForOpponent')).toBeInTheDocument();

    // Emit duel:started event
    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P'],
      ],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    // Should transition to playing
    await waitFor(() => {
      expect(screen.queryByText('duels.waitingForOpponent')).not.toBeInTheDocument();
      expect(screen.getByTestId('duel-timer')).toBeInTheDocument();
    });
  });

  it('should display board grid with letters', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P'],
      ],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();
    });
  });

  it('should handle word submission', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    await waitFor(() => {
      expect(screen.getByTestId('word-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('word-input');
    const submitBtn = screen.getByTestId('submit-word-btn');

    fireEvent.change(input, { target: { value: 'APPLE' } });
    fireEvent.click(submitBtn);

    expect(mockSubmitWord).toHaveBeenCalledWith('duel-123', 'APPLE');
  });

  it('should show accepted word with green status', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    await waitFor(() => screen.getByTestId('word-input'));

    const input = screen.getByTestId('word-input');
    fireEvent.change(input, { target: { value: 'APPLE' } });
    fireEvent.click(screen.getByTestId('submit-word-btn'));

    // Emit word-accepted event
    const acceptedData: WordAcceptedData = {
      word: 'APPLE',
      points: 10,
      totalScore: 10,
      wordCount: 1,
    };
    mockListeners['duel:word-accepted']?.(acceptedData);

    await waitFor(() => {
      expect(screen.getByText('APPLE')).toBeInTheDocument();
    });
  });

  it('should update opponent progress when received', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    await waitFor(() => screen.getByTestId('opponent-score'));

    // Initial opponent score should be 0
    expect(screen.getByTestId('opponent-score')).toHaveTextContent('0');

    // Emit opponent-progress event
    const progressData: OpponentProgressData = {
      opponentId: 'opponent-456',
      totalScore: 25,
      wordCount: 3,
    };
    mockListeners['duel:opponent-progress']?.(progressData);

    await waitFor(() => {
      expect(screen.getByTestId('opponent-score')).toHaveTextContent('25');
    });
  });

  it('should show disconnect overlay when opponent disconnects', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    await waitFor(() => screen.getByTestId('word-input'));

    // Emit opponent-disconnected event
    mockListeners['duel:opponent-disconnected']?.({
      opponentId: 'opponent-456',
      gracePeriodSeconds: 30,
    });

    await waitFor(() => {
      expect(screen.getByTestId('disconnect-overlay')).toBeInTheDocument();
    });
  });

  it('should open forfeit dialog when forfeit button clicked', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    await waitFor(() => screen.getByTestId('forfeit-btn'));

    fireEvent.click(screen.getByTestId('forfeit-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('should show results when duel completed', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    await waitFor(() => screen.getByTestId('word-input'));

    // Emit completed event
    const completedData: DuelCompletedData = {
      winnerId: 'student-123',
      challengerScore: 100,
      opponentScore: 75,
      xpAwarded: { winner: 50, loser: 30 },
    };
    mockListeners['duel:completed']?.(completedData);

    await waitFor(() => {
      expect(screen.getByText('duels.youWin')).toBeInTheDocument();
    });
  });

  it('should award coins when duel completes with rank based on winnerId', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);
    await waitFor(() => screen.getByTestId('word-input'));

    const completedData: DuelCompletedData = {
      winnerId: 'student-123',
      challengerScore: 100,
      opponentScore: 75,
      xpAwarded: { winner: 50, loser: 30 },
    };
    mockListeners['duel:completed']?.(completedData);

    await waitFor(() => {
      expect(mockAwardGameCoins).toHaveBeenCalledWith('duel-123', 'multiplayer', 100, 1, 2);
    });
  });

  it('should award coins with rank 2 when opponent wins', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-456"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-456',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);
    await waitFor(() => screen.getByTestId('word-input'));

    const completedData: DuelCompletedData = {
      winnerId: 'opponent-456',
      challengerScore: 50,
      opponentScore: 90,
      xpAwarded: { winner: 50, loser: 30 },
    };
    mockListeners['duel:completed']?.(completedData);

    await waitFor(() => {
      expect(mockAwardGameCoins).toHaveBeenCalledWith('duel-456', 'multiplayer', 50, 2, 2);
    });
  });

  it('submits a Hebrew word typed via IME composition (Android GBoard) — submit not stuck disabled', async () => {
    render(
      <RealTimeDuelGame
        duelId="duel-123"
        studentId="student-123"
        opponentName="Bob"
      />
    );

    const startData: DuelStartedData = {
      duelId: 'duel-123',
      boardState: [['A', 'B'], ['C', 'D']],
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-123', 'opponent-456'],
    };
    mockListeners['duel:started']?.(startData);

    await waitFor(() => screen.getByTestId('word-input'));

    const input = screen.getByTestId('word-input') as HTMLInputElement;
    const submitBtn = screen.getByTestId('submit-word-btn');

    // Before typing: submit is aria-disabled (not real `disabled`, so a tap can
    // still flush the IME composition buffer).
    expect(submitBtn).toHaveAttribute('aria-disabled', 'true');

    // Android GBoard Hebrew: composition buffers into the DOM value; onChange
    // may not fire until commit. The component must sync via compositionEnd.
    fireEvent.compositionStart(input);
    Object.defineProperty(input, 'value', { configurable: true, writable: true, value: 'שלום' });
    fireEvent.compositionEnd(input, { data: 'שלום' });

    expect(submitBtn).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(submitBtn);
    expect(mockSubmitWord).toHaveBeenCalledWith('duel-123', 'שלום');
  });
});
