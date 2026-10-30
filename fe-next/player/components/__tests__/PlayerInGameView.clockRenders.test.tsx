import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const renders = vi.hoisted(() => ({ inGameBody: 0, parent: 0 }));

vi.mock('@/components/education/vocabQuiz/VocabQuizView', () => ({ VocabQuizView: () => null }));
vi.mock('@/components/wordTower/WordTowerVersus', () => ({ WordTowerVersus: () => null }));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<any>) => {
    let Comp: any = null;
    importFn().then((mod: any) => { Comp = mod.default ?? mod; });
    const Wrapper = (props: any) => (Comp ? Comp(props) : null);
    return Wrapper;
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: { total_games: 5 } }) }));
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => { renders.inGameBody += 1; return 'wheel-rush'; },
  useGameModeConfirmed: () => true,
  useGameStore: (selector: (s: any) => any) => selector({ gameDuration: 120 }),
}));
vi.mock('@/components/game/InGameScreen', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/blast/legacy/BlastGame', () => ({ BlastGame: () => null }));
vi.mock('@/components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({ useBlastMultiplayerBridge: () => ({ config: {}, initialTileStates: null, blastSeed: 1 }) }));
vi.mock('@/components/wordhunt/WordHuntGame', () => ({ WordHuntGame: () => null }));
vi.mock('@/components/TournamentStandings', () => ({ __esModule: true, default: () => null }));
vi.mock('@/lib/multiplayer/usePendingWords', () => ({
  usePendingWords: () => ({ pendingWords: new Map(), enqueuePending: vi.fn(), confirmPending: vi.fn(), rejectPending: vi.fn(), dismissPending: vi.fn(), clearAll: vi.fn(), isPending: vi.fn().mockReturnValue(false) }),
}));
vi.mock('@/components/multiplayer/WheelRushView', () => ({
  WheelRushView: (props: any) => <div data-testid="wheel-rush-view" data-remaining-time={props.remainingTime ?? 'none'} />,
}));
vi.mock('@/lib/multiplayer/useReconnectFlow', () => ({
  useReconnectFlow: () => ({ isReconnecting: false, reconnectAttempt: 0, maxReconnectAttempts: 30, showAbortModal: false, lastServerSeq: 0, triggerAbort: vi.fn(), dismissAbortModal: vi.fn() }),
}));
vi.mock('@/components/multiplayer/ReconnectingOverlay', () => ({ ReconnectingOverlay: () => null }));
vi.mock('@/components/multiplayer/MPGameAbortedModal', () => ({ MPGameAbortedModal: () => null }));
vi.mock('@/components/multiplayer/MpBonusPill', () => ({ MpBonusPill: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useParams: () => ({ locale: 'en' }) }));

import PlayerInGameView from '../PlayerInGameView';
import { PlayerRoundClock } from '../PlayerRoundClock';
import { RoundClockProvider, useRoundClock, type RoundClockHandle } from '../../roundClock';

const props = {
  username: 'ana', gameCode: 'ABCD', t: (k: string) => k, dir: 'ltr' as const, socket: null, letterGrid: null,
  shufflingGrid: null, gameActive: true, showStartAnimation: false, gameLanguage: 'en' as const, minWordLength: 3,
  comboLevel: 0, comboLevelRef: { current: 0 }, foundWords: [], leaderboard: [], tournamentData: null,
  tournamentStandings: [], showTournamentStandings: false, setShowTournamentStandings: vi.fn(), showExitConfirm: false,
  setShowExitConfirm: vi.fn(), onExitRoom: vi.fn(), onConfirmExit: vi.fn(), onWordSubmit: vi.fn(),
};

const box: { handle: RoundClockHandle | null } = { handle: null };

/** Wired like PlayerView: the phase owns the clock handle, a leaf owns the ticking state. */
function Harness() {
  renders.parent += 1;
  const clock = useRoundClock(120);
  React.useEffect(() => { box.handle = clock; }, [clock]);
  return (
    <>
      <PlayerRoundClock
        clock={clock}
        isPaused={false}
        gameActive
        stallWatchActive={false}
        waitingForResults={false}
        onZero={vi.fn()}
        onStall={vi.fn()}
      />
      <RoundClockProvider value={clock.store}>
        <PlayerInGameView {...props} />
      </RoundClockProvider>
    </>
  );
}

const shownTime = () => screen.getByTestId('wheel-rush-view').getAttribute('data-remaining-time');

describe('round clock ticks re-render only the leaf timer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
    renders.inGameBody = 0;
    renders.parent = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('the clock keeps ticking while PlayerInGameView and its parent stay put', () => {
    render(<Harness />);
    act(() => box.handle!.timer.setTime(60));
    act(() => box.handle!.timer.resume());
    const before = { body: renders.inGameBody, parent: renders.parent };
    const t0 = Number(shownTime());

    act(() => { vi.advanceTimersByTime(3_100); });

    expect(Number(shownTime())).toBeLessThan(t0);
    expect(renders.inGameBody).toBe(before.body);
    expect(renders.parent).toBe(before.parent);
  });

  it('a server time sync lands on the leaf without re-rendering the view', () => {
    render(<Harness />);
    const before = { body: renders.inGameBody, parent: renders.parent };
    act(() => box.handle!.timer.setTime(42));
    expect(shownTime()).toBe('42');
    expect(renders.inGameBody).toBe(before.body);
    expect(renders.parent).toBe(before.parent);
  });

  it('the phase hook no longer owns the ticking timer state', () => {
    const phase = readFileSync(resolve(__dirname, '../../hooks/usePlayerPhase.ts'), 'utf8');
    expect(phase).not.toMatch(/useGameTimer\(/);
    expect(phase).not.toMatch(/gameTimer\.remainingTime/);
  });
});
