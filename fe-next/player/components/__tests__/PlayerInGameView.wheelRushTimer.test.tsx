import { vi } from 'vitest';
/**
 * Test: PlayerInGameView passes remainingTime to WheelRushView
 *
 * Regression guard for the "no timer + game continues forever" bug:
 * the wheel-rush branch mounted WheelRushView without `remainingTime`,
 * so the in-game timer pill never rendered for player-side participants.
 */

import { render, screen } from '@testing-library/react';

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

const mockGameMode = { value: 'wheel-rush' as string | null };

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => mockGameMode.value,
  useGameModeConfirmed: () => true,
  useBlastTileOverlay: () => null,
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
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
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
  WheelRushView: (props: any) => (
    <div
      data-testid="wheel-rush-view"
      data-remaining-time={props.remainingTime ?? 'undefined'}
    />
  ),
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
  letterGrid: null,
  shufflingGrid: null,
  gameActive: true,
  showStartAnimation: false,
  remainingTime: 47,
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

describe('PlayerInGameView wheel-rush timer prop', () => {
  it('passes remainingTime to WheelRushView so the in-game timer pill renders', () => {
    mockGameMode.value = 'wheel-rush';

    render(<PlayerInGameView {...baseProps} />);

    const view = screen.getByTestId('wheel-rush-view');
    expect(view).toBeInTheDocument();
    expect(view).toHaveAttribute('data-remaining-time', '47');
  });

  it('forwards null remainingTime (still renders, value not yet known)', () => {
    mockGameMode.value = 'wheel-rush';

    render(<PlayerInGameView {...baseProps} remainingTime={null} />);

    const view = screen.getByTestId('wheel-rush-view');
    expect(view).toHaveAttribute('data-remaining-time', 'undefined');
  });
});
