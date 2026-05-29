import { vi } from 'vitest';
/**
 * Test: HostInGameView passes remainingTime to WheelRushView
 *
 * Mirrors PlayerInGameView regression guard. Host's wheel-rush branch
 * was also mounting WheelRushView without `remainingTime`, hiding the
 * timer pill and giving the impression the round had no time limit.
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

const mockGameMode = { value: 'wheel-rush' as string | null };

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

import HostInGameView from '../HostInGameView';

const baseProps = {
  gameCode: 'ABCD',
  username: 'host',
  roomLanguage: 'en' as const,
  t: (key: string) => key,
  tableData: [['A', 'B'], ['C', 'D']] as any,
  remainingTime: 33,
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

describe('HostInGameView wheel-rush timer prop', () => {
  it('passes remainingTime to WheelRushView so the in-game timer pill renders', () => {
    mockGameMode.value = 'wheel-rush';

    render(<HostInGameView {...baseProps} />);

    const view = screen.getByTestId('wheel-rush-view');
    expect(view).toBeInTheDocument();
    expect(view).toHaveAttribute('data-remaining-time', '33');
  });

  it('forwards null remainingTime (still renders, value not yet known)', () => {
    mockGameMode.value = 'wheel-rush';

    render(<HostInGameView {...baseProps} remainingTime={null} />);

    const view = screen.getByTestId('wheel-rush-view');
    expect(view).toHaveAttribute('data-remaining-time', 'undefined');
  });
});
