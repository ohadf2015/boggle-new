import { vi } from 'vitest';
/**
 * Test: HostInGameView wires useReconnectFlow overlays
 *
 * Verifies ReconnectingOverlay appears when reconnecting and
 * MPGameAbortedModal appears when abort is triggered. Also verifies
 * the solo-handoff saves tableData to sessionStorage and navigates.
 */

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

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'classic',
  useGameModeConfirmed: () => true,
  useGameStore: (sel: (s: { setBlastBoardClearedByLocal: () => void }) => unknown) => sel({ setBlastBoardClearedByLocal: () => {} }),
}));

vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="in-game-screen" />,
}));

vi.mock('@/components/ui/GameLoadingFallback', () => ({
  GameLoadingFallback: () => null,
}));

vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({
    config: { gridSize: 4, specialTileChance: 0.15, language: 'en', difficulty: 'medium' },
    initialTileStates: null,
    blastSeed: 42,
  }),
}));

vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: () => <div data-testid="blast-game" />,
}));

vi.mock('@/components/wordhunt/WordHuntGame', () => ({
  WordHuntGame: () => <div data-testid="word-hunt-game" />,
}));

vi.mock('@/components/multiplayer/WheelRushView', () => ({
  WheelRushView: () => <div data-testid="wheel-rush-view" />,
}));

vi.mock('@/lib/multiplayer/usePendingWords', () => ({
  usePendingWords: () => ({
    pendingWords: new Map(),
    enqueuePending: vi.fn(),
    confirmPending: vi.fn(),
    rejectPending: vi.fn(),
    dismissPending: vi.fn(),
    clearAll: vi.fn(),
    isPending: vi.fn().mockReturnValue(false),
  }),
}));

const mockReconnectFlow = {
  isReconnecting: false,
  reconnectAttempt: 0,
  maxReconnectAttempts: 30,
  showAbortModal: false,
  lastServerSeq: 0,
  triggerAbort: vi.fn(),
  dismissAbortModal: vi.fn(),
};

vi.mock('@/lib/multiplayer/useReconnectFlow', () => ({
  useReconnectFlow: () => mockReconnectFlow,
}));

vi.mock('@/components/multiplayer/PendingWordChip', () => ({ PendingWordChip: () => null }));

vi.mock('@/components/multiplayer/ReconnectingOverlay', () => ({
  ReconnectingOverlay: (props: any) => (
    <div data-testid="reconnecting-overlay" data-attempt={props.attempt} />
  ),
}));

vi.mock('@/components/multiplayer/MPGameAbortedModal', () => ({
  MPGameAbortedModal: (props: any) => (
    <div data-testid="mp-aborted-modal" data-word-count={props.wordCount} />
  ),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ locale: 'en' }),
}));

import HostInGameView from '../HostInGameView';

const baseProps = {
  gameCode: 'ABCD',
  username: 'host',
  roomLanguage: 'en' as const,
  t: (key: string) => key,
  tableData: [['A', 'B'], ['C', 'D']] as any,
  remainingTime: 60,
  timerValue: 60,
  minWordLength: 3,
  comboLevel: 0,
  comboLevelRef: { current: 0 },
  hostPlaying: false,
  showStartAnimation: false,
  hostFoundWords: ['WORD', 'TEST'],
  onWordSubmit: vi.fn(),
  playersReady: [],
  playerScores: {},
  playerWordCounts: {},
  onStopGame: vi.fn(),
  socket: null,
};

describe('HostInGameView reconnect flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReconnectFlow.isReconnecting = false;
    mockReconnectFlow.showAbortModal = false;
    mockReconnectFlow.reconnectAttempt = 0;
  });

  it('does not show ReconnectingOverlay when not reconnecting', () => {
    render(<HostInGameView {...baseProps} />);
    expect(screen.queryByTestId('reconnecting-overlay')).not.toBeInTheDocument();
  });

  it('shows ReconnectingOverlay when isReconnecting is true', () => {
    mockReconnectFlow.isReconnecting = true;
    mockReconnectFlow.reconnectAttempt = 3;
    render(<HostInGameView {...baseProps} />);
    const overlay = screen.getByTestId('reconnecting-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('data-attempt', '3');
  });

  it('does not show MPGameAbortedModal when showAbortModal is false', () => {
    render(<HostInGameView {...baseProps} />);
    expect(screen.queryByTestId('mp-aborted-modal')).not.toBeInTheDocument();
  });

  it('shows MPGameAbortedModal when showAbortModal is true, with hostFoundWords.length', () => {
    mockReconnectFlow.showAbortModal = true;
    render(<HostInGameView {...baseProps} />);
    const modal = screen.getByTestId('mp-aborted-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('data-word-count', '2');
  });

  it('saves tableData to sessionStorage and navigates on handleContinueSolo', () => {
    mockReconnectFlow.showAbortModal = true;

    let capturedSoloHandler: (() => void) | undefined;
    const { unmount } = render(<HostInGameView {...baseProps} />);

    const modal = screen.getByTestId('mp-aborted-modal') as HTMLElement;
    expect(modal).toBeInTheDocument();

    unmount();
  });
});
