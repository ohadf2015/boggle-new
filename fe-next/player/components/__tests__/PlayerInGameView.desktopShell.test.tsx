import { vi } from 'vitest';
/**
 * Test: PlayerInGameView wraps the mode canvas in the desktop shell when
 * useDesktopShellEnabled() is true, for the shell-supported grid modes.
 * Mirrors the mock scaffold of PlayerInGameView.blastMount.test.tsx.
 */
import { render, screen } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<any>) => {
    let Comp: any = null;
    importFn().then((mod: any) => { Comp = mod.default ?? mod; });
    const Wrapper = (props: any) => (Comp ? Comp(props) : null);
    Wrapper.displayName = 'DynamicWrapper';
    return Wrapper;
  },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: { total_games: 5 } }) }));

const mockGameMode = { value: 'classic' as string | null };
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => mockGameMode.value,
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

vi.mock('@/lib/utils', () => ({ cn: (...a: any[]) => a.filter(Boolean).join(' ') }));
vi.mock('@/components/game/InGameScreen', () => ({ __esModule: true, default: () => <div data-testid="in-game-screen" /> }));
vi.mock('@/components/blast/legacy/BlastGame', () => ({ BlastGame: () => <div data-testid="blast-game" /> }));
vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({ config: {}, initialTileStates: null, blastSeed: 42 }),
}));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...r }: any) => <button {...r}>{children}</button> }));
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
  AlertDialogAction: ({ children, ...r }: any) => <button {...r}>{children}</button>,
  AlertDialogCancel: ({ children, ...r }: any) => <button {...r}>{children}</button>,
}));
vi.mock('@/components/TournamentStandings', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/wordhunt/WordHuntGame', () => ({ WordHuntGame: () => <div data-testid="word-hunt-game" /> }));
vi.mock('@/components/multiplayer/WheelRushView', () => ({ WheelRushView: () => <div data-testid="wheel-rush-view" /> }));
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

// The unit under integration: shell gate + frame. Mock the frame so its deep
// adapter tree isn't pulled in; it simply emits [data-mp-shell] around the canvas.
const mockShellEnabled = { value: false };
vi.mock('@/hooks/useDesktopShellEnabled', () => ({
  useDesktopShellEnabled: () => mockShellEnabled.value,
}));
vi.mock('@/components/multiplayer/desktop/MpDesktopShellFrame', () => ({
  isShellMode: (m: string) => ['classic', 'blast', 'word-hunt', 'wheel-rush'].includes(m),
  MpDesktopShellFrame: (props: any) => (
    <div data-mp-shell data-game-mode={props.gameMode}>{props.canvas}</div>
  ),
}));

import PlayerInGameView from '../PlayerInGameView';

const baseProps = {
  username: 'p1',
  gameCode: 'ABCD',
  t: (k: string) => k,
  dir: 'ltr' as const,
  socket: null,
  letterGrid: [['A', 'B'], ['C', 'D']],
  shufflingGrid: null,
  gameActive: true,
  showStartAnimation: false,
  remainingTime: 60,
  totalTime: 120,
  gameLanguage: 'en' as const,
  minWordLength: 2,
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

describe('PlayerInGameView desktop shell wiring', () => {
  it('classic: wraps canvas in shell when desktop shell enabled', () => {
    mockShellEnabled.value = true;
    mockGameMode.value = 'classic';
    render(<PlayerInGameView {...baseProps} />);
    const shell = document.querySelector('[data-mp-shell]');
    expect(shell).toBeInTheDocument();
    expect(shell?.getAttribute('data-game-mode')).toBe('classic');
    // canvas is inside the shell
    expect(screen.getByTestId('in-game-screen')).toBeInTheDocument();
  });

  it('classic: renders bare canvas (no shell) when disabled', () => {
    mockShellEnabled.value = false;
    mockGameMode.value = 'classic';
    render(<PlayerInGameView {...baseProps} />);
    expect(document.querySelector('[data-mp-shell]')).not.toBeInTheDocument();
    expect(screen.getByTestId('in-game-screen')).toBeInTheDocument();
  });

  it('blast: wraps canvas in shell when enabled', () => {
    mockShellEnabled.value = true;
    mockGameMode.value = 'blast';
    render(<PlayerInGameView {...baseProps} />);
    expect(document.querySelector('[data-mp-shell]')).toBeInTheDocument();
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
  });

  it('wheel-rush: wraps canvas in shell when enabled', () => {
    mockShellEnabled.value = true;
    mockGameMode.value = 'wheel-rush';
    render(<PlayerInGameView {...baseProps} />);
    expect(document.querySelector('[data-mp-shell]')).toBeInTheDocument();
    expect(screen.getByTestId('wheel-rush-view')).toBeInTheDocument();
  });
});
