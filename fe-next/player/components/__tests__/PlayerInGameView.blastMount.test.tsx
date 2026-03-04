/**
 * Test: PlayerInGameView renders BlastGame when gameMode === 'blast'
 *
 * Verifies that the blast multiplayer integration mounts BlastGame component
 * instead of InGameScreen when the game mode is 'blast'.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { total_games: 5 } }),
}));

// Mock the store selectors with controllable values
const mockGameMode = { value: 'blast' as string | null };
const mockBlastTileOverlay = { value: [{ row: 0, col: 0, type: 'gold' }] };
const mockWordHuntTargetLength = { value: 0 };
const mockWordHuntMyLife = { value: 3 };
const mockWordHuntTargetAttempts = { value: [] };
const mockWordHuntTargetFound = { value: false };

const mockBlastMovesUsed = { value: 7 };

jest.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => mockGameMode.value,
  useBlastTileOverlay: () => mockBlastTileOverlay.value,
  useBlastMovesUsed: () => mockBlastMovesUsed.value,
  useWordHuntTargetLength: () => mockWordHuntTargetLength.value,
  useWordHuntMyLife: () => mockWordHuntMyLife.value,
  useWordHuntTargetAttempts: () => mockWordHuntTargetAttempts.value,
  useWordHuntTargetFound: () => mockWordHuntTargetFound.value,
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
}));

// Mock InGameScreen — renders a testid so we can check if it's mounted
jest.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="in-game-screen" />,
}));

// Mock BlastGame — renders a testid so we can check if it's mounted
jest.mock('@/components/blast/BlastGame', () => ({
  BlastGame: (props: any) => <div data-testid="blast-game" data-mode={props.mode} />,
}));

// Mock BlastMoveCounter
jest.mock('@/components/game/BlastMoveCounter', () => ({
  BlastMoveCounter: (props: any) => <div data-testid="blast-move-counter">{props.movesUsed}</div>,
}));

// Mock useBlastMultiplayerBridge
jest.mock('@/components/blast/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({
    config: { gridSize: 4, specialTileChance: 0.15, language: 'en', difficulty: 'medium' },
    initialTileStates: null,
    blastSeed: 42,
  }),
}));

// Mock UI components
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
  socket: null,
  letterGrid: [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['I', 'J', 'K', 'L'], ['M', 'N', 'O', 'P']],
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

describe('PlayerInGameView blast mode mounting', () => {
  it('should render BlastGame with mode=multiplayer when gameMode is blast', () => {
    mockGameMode.value = 'blast';

    render(<PlayerInGameView {...baseProps} />);

    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
    expect(screen.getByTestId('blast-game')).toHaveAttribute('data-mode', 'multiplayer');
    expect(screen.queryByTestId('in-game-screen')).not.toBeInTheDocument();
  });

  it('should render InGameScreen when gameMode is not blast', () => {
    mockGameMode.value = 'classic';

    render(<PlayerInGameView {...baseProps} />);

    expect(screen.getByTestId('in-game-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-game')).not.toBeInTheDocument();
  });

  it('should render InGameScreen when gameMode is null', () => {
    mockGameMode.value = null;

    render(<PlayerInGameView {...baseProps} />);

    expect(screen.getByTestId('in-game-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-game')).not.toBeInTheDocument();
  });

  it('should render BlastMoveCounter in blast mode', () => {
    mockGameMode.value = 'blast';
    mockBlastMovesUsed.value = 7;

    render(<PlayerInGameView {...baseProps} />);

    expect(screen.getByTestId('blast-move-counter')).toBeInTheDocument();
    expect(screen.getByTestId('blast-move-counter')).toHaveTextContent('7');
  });

  it('should NOT render BlastMoveCounter in non-blast mode', () => {
    mockGameMode.value = 'classic';

    render(<PlayerInGameView {...baseProps} />);

    expect(screen.queryByTestId('blast-move-counter')).not.toBeInTheDocument();
  });
});
