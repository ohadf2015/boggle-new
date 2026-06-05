/**
 * Test: scheduleGameStartSafetyNet — server-driven launch guarantee.
 *
 * Bot + timer launch is normally triggered by human clients reporting
 * `countdownComplete` (with an 8s coordinator fallback). If the only human's
 * tab is frozen/backgrounded from before the round starts, no countdownComplete
 * ever arrives AND (observed in prod) the coordinator fallback can miss — the
 * round then runs with NO server timer and bots never launch (first MP game
 * after a deploy: bots score 0). Until a client happens to reconnect and trigger
 * `requestGameState` orphan recovery, nothing fires.
 *
 * This safety net proactively runs the SAME idempotent recovery
 * (`resumeGameTimerIfMissing`) server-side a short time after start, so launch
 * never depends on a client signal.
 *
 * Contract:
 *  - in-progress game, NO timer, after the delay → starts the timer (game-1 fix)
 *  - before the delay elapses                    → does nothing yet
 *  - timer already running at fire time          → no-op (normal launch won)
 */

vi.mock('../../../modules/gameStateManager', () => ({ getGame: vi.fn(), updateGame: vi.fn() }));
vi.mock('../../../modules/communityWordManager', () => ({ resetGameAIValidationCount: vi.fn() }));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:G1'),
}));
vi.mock('../../../utils/timerManager', () => {
  const pending = new Map<string, ReturnType<typeof globalThis.setTimeout>>();
  return {
    // Default export exposes the keyed setTimeout the helper uses. Delegate to
    // the (faked) global setTimeout so vi.advanceTimersByTime fires the callback.
    default: {
      clearGameTimer: vi.fn(),
      setGameTimer: vi.fn(),
      hasGameTimer: vi.fn(),
      setTimeout: vi.fn((key: string, cb: () => void, delay: number) => {
        const existing = pending.get(key);
        if (existing) globalThis.clearTimeout(existing);
        pending.set(key, globalThis.setTimeout(cb, delay));
        return key;
      }),
      clearTimer: vi.fn((key: string) => {
        const id = pending.get(key);
        if (id) globalThis.clearTimeout(id);
        pending.delete(key);
        return true;
      }),
    },
    clearGameTimer: vi.fn(),
    setGameTimer: vi.fn(),
    hasGameTimer: vi.fn(),
  };
});
vi.mock('../../../modules/wordHuntManager', () => ({ drainLife: vi.fn(), areAllPlayersEliminated: vi.fn() }));
vi.mock('../botGame', () => ({ startBotsForGame: vi.fn(), restoreBotsForGame: vi.fn().mockReturnValue(0) }));
vi.mock('../gameEnd', () => ({ endGame: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../utils/gameStateMachine', () => ({ isInProgress: vi.fn() }));

import { vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { hasGameTimer, setGameTimer } from '../../../utils/timerManager';
import { isInProgress } from '../../../utils/gameStateMachine';
import { startBotsForGame } from '../botGame';
import { scheduleGameStartSafetyNet } from '../gameTimer';

const mGetGame = getGame as Mock;
const mHasTimer = hasGameTimer as Mock;
const mSetTimer = setGameTimer as Mock;
const mInProgress = isInProgress as Mock;
const mStartBots = startBotsForGame as Mock;

describe('scheduleGameStartSafetyNet', () => {
  const io = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('starts the timer + bots for an in-progress game with no timer once the delay elapses (frozen-host first game)', () => {
    // gameDuration is guaranteed set to the round timer by gameStartHandler's
    // unconditional updateGame (gameStartHandler.ts:430-438) BEFORE the safety
    // net is armed, so the recovery uses the real duration, not the 180 fallback.
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'word-hunt', wordHuntState: {}, gameDuration: 90 });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(false);

    scheduleGameStartSafetyNet(io, 'G1', 10000);
    expect(mSetTimer).not.toHaveBeenCalled(); // nothing fires before the delay

    vi.advanceTimersByTime(10000);

    expect(mSetTimer).toHaveBeenCalledWith('G1', expect.anything()); // startGameTimer registered the interval
    expect(mStartBots).toHaveBeenCalled(); // bots launched via the recovery path
  });

  it('does nothing before the delay elapses', () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'classic', gameDuration: 90 });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(false);

    scheduleGameStartSafetyNet(io, 'G1', 10000);
    vi.advanceTimersByTime(9000);

    expect(mSetTimer).not.toHaveBeenCalled();
  });

  it('is a no-op when the timer already started before it fires (normal launch won the race)', () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'classic', gameDuration: 90 });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(true); // timer already running

    scheduleGameStartSafetyNet(io, 'G1', 10000);
    vi.advanceTimersByTime(10000);

    expect(mSetTimer).not.toHaveBeenCalled();
    expect(mStartBots).not.toHaveBeenCalled();
  });
});
