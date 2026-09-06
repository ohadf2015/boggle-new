import { vi, type Mock, } from 'vitest';
/**
 * Test: PlayerInGameView renders BlastGame when gameMode === 'blast'
 *
 * Verifies that the blast multiplayer integration mounts BlastGame component
 * instead of InGameScreen when the game mode is 'blast'.
 */

import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/dynamic: resolve module synchronously using vi.importActual-style trick.
// We can't use async React.lazy because tests don't use waitFor.
// Instead, return a no-op placeholder — the important behavior (BlastGame props)
// is tested via capturedBlastGameProps which is set in the BlastGame mock render.
// Live Vocab Quiz view is dynamic()-loaded; the eager next/dynamic mock below
// would leave its import chain in flight past environment teardown.
vi.mock('@/components/education/vocabQuiz/VocabQuizView', () => ({ VocabQuizView: () => null }));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<any>, _opts?: any) => {
    // Run the import synchronously so the mocked module is available immediately
    let Comp: any = null;
    const promise = importFn();
    // Promise.resolve chaining - in vitest the mock module resolves in microtask queue
    // We force synchronous resolution via the module registry
    promise.then((mod: any) => {
      Comp = mod.default ?? mod;
    });
    // Return a component that renders Comp if resolved, otherwise nothing
    // Testing-library's render() flushes microtasks via act(), so Comp will be set
    const Wrapper = (props: any) => (Comp ? Comp(props) : null);
    Wrapper.displayName = 'DynamicWrapper';
    return Wrapper;
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
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

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => mockGameMode.value,
  useGameModeConfirmed: () => true,
  useBlastTileOverlay: () => mockBlastTileOverlay.value,
  useBlastMovesUsed: () => mockBlastMovesUsed.value,
  useWordHuntTargetLength: () => mockWordHuntTargetLength.value,
  useWordHuntMyLife: () => mockWordHuntMyLife.value,
  useWordHuntTargetAttempts: () => mockWordHuntTargetAttempts.value,
  useWordHuntTargetFound: () => mockWordHuntTargetFound.value,
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
  useGameStore: (selector: (s: any) => any) => selector({ gameDuration: 120 }),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock InGameScreen — renders a testid so we can check if it's mounted
vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="in-game-screen" />,
}));

// Mock BlastGame — renders a testid so we can check if it's mounted
vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: (props: any) => (
    <div
      data-testid="blast-game"
      data-mode={props.mode}
      data-total-time={props.totalTime ?? ''}
    />
  ),
}));

// Mock useBlastMultiplayerBridge
vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({
    config: { gridSize: 4, specialTileChance: 0.15, language: 'en', difficulty: 'medium' },
    initialTileStates: null,
    blastSeed: 42,
  }),
}));

// Mock UI components
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

  it('should not render BlastMoveCounter directly (moved to BlastGameLayout)', () => {
    mockGameMode.value = 'blast';
    mockBlastMovesUsed.value = 7;

    render(<PlayerInGameView {...baseProps} />);

    // BlastMoveCounter is now rendered inside BlastGameLayout, not PlayerInGameView
    expect(screen.queryByTestId('blast-move-counter')).not.toBeInTheDocument();
  });

  it('should use dark navy background without padding for blast mode', () => {
    mockGameMode.value = 'blast';

    const { container } = render(<PlayerInGameView {...baseProps} />);

    // The outer wrapper should have blast-specific classes
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('bg-neo-navy');
    expect(wrapper.className).not.toContain('bg-neo-cream');
  });

  it('should use navy background with padding for classic mode (no cream FOUC flash)', () => {
    mockGameMode.value = 'classic';

    const { container } = render(<PlayerInGameView {...baseProps} />);

    // App is dark-only: the classic container must be navy from the first paint.
    // `bg-neo-cream dark:bg-neo-navy` + `transition-colors` painted a 1-frame
    // cream FOUC that bled through the pre-game countdown overlay as a "fanfare
    // flash" on the native app. Navy-only, no color transition.
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('bg-neo-navy');
    expect(wrapper.className).not.toContain('bg-neo-cream');
    expect(wrapper.className).not.toContain('transition-colors');
    expect(wrapper.className).toContain('md:p-4');
  });

  it('should pass totalTime to BlastGame', () => {
    mockGameMode.value = 'blast';

    render(<PlayerInGameView {...baseProps} totalTime={180} />);

    expect(screen.getByTestId('blast-game')).toHaveAttribute('data-total-time', '180');
  });
});
