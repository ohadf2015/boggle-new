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

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { total_games: 5 } }),
}));

jest.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'blast',
  useBlastTileOverlay: () => [],
  useBlastMovesUsed: () => 0,
  useWordHuntTargetLength: () => 0,
  useWordHuntMyLife: () => 3,
  useWordHuntTargetAttempts: () => [],
  useWordHuntTargetFound: () => false,
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
}));

jest.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="in-game-screen" />,
}));

// Capture the props passed to BlastGame
let capturedBlastGameProps: any = null;
jest.mock('@/components/blast/BlastGame', () => ({
  BlastGame: (props: any) => {
    capturedBlastGameProps = props;
    return <div data-testid="blast-game" />;
  },
}));

jest.mock('@/components/game/BlastMoveCounter', () => ({
  BlastMoveCounter: () => <div data-testid="blast-move-counter" />,
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

jest.mock('@/components/blast/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => mockBridgeReturn,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  AlertDialogCancel: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));
jest.mock('@/components/TournamentStandings', () => ({
  __esModule: true,
  default: () => null,
}));

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
  setShowTournamentStandings: jest.fn(),
  showExitConfirm: false,
  setShowExitConfirm: jest.fn(),
  onExitRoom: jest.fn(),
  onConfirmExit: jest.fn(),
  onWordSubmit: jest.fn(),
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
