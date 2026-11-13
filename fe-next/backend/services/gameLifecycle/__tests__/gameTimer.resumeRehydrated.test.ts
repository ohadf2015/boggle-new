/**
 * Test: resumeGameTimerIfMissing — restart-recovery for rehydrated games.
 *
 * A server restart / redeploy wipes the in-memory setInterval game timer
 * (word-hunt life-drain clock, round clock) while Redis still holds the game
 * state. When such a game is rehydrated on player reconnect, its timer must be
 * resumed — otherwise the round is frozen (word-hunt life stuck, never ends).
 *
 * Guard contract:
 *  - in-progress game with NO running timer  → resume (returns true)
 *  - in-progress game WITH a running timer    → no-op (live reconnect; returns false)
 *  - non-in-progress game                     → no-op (returns false)
 *  - missing game                             → no-op (returns false)
 */

vi.mock('../../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  updateGame: vi.fn(),
}));
vi.mock('../../../modules/communityWordManager', () => ({ resetGameAIValidationCount: vi.fn() }));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:G1'),
}));
vi.mock('../../../utils/timerManager', () => ({
  default: { clearGameTimer: vi.fn(), setGameTimer: vi.fn(), hasTimer: vi.fn() },
  clearGameTimer: vi.fn(),
  setGameTimer: vi.fn(),
  hasGameTimer: vi.fn(),
}));
vi.mock('../../../modules/wordHuntManager', () => ({ drainLife: vi.fn(), areAllPlayersEliminated: vi.fn() }));
vi.mock('../botGame', () => ({ startBotsForGame: vi.fn(), restoreBotsForGame: vi.fn().mockReturnValue(0) }));
vi.mock('../gameEnd', () => ({ endGame: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../utils/gameStateMachine', () => ({ isInProgress: vi.fn() }));
vi.mock('../../../dictionary', () => ({ ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../modules/vocabQuizStore', () => ({ hasQuizSession: vi.fn().mockReturnValue(false) }));

import { vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { hasGameTimer, setGameTimer } from '../../../utils/timerManager';
import { isInProgress } from '../../../utils/gameStateMachine';
import { resumeGameTimerIfMissing } from '../gameTimer';
import { hasQuizSession } from '../../../modules/vocabQuizStore';
import { tryAcquireGameStart, releaseGameStart, STALE_START_MS } from '../../../handlers/gameStartMutex';

const mGetGame = getGame as Mock;
const mHasTimer = hasGameTimer as Mock;
const mSetTimer = setGameTimer as Mock;
const mInProgress = isInProgress as Mock;

describe('resumeGameTimerIfMissing', () => {
  const io = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('resumes the timer for an in-progress game with no running timer (restart recovery)', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'word-hunt', wordHuntState: {}, gameDuration: 90 });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(false);

    const resumed = await resumeGameTimerIfMissing(io, 'G1');

    expect(resumed).toBe(true);
    expect(mSetTimer).toHaveBeenCalledWith('G1', expect.anything()); // startGameTimer registered an interval
  });

  it('Given a live vocab quiz in the room, When a student rejoins, Then no board clock starts (the quiz runs its own)', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'classic', gameDuration: 180, remainingTime: 11 });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(false);
    (hasQuizSession as Mock).mockReturnValueOnce(true);

    const resumed = await resumeGameTimerIfMissing(io, 'G1');

    expect(resumed).toBe(false);
    expect(mSetTimer).not.toHaveBeenCalled();
  });

  it('does NOT restart the timer when one is already running (normal live reconnect)', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'word-hunt', wordHuntState: {}, gameDuration: 90 });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(true);

    const resumed = await resumeGameTimerIfMissing(io, 'G1');

    expect(resumed).toBe(false);
    expect(mSetTimer).not.toHaveBeenCalled();
  });

  it('does nothing for a game that is not in progress', async () => {
    mGetGame.mockReturnValue({ gameState: 'finished', gameMode: 'word-hunt' });
    mInProgress.mockReturnValue(false);
    mHasTimer.mockReturnValue(false);

    expect(await resumeGameTimerIfMissing(io, 'G1')).toBe(false);
    expect(mSetTimer).not.toHaveBeenCalled();
  });

  it('does nothing when the game is missing', async () => {
    mGetGame.mockReturnValue(null);
    expect(await resumeGameTimerIfMissing(io, 'G1')).toBe(false);
    expect(mSetTimer).not.toHaveBeenCalled();
  });

  it('Given a round start still dealing, Then restart recovery stands down', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'classic', gameDuration: 90 });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(false);
    tryAcquireGameStart('G1');
    try {
      expect(await resumeGameTimerIfMissing(io, 'G1')).toBe(false);
    } finally {
      releaseGameStart('G1');
    }
  });

  it('Given a start flag held far past its cap (wedged), Then recovery treats it as stale and resumes the clock', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'classic', gameDuration: 90 });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(false);
    tryAcquireGameStart('G1');
    try {
      await vi.advanceTimersByTimeAsync(STALE_START_MS + 1);
      expect(await resumeGameTimerIfMissing(io, 'G1')).toBe(true);
    } finally {
      releaseGameStart('G1');
    }
  });
});
