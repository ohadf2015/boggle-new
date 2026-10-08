/**
 * HostInGameView — the gridless beta modes (word-tower, crossword) must still
 * mount the stop-game confirmation their exit button opens.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HostInGameView from '../HostInGameView';
import type { Socket } from 'socket.io-client';

const mode = vi.hoisted(() => ({ value: 'word-tower' as string }));

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
  useGameMode: () => mode.value,
  useGameModeConfirmed: () => true,
  useGameStore: (sel: (s: { setBlastBoardClearedByLocal: () => void }) => unknown) => sel({ setBlastBoardClearedByLocal: () => {} }),
}));

vi.mock('@/lib/multiplayer/usePendingWords', () => ({
  usePendingWords: () => ({ pendingWords: new Map(), enqueuePending: vi.fn(), confirmPending: vi.fn(), rejectPending: vi.fn(), dismissPending: vi.fn(), clearAll: vi.fn(), isPending: vi.fn().mockReturnValue(false) }),
}));
vi.mock('@/lib/multiplayer/useReconnectFlow', () => ({
  useReconnectFlow: () => ({ isReconnecting: false, reconnectAttempt: 0, maxReconnectAttempts: 30, showAbortModal: false, lastServerSeq: 0, triggerAbort: vi.fn(), dismissAbortModal: vi.fn() }),
}));
vi.mock('@/components/education/vocabQuiz/VocabQuizHostView', () => ({ VocabQuizHostView: () => null })); // eager next/dynamic mock: never load the quiz chain here
vi.mock('@/components/wordTower/WordTowerVersus', () => ({
  WordTowerVersus: ({ onQuit }: { onQuit?: () => void }) => <button data-testid="stop-game-btn" onClick={onQuit}>exit</button>,
}));
vi.mock('@/components/multiplayer/crossword/CrosswordVersus', () => ({
  CrosswordVersus: ({ onQuit }: { onQuit?: () => void }) => <button data-testid="stop-game-btn" onClick={onQuit}>exit</button>,
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

describe.each(['word-tower', 'crossword'])('HostInGameView — %s stop confirm', (m) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mode.value = m;
  });

  it('exit opens the confirmation, and confirming stops the game', async () => {
    const onStopGame = vi.fn();
    render(<HostInGameView {...defaultProps} onStopGame={onStopGame} />);
    fireEvent.click(await screen.findByTestId('stop-game-btn'));
    expect(onStopGame).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('mp.stopGameYes'));
    expect(onStopGame).toHaveBeenCalledOnce();
  });
});
