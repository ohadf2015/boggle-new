import { vi, type Mock, } from 'vitest';
/**
 * Test: PlayerInGameView passes initialTileStates and blastSeed to BlastGame
 *
 * Verifies that the multiplayer bridge values flow through to BlastGame
 * so all players get the same board state.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/dynamic to render mocked components synchronously in tests
// Live Vocab Quiz view is dynamic()-loaded; the eager next/dynamic mock below
// would leave its import chain in flight past environment teardown.
vi.mock('@/components/education/vocabQuiz/VocabQuizView', () => ({ VocabQuizView: () => null }));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<any>, _opts?: any) => {
    let Comp: any = null;
    const promise = importFn();
    promise.then((mod: any) => { Comp = mod.default ?? mod; });
    const Wrapper = (props: any) => (Comp ? Comp(props) : null);
    Wrapper.displayName = 'DynamicWrapper';
    return Wrapper;
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { total_games: 5 } }),
}));

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'blast',
  useGameModeConfirmed: () => true,
  useBlastTileOverlay: () => [],
  useBlastMovesUsed: () => 0,
  useWordHuntTargetLength: () => 0,
  useWordHuntMyLife: () => 3,
  useWordHuntTargetAttempts: () => [],
  useWordHuntTargetFound: () => false,
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
  useGameStore: (selector: (s: any) => any) => selector({ gameDuration: 120 }),
}));

vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="in-game-screen" />,
}));

// Capture the props passed to BlastGame
let capturedBlastGameProps: any = null;
vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: (props: any) => {
    capturedBlastGameProps = props;
    return <div data-testid="blast-game" />;
  },
}));

// Mock useBlastMultiplayerBridge with controlled return values
const mockBridgeReturn = {
  config: { gridSize: 4, specialTileChance: 0.15, language: 'en', difficulty: 'medium' },
  initialTileStates: [
    [
      { row: 0, col: 0, type: 'gold', isCleared: false, activationEffect: null, hitsRemaining: 1 },
      { row: 0, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 1 },
    ],
    [
      { row: 1, col: 0, type: 'bomb', isCleared: false, activationEffect: null, hitsRemaining: 1 },
      { row: 1, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 1 },
    ],
  ],
  blastSeed: 12345,
};

vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => mockBridgeReturn,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  AlertDialogCancel: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));
vi.mock('@/components/TournamentStandings', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/wordhunt/WordHuntGame', () => ({
  WordHuntGame: () => <div data-testid="word-hunt-game" />,
}));
vi.mock('@/components/multiplayer/WheelRushView', () => ({
  WheelRushView: () => <div data-testid="wheel-rush-view" />,
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

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

import PlayerInGameView from '../PlayerInGameView';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseProps = {
  username: 'testplayer',
  gameCode: 'ABCD',
  t: (key: string) => key,
  dir: 'ltr' as const,
  socket: null as any,
  letterGrid: [['A', 'B'], ['C', 'D']],
  shufflingGrid: null,
  gameActive: true,
  showStartAnimation: false,
  remainingTime: 60,
  gameLanguage: 'en' as const,
  minWordLength: 3,
  comboLevel: 0,
  comboLevelRef: { current: 0 },
  foundWords: [],
  leaderboard: [],
  tournamentData: null,
  tournamentStandings: [],
  showTournamentStandings: false,
  setShowTournamentStandings: vi.fn(),
  showExitConfirm: false,
  setShowExitConfirm: vi.fn(),
  onExitRoom: vi.fn(),
  onConfirmExit: vi.fn(),
  onWordSubmit: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlayerInGameView blast board sync', () => {
  beforeEach(() => {
    capturedBlastGameProps = null;
  });

  it('should pass initialTileStates from bridge to BlastGame', () => {
    render(<PlayerInGameView {...baseProps} />);

    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
    expect(capturedBlastGameProps).not.toBeNull();
    expect(capturedBlastGameProps.initialTileStates).toBe(mockBridgeReturn.initialTileStates);
  });

  it('should pass blastSeed from bridge to BlastGame', () => {
    render(<PlayerInGameView {...baseProps} />);

    expect(capturedBlastGameProps).not.toBeNull();
    expect(capturedBlastGameProps.blastSeed).toBe(12345);
  });
});
