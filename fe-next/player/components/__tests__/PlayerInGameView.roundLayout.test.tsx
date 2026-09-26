/**
 * PlayerInGameView renders classic + word-hunt inside the ONE round frame
 * (MpRoundLayout): the mode canvas runs with its own chrome off (`mpChrome`),
 * the board is mounted-but-hidden until GO, and continue-solo leaves through
 * useMpExit — never a raw router.push.
 */
import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/components/education/vocabQuiz/VocabQuizView', () => ({ VocabQuizView: () => null }));
vi.mock('@/components/wordTower/WordTowerVersus', () => ({ WordTowerVersus: () => null }));
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
  useGameStore: (selector: (s: any) => any) => selector({ gameDuration: 120, setBlastBoardClearedByLocal: () => {} }),
}));
const screenProps: any[] = [];
vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: (p: any) => { screenProps.push(p); return <div data-testid="in-game-screen" />; },
}));
const huntProps: any[] = [];
vi.mock('@/components/wordhunt/WordHuntGame', () => ({ WordHuntGame: (p: any) => { huntProps.push(p); return <div data-testid="word-hunt-game" />; } }));
const blastProps: any[] = [];
vi.mock('@/components/blast/legacy/BlastGame', () => ({ BlastGame: (p: any) => { blastProps.push(p); return <div data-testid="blast-game" />; } }));
vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({ config: {}, initialTileStates: null, blastSeed: 42 }),
}));
vi.mock('@/components/multiplayer/WheelRushView', () => ({ WheelRushView: () => <div data-testid="wheel-rush-view" /> }));
vi.mock('@/components/TournamentStandings', () => ({ __esModule: true, default: () => null }));
vi.mock('@/lib/multiplayer/usePendingWords', () => ({
  usePendingWords: () => ({ pendingWords: new Map(), enqueuePending: vi.fn(), confirmPending: vi.fn(), rejectPending: vi.fn(), dismissPending: vi.fn(), clearAll: vi.fn(), isPending: vi.fn().mockReturnValue(false) }),
}));
const abort = { value: false };
vi.mock('@/lib/multiplayer/useReconnectFlow', () => ({
  useReconnectFlow: () => ({ isReconnecting: false, reconnectAttempt: 0, maxReconnectAttempts: 30, showAbortModal: abort.value, lastServerSeq: 0, triggerAbort: vi.fn(), dismissAbortModal: vi.fn() }),
}));
vi.mock('@/components/multiplayer/PendingWordChip', () => ({ PendingWordChip: () => null }));
vi.mock('@/components/multiplayer/ReconnectingOverlay', () => ({ ReconnectingOverlay: () => null }));
vi.mock('@/components/multiplayer/MPGameAbortedModal', () => ({
  MPGameAbortedModal: ({ onContinueSolo }: any) => <button data-testid="continue-solo" onClick={onContinueSolo}>solo</button>,
}));
const routerPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush }), useParams: () => ({ locale: 'en' }) }));
const shell = { value: false };
vi.mock('@/hooks/useDesktopShellEnabled', () => ({ useDesktopShellEnabled: () => shell.value }));
vi.mock('@/components/ui/CircularTimer', () => ({ default: () => <div /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Mute' }) }));

import PlayerInGameView from '../PlayerInGameView';
import { MpExitProvider } from '@/hooks/useMpExit';
import { recordWordAccepted } from '@/lib/multiplayer/mpFeedback';

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
  leaderboard: [{ username: 'p1', score: 3 }, { username: 'bot', score: 9 }],
  rosterUsers: [{ username: 'p1' }, { username: 'bot', isBot: true }],
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

describe('PlayerInGameView — round frame', () => {
  beforeEach(() => {
    screenProps.length = 0;
    huntProps.length = 0;
    mockGameMode.value = 'classic';
    shell.value = false;
    abort.value = false;
    routerPush.mockClear();
  });

  it('classic: board inside the round frame with the legacy chrome off', () => {
    render(<PlayerInGameView {...baseProps} />);
    const canvas = screen.getByTestId('mp-round-canvas');
    expect(canvas).toContainElement(screen.getByTestId('in-game-screen'));
    expect(screenProps.at(-1).mpChrome).toBe(true);
    expect(screen.getAllByTestId('mp-hud-bar')).toHaveLength(1);
  });

  it('word-hunt: the hunt canvas runs in the same frame with its chrome off', () => {
    mockGameMode.value = 'word-hunt';
    render(<PlayerInGameView {...baseProps} />);
    expect(screen.getByTestId('mp-round-canvas')).toContainElement(screen.getByTestId('word-hunt-game'));
    expect(huntProps.at(-1).mpChrome).toBe(true);
  });

  it('hides the board (mounted) while the countdown / mode reveal is up', () => {
    render(<PlayerInGameView {...baseProps} showStartAnimation />);
    expect(screen.getByTestId('mp-round-canvas').className).toContain('invisible');
    expect(screen.getByTestId('in-game-screen')).toBeInTheDocument();
  });

  it('desktop shell: the same round frame renders inside the shell marker', () => {
    shell.value = true;
    render(<PlayerInGameView {...baseProps} />);
    const marker = document.querySelector('[data-mp-shell]');
    expect(marker).toBeInTheDocument();
    expect(marker).toContainElement(screen.getByTestId('mp-round-layout'));
  });

  it('blast: the "+N" fly is server-scored in a live room (client fly off, server overlay on)', () => {
    mockGameMode.value = 'blast';
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    render(<PlayerInGameView {...baseProps} />);
    expect(blastProps.at(-1).serverPointsOnly).toBe(true);
    const renders = blastProps.length;
    now.mockReturnValue(2_000);
    act(() => recordWordAccepted({ word: 'stare', score: 17 }));
    expect(screen.getByTestId('mp-floater').textContent).toBe('+17');
    // The accept re-renders only the overlay, never the blast board.
    expect(blastProps.length).toBe(renders);
    now.mockRestore();
  });

  it('continue-solo leaves through useMpExit, not router.push', () => {
    abort.value = true;
    const exit = vi.fn();
    render(
      <MpExitProvider value={exit}>
        <PlayerInGameView {...baseProps} />
      </MpExitProvider>,
    );
    fireEvent.click(screen.getByTestId('continue-solo'));
    expect(exit).toHaveBeenCalledWith('continue-solo');
    expect(routerPush).not.toHaveBeenCalled();
  });
});
