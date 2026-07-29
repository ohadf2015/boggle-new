/**
 * Test: HostInGameView renders null until gameModeConfirmed is true.
 *
 * Same guard as PlayerInGameView — prevents one-frame classic flash when
 * the host socket handler updates tableData (React useState) before
 * the Zustand setGameMode call lands on the next render.
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
  usePendingWords: () => ({ pendingWords: new Map(), enqueuePending: vi.fn(), confirmPending: vi.fn(), rejectPending: vi.fn(), dismissPending: vi.fn(), clearAll: vi.fn(), isPending: vi.fn().mockReturnValue(false) }),
}));
vi.mock('@/lib/multiplayer/useReconnectFlow', () => ({
  useReconnectFlow: () => ({ isReconnecting: false, reconnectAttempt: 0, maxReconnectAttempts: 30, showAbortModal: false, lastServerSeq: 0, triggerAbort: vi.fn(), dismissAbortModal: vi.fn() }),
}));
vi.mock('@/components/multiplayer/PendingWordChip', () => ({ PendingWordChip: () => null }));
vi.mock('@/components/multiplayer/ReconnectingOverlay', () => ({ ReconnectingOverlay: () => null }));
vi.mock('@/components/multiplayer/MPGameAbortedModal', () => ({ MPGameAbortedModal: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useParams: () => ({ locale: 'en' }) }));

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
  hostFoundWords: [],
  onWordSubmit: vi.fn(),
  playersReady: [],
  playerScores: {},
  playerWordCounts: {},
  onStopGame: vi.fn(),
  socket: null,
};

describe('HostInGameView gameModeConfirmed guard', () => {
  it('renders null when gameModeConfirmed is false (prevents classic flash)', () => {
    mockGameModeConfirmed.value = false;
    mockGameMode.value = 'blast';
    const { container } = render(<HostInGameView {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null for wheel-rush when gameModeConfirmed is false', () => {
    mockGameModeConfirmed.value = false;
    mockGameMode.value = 'wheel-rush';
    const { container } = render(<HostInGameView {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders InGameScreen (spectator) when gameModeConfirmed is true and hostPlaying false', () => {
    mockGameModeConfirmed.value = true;
    mockGameMode.value = 'classic';
    render(<HostInGameView {...baseProps} />);
    expect(screen.getByTestId('in-game-screen')).toBeInTheDocument();
  });

  it('renders blast game when gameModeConfirmed is true and hostPlaying true', () => {
    mockGameModeConfirmed.value = true;
    mockGameMode.value = 'blast';
    render(<HostInGameView {...baseProps} hostPlaying={true} />);
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
    expect(screen.queryByTestId('in-game-screen')).not.toBeInTheDocument();
  });
});
