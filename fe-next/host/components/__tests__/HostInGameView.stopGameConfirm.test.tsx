/**
 * HostInGameView — game-end confirmation modal test
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HostInGameView from '../HostInGameView';
import type { Socket } from 'socket.io-client';

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  default: (fn: () => any) => {
    const LazyComponent = React.lazy(fn);
    return (props: any) => (
      <React.Suspense fallback={<div>Loading...</div>}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  },
}));

// Mock InGameScreen
vi.mock('@/components/game/InGameScreen', () => ({
  default: ({ onExitRoom }: { onExitRoom?: () => void }) => (
    <div data-testid="in-game-screen">
      <button data-testid="stop-game-btn" onClick={onExitRoom}>
        Stop Game
      </button>
    </div>
  ),
}));

// Mock useBlastMultiplayerBridge
vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({
    config: {},
    initialTileStates: [],
    blastSeed: 0,
    waveNumber: 1,
  }),
}));

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { total_games: 0 } }),
}));

// Mock useGameMode
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => undefined,
  useGameModeConfirmed: () => true,
  useGameStore: (sel: (s: { setBlastBoardClearedByLocal: () => void }) => unknown) => sel({ setBlastBoardClearedByLocal: () => {} }),
}));

vi.mock('@/lib/multiplayer/usePendingWords', () => ({
  usePendingWords: () => ({ pendingWords: new Map(), enqueuePending: vi.fn(), confirmPending: vi.fn(), rejectPending: vi.fn(), dismissPending: vi.fn(), clearAll: vi.fn(), isPending: vi.fn().mockReturnValue(false) }),
}));
vi.mock('@/lib/multiplayer/useReconnectFlow', () => ({
  useReconnectFlow: () => ({ isReconnecting: false, reconnectAttempt: 0, maxReconnectAttempts: 30, showAbortModal: false, lastServerSeq: 0, triggerAbort: vi.fn(), dismissAbortModal: vi.fn() }),
}));
vi.mock('@/components/multiplayer/PendingWordChip', () => ({ PendingWordChip: () => null }));
vi.mock('@/components/multiplayer/ReconnectingOverlay', () => ({ ReconnectingOverlay: () => null }));
vi.mock('@/components/multiplayer/MPGameAbortedModal', () => ({ MPGameAbortedModal: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useParams: () => ({ locale: 'en' }) }));

const mockT = (key: string, _params?: Record<string, string | number>) => key;

const defaultProps = {
  gameCode: 'TEST123',
  username: 'HostPlayer',
  roomLanguage: 'en' as const,
  t: mockT,
  tableData: [['A', 'B'], ['C', 'D']],
  remainingTime: 60,
  timerValue: 60,
  minWordLength: 3,
  comboLevel: 0,
  comboLevelRef: { current: 0 },
  hostPlaying: false,
  showStartAnimation: false,
  hostFoundWords: [],
  onWordSubmit: vi.fn(),
  playersReady: ['Player1', 'Player2'],
  playerScores: { Player1: 100, Player2: 50 },
  playerWordCounts: { Player1: 5, Player2: 3 },
  onStopGame: vi.fn(),
  socket: null as unknown as Socket,
};

describe('HostInGameView — game-end confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call onStopGame immediately when stop button clicked', () => {
    const onStopGame = vi.fn();
    render(
      <HostInGameView
        {...defaultProps}
        onStopGame={onStopGame}
      />
    );

    const stopBtn = screen.getByTestId('stop-game-btn');
    fireEvent.click(stopBtn);

    // onStopGame should NOT be called yet
    expect(onStopGame).not.toHaveBeenCalled();
  });

  it('shows confirmation modal when stop button clicked', () => {
    render(
      <HostInGameView
        {...defaultProps}
        onStopGame={vi.fn()}
      />
    );

    const stopBtn = screen.getByTestId('stop-game-btn');
    fireEvent.click(stopBtn);

    // Confirmation modal should appear
    expect(screen.getByText('mp.stopGameConfirm')).toBeInTheDocument();
    expect(screen.getByText('mp.stopGameYes')).toBeInTheDocument();
    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('calls onStopGame when confirming in modal', () => {
    const onStopGame = vi.fn();
    render(
      <HostInGameView
        {...defaultProps}
        onStopGame={onStopGame}
      />
    );

    // Open confirmation modal
    const stopBtn = screen.getByTestId('stop-game-btn');
    fireEvent.click(stopBtn);

    // Click "End Game" button
    const confirmBtn = screen.getByText('mp.stopGameYes');
    fireEvent.click(confirmBtn);

    // Now onStopGame should be called
    expect(onStopGame).toHaveBeenCalledOnce();
  });

  it('closes modal without calling onStopGame when cancelling', () => {
    const onStopGame = vi.fn();
    const { queryByText } = render(
      <HostInGameView
        {...defaultProps}
        onStopGame={onStopGame}
      />
    );

    // Open confirmation modal
    const stopBtn = screen.getByTestId('stop-game-btn');
    fireEvent.click(stopBtn);
    expect(queryByText('mp.stopGameConfirm')).toBeInTheDocument();

    // Click "Cancel" button
    const cancelBtn = screen.getByText('common.cancel');
    fireEvent.click(cancelBtn);

    // Modal should be gone, onStopGame not called
    expect(queryByText('mp.stopGameConfirm')).not.toBeInTheDocument();
    expect(onStopGame).not.toHaveBeenCalled();
  });
});
