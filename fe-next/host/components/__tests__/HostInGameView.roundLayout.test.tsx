/**
 * The playing host gets the SAME round frame as the joiner (one HUD, roster,
 * hidden-until-GO board) — two paths to the same screen must not diverge
 * (pitfall class 3). Continue-solo leaves through useMpExit.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import type { Socket } from 'socket.io-client';

vi.mock('next/dynamic', () => ({
  default: (fn: () => any) => {
    const Lazy = React.lazy(fn);
    return (props: any) => (
      <React.Suspense fallback={<div>Loading...</div>}>
        <Lazy {...props} />
      </React.Suspense>
    );
  },
}));
const screenProps: any[] = [];
vi.mock('@/components/game/InGameScreen', () => ({
  default: (p: any) => { screenProps.push(p); return <div data-testid="in-game-screen" />; },
}));
const huntProps: any[] = [];
vi.mock('@/components/wordhunt/WordHuntGame', () => ({ WordHuntGame: (p: any) => { huntProps.push(p); return <div data-testid="word-hunt-game" />; } }));
const blastProps: any[] = [];
vi.mock('@/components/blast/legacy/BlastGame', () => ({ BlastGame: (p: any) => { blastProps.push(p); return <div data-testid="blast-game" />; } }));
vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({ config: {}, initialTileStates: [], blastSeed: 0, waveNumber: 1 }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: { total_games: 0 } }) }));
const mode = { value: 'classic' as string | undefined };
// Stable identities, like the real zustand store and usePendingWords (useCallback).
const { storeState, pendingApi } = vi.hoisted(() => ({
  storeState: { setBlastBoardClearedByLocal: () => {} },
  pendingApi: {} as Record<string, unknown>,
}));
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => mode.value,
  useGameModeConfirmed: () => true,
  useGameStore: (sel: (s: { setBlastBoardClearedByLocal: () => void }) => unknown) => sel(storeState),
}));
vi.mock('@/lib/multiplayer/usePendingWords', () => ({
  usePendingWords: () => {
    if (!pendingApi.enqueuePending) Object.assign(pendingApi, { pendingWords: new Map(), enqueuePending: vi.fn(), confirmPending: vi.fn(), rejectPending: vi.fn(), dismissPending: vi.fn(), clearAll: vi.fn(), isPending: vi.fn().mockReturnValue(false) });
    return pendingApi;
  },
}));
const abort = { value: false };
vi.mock('@/lib/multiplayer/useReconnectFlow', () => ({
  useReconnectFlow: () => ({ isReconnecting: false, reconnectAttempt: 0, maxReconnectAttempts: 30, showAbortModal: abort.value, lastServerSeq: 0, triggerAbort: vi.fn(), dismissAbortModal: vi.fn() }),
}));
vi.mock('@/components/education/vocabQuiz/VocabQuizHostView', () => ({ VocabQuizHostView: () => null }));
vi.mock('@/components/wordTower/WordTowerVersus', () => ({ WordTowerVersus: () => null }));
vi.mock('@/components/multiplayer/PendingWordChip', () => ({ PendingWordChip: () => null }));
vi.mock('@/components/multiplayer/ReconnectingOverlay', () => ({ ReconnectingOverlay: () => null }));
vi.mock('@/components/multiplayer/MPGameAbortedModal', () => ({
  MPGameAbortedModal: ({ onContinueSolo }: any) => <button data-testid="continue-solo" onClick={onContinueSolo}>solo</button>,
}));
const routerPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush }), useParams: () => ({ locale: 'en' }) }));
vi.mock('@/components/ui/CircularTimer', () => ({ default: () => <div /> }));
// NumberFlow's custom element is not defined here; a score change would crash its update path.
vi.mock('@/components/ui/AnimatedCounter', () => ({ default: ({ value }: { value: number }) => <span>{value}</span> }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Mute' }) }));

import HostInGameView from '../HostInGameView';
import { MpExitProvider } from '@/hooks/useMpExit';
import { recordWordAccepted } from '@/lib/multiplayer/mpFeedback';
import { ROUND_TOAST_LANE_CLASS } from '@/components/multiplayer/round/useRoundToastLane';

const props = {
  gameCode: 'ROOM42',
  username: 'Host',
  roomLanguage: 'en' as const,
  t: (k: string) => k,
  tableData: [['A', 'B'], ['C', 'D']],
  remainingTime: 60,
  timerValue: 1,
  minWordLength: 3,
  comboLevel: 0,
  comboLevelRef: { current: 0 },
  hostPlaying: true,
  showStartAnimation: false,
  hostFoundWords: ['cab'],
  onWordSubmit: vi.fn(),
  playersReady: [{ username: 'Host', isHost: true }, { username: 'Bot', isBot: true }],
  playerScores: { Host: 6, Bot: 9 },
  playerWordCounts: { Host: 1, Bot: 2 },
  onStopGame: vi.fn(),
  socket: null as unknown as Socket,
  totalTime: 60,
};

describe('HostInGameView — round frame', () => {
  beforeEach(() => {
    screenProps.length = 0;
    huntProps.length = 0;
    mode.value = 'classic';
    abort.value = false;
    routerPush.mockClear();
  });

  it('toast lane: while the round view is up, shared toasters are routed off the HUD (and released after)', () => {
    const { unmount } = render(<HostInGameView {...props} />);
    expect(document.documentElement.classList.contains(ROUND_TOAST_LANE_CLASS)).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains(ROUND_TOAST_LANE_CLASS)).toBe(false);
  });

  it('classic: the playing host gets the round frame (HUD + board, chrome off)', () => {
    render(<HostInGameView {...props} />);
    expect(screen.getByTestId('mp-round-canvas')).toContainElement(screen.getByTestId('in-game-screen'));
    expect(screenProps.at(-1).mpChrome).toBe(true);
    expect(screen.getByTestId('mp-score-chip')).toHaveTextContent('6');
    expect(screen.getByTestId('mp-rank-value')).toHaveTextContent('#2');
  });

  it('word-hunt: same frame, hunt chrome off', async () => {
    mode.value = 'word-hunt';
    render(<HostInGameView {...props} />);
    expect(await screen.findByTestId('word-hunt-game')).toBeInTheDocument();
    expect(huntProps.at(-1).mpChrome).toBe(true);
    expect(screen.getByTestId('mp-round-canvas')).toContainElement(screen.getByTestId('word-hunt-game'));
  });

  it('the HUD exit opens the stop-game confirmation (never ends the game on one tap)', () => {
    render(<HostInGameView {...props} />);
    fireEvent.click(screen.getByTestId('mp-back-leave'));
    expect(props.onStopGame).not.toHaveBeenCalled();
    expect(screen.getByText('mp.stopGameConfirm')).toBeInTheDocument();
  });

  it('hides the board while the countdown is up', () => {
    render(<HostInGameView {...props} showStartAnimation />);
    expect(screen.getByTestId('mp-round-canvas').className).toContain('invisible');
  });

  it('blast: the host\'s "+N" fly is server-scored too (same as the joiner)', async () => {
    mode.value = 'blast';
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    render(<HostInGameView {...props} />);
    await screen.findByTestId('blast-game');
    expect(blastProps.at(-1).serverPointsOnly).toBe(true);
    const renders = blastProps.length;
    now.mockReturnValue(2_000);
    act(() => recordWordAccepted({ word: 'stare', score: 17 }));
    expect(screen.getByTestId('mp-floater').textContent).toBe('+17');
    expect(blastProps.length).toBe(renders);
    now.mockRestore();
  });

  it('blast: the playing host gets the same round frame as the joiner (one HUD, blast clock/standings off)', async () => {
    mode.value = 'blast';
    render(<HostInGameView {...props} />);
    await screen.findByTestId('blast-game');
    expect(screen.getByTestId('mp-round-canvas')).toContainElement(screen.getByTestId('blast-game'));
    expect(screen.getAllByTestId('mp-hud-bar')).toHaveLength(1);
    const p = blastProps.at(-1);
    expect(p.isDesktopCanvas).toBe(true);
    expect(p.leaderboard).toBeUndefined();
    expect(screen.queryByTestId('mp-server-score-fly')).not.toBeInTheDocument();
  });

  it('blast: a timer tick or a score update never re-renders the host\'s blast board', async () => {
    mode.value = 'blast';
    const { rerender } = render(<HostInGameView {...props} />);
    await screen.findByTestId('blast-game');
    const renders = blastProps.length;
    rerender(<HostInGameView {...props} remainingTime={59} playerScores={{ Host: 12, Bot: 9 }} />);
    rerender(<HostInGameView {...props} remainingTime={58} playerScores={{ Host: 15, Bot: 9 }} />);
    expect(blastProps.length).toBe(renders);
    expect(screen.getByTestId('mp-rank-value')).toHaveTextContent('#1');
  });

  it('continue-solo leaves through useMpExit', () => {
    abort.value = true;
    const exit = vi.fn();
    render(
      <MpExitProvider value={exit}>
        <HostInGameView {...props} />
      </MpExitProvider>,
    );
    fireEvent.click(screen.getByTestId('continue-solo'));
    expect(exit).toHaveBeenCalledWith('continue-solo');
    expect(routerPush).not.toHaveBeenCalled();
  });
});
