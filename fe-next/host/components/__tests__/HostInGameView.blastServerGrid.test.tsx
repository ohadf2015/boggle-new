import { vi } from 'vitest';
/**
 * Regression: HostInGameView must thread the server's authoritative Blast grid
 * into BlastGame (as `serverGrid`), exactly like PlayerInGameView does.
 *
 * Bug: the host's Blast branch omitted `serverGrid`, so in multiplayer the
 * legacy engine fell back to a locally-generated random grid. The server scores
 * each submitted word against ITS authoritative per-player board, so the host's
 * words never matched → the host (the human, when playing vs bots) always scored
 * 0 while bots scored normally.
 */

import { render, screen } from '@testing-library/react';

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

const mockGameMode = { value: 'blast' as string | null };

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => mockGameMode.value,
  useGameModeConfirmed: () => true,
  useGameStore: (sel: (s: { setBlastBoardClearedByLocal: () => void }) => unknown) => sel({ setBlastBoardClearedByLocal: () => {} }),
}));

vi.mock('../../components/game/InGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="in-game-screen" />,
}));

vi.mock('@/components/ui/GameLoadingFallback', () => ({
  GameLoadingFallback: () => null,
}));

const SERVER_GRID = [['S', 'E'], ['R', 'V']];

vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({
    config: { gridSize: 2, specialTileChance: 0.15, language: 'en', difficulty: 'medium' },
    initialTileStates: null,
    blastSeed: 42,
    serverGrid: SERVER_GRID,
  }),
}));

vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: (props: any) => (
    <div
      data-testid="blast-game"
      data-has-server-grid={props.serverGrid ? 'true' : 'false'}
      data-server-grid={props.serverGrid ? JSON.stringify(props.serverGrid) : 'undefined'}
    />
  ),
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
  tableData: SERVER_GRID as any,
  remainingTime: 33,
  timerValue: 60,
  minWordLength: 3,
  comboLevel: 0,
  comboLevelRef: { current: 0 },
  hostPlaying: true,
  showStartAnimation: false,
  hostFoundWords: [],
  onWordSubmit: vi.fn(),
  playersReady: [],
  playerScores: {},
  playerWordCounts: {},
  onStopGame: vi.fn(),
  socket: null,
};

describe('HostInGameView blast serverGrid threading', () => {
  it('passes the authoritative serverGrid to BlastGame so host words score', () => {
    mockGameMode.value = 'blast';

    render(<HostInGameView {...baseProps} />);

    const game = screen.getByTestId('blast-game');
    expect(game).toHaveAttribute('data-has-server-grid', 'true');
    expect(game).toHaveAttribute('data-server-grid', JSON.stringify(SERVER_GRID));
  });
});
