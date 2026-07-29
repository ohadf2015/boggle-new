/**
 * Test: PlayerInGameView renders null until gameModeConfirmed is true.
 *
 * Prevents a one-frame classic-mode flash before the server confirms the
 * actual game mode. The host handler sets tableData (React useState) and
 * gameMode (Zustand) in separate calls, producing two renders; the first
 * has gameMode='classic' (initialState default) even for blast/wheel-rush rooms.
 */
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<any>, _opts?: any) => {
    let Comp: any = null;
    importFn().then((mod: any) => { Comp = mod.default ?? mod; });
    const Wrapper = (props: any) => (Comp ? Comp(props) : null);
    Wrapper.displayName = 'DynamicWrapper';
    return Wrapper;
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { total_games: 5 } }),
}));

const mockGameMode = { value: 'blast' as string };
const mockGameModeConfirmed = { value: false };

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => mockGameMode.value,
  useGameModeConfirmed: () => mockGameModeConfirmed.value,
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

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="in-game-screen" />,
}));

vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: () => <div data-testid="blast-game" />,
}));

vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({
    config: { gridSize: 4, specialTileChance: 0.15, language: 'en', difficulty: 'medium' },
    initialTileStates: null,
    blastSeed: 42,
  }),
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

import PlayerInGameView from '../PlayerInGameView';

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
  setShowTournamentStandings: vi.fn(),
  showExitConfirm: false,
  setShowExitConfirm: vi.fn(),
  onExitRoom: vi.fn(),
  onConfirmExit: vi.fn(),
  onWordSubmit: vi.fn(),
};

describe('PlayerInGameView gameModeConfirmed guard', () => {
  it('renders null when gameModeConfirmed is false (prevents classic flash)', () => {
    mockGameModeConfirmed.value = false;
    mockGameMode.value = 'blast';
    const { container } = render(<PlayerInGameView {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null for wheel-rush when gameModeConfirmed is false', () => {
    mockGameModeConfirmed.value = false;
    mockGameMode.value = 'wheel-rush';
    const { container } = render(<PlayerInGameView {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders blast game when gameModeConfirmed is true', () => {
    mockGameModeConfirmed.value = true;
    mockGameMode.value = 'blast';
    render(<PlayerInGameView {...baseProps} />);
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
    expect(screen.queryByTestId('in-game-screen')).not.toBeInTheDocument();
  });

  it('renders classic InGameScreen when gameModeConfirmed is true and mode is classic', () => {
    mockGameModeConfirmed.value = true;
    mockGameMode.value = 'classic';
    render(<PlayerInGameView {...baseProps} />);
    expect(screen.getByTestId('in-game-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-game')).not.toBeInTheDocument();
  });
});
