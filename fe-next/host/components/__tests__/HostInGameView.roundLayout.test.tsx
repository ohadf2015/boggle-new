/**
 * The playing host gets the SAME round frame as the joiner (one HUD, roster,
 * hidden-until-GO board) — two paths to the same screen must not diverge
 * (pitfall class 3). Continue-solo leaves through useMpExit.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({ config: {}, initialTileStates: [], blastSeed: 0, waveNumber: 1 }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: { total_games: 0 } }) }));
const mode = { value: 'classic' as string | undefined };
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => mode.value,
  useGameModeConfirmed: () => true,
  useGameStore: (sel: (s: { setBlastBoardClearedByLocal: () => void }) => unknown) => sel({ setBlastBoardClearedByLocal: () => {} }),
}));
vi.mock('@/lib/multiplayer/usePendingWords', () => ({
  usePendingWords: () => ({ pendingWords: new Map(), enqueuePending: vi.fn(), confirmPending: vi.fn(), rejectPending: vi.fn(), dismissPending: vi.fn(), clearAll: vi.fn(), isPending: vi.fn().mockReturnValue(false) }),
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
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Mute' }) }));

import HostInGameView from '../HostInGameView';
import { MpExitProvider } from '@/hooks/useMpExit';

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
