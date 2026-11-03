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

import { vi, type Mock } from 'vitest';
import { getGame, updateGame } from '../../../modules/gameStateManager';
import { hasGameTimer, setGameTimer } from '../../../utils/timerManager';
import { isInProgress } from '../../../utils/gameStateMachine';
import { startBotsForGame } from '../botGame';
import gameStartCoordinator from '../../../utils/gameStartCoordinator';
import { resumeGameTimerIfMissing } from '../gameTimer';

const mGetGame = getGame as Mock;
const mUpdateGame = updateGame as Mock;
const mHasTimer = hasGameTimer as Mock;
const mSetTimer = setGameTimer as Mock;
const mInProgress = isInProgress as Mock;
const mStartBots = startBotsForGame as Mock;

const NOW = 1_700_000_000_000;
const io = {} as never;

function launchedUpdate(): Record<string, unknown> | undefined {
  return mUpdateGame.mock.calls.map((c) => c[1]).find((u) => u && 'timerEndTimestamp' in u);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mInProgress.mockReturnValue(true);
  mHasTimer.mockReturnValue(false);
});
afterEach(() => {
  gameStartCoordinator.clearAll();
  vi.useRealTimers();
});

describe('resumeGameTimerIfMissing — restored round keeps its saved remaining time', () => {
  it('resumes at the saved remainingTime; server downtime between persist and restore is not counted', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'classic', gameDuration: 180, remainingTime: 47, restoredFromRedis: true, lastActivity: NOW - 60_000 });

    expect(await resumeGameTimerIfMissing(io, 'G1')).toBe(true);

    expect(launchedUpdate()).toMatchObject({ timerEndTimestamp: NOW + 47_000, timerElapsedOffsetMs: 133_000 });
    expect(mUpdateGame).toHaveBeenCalledWith('G1', expect.objectContaining({ timerSeconds: 180 }));
    expect(mStartBots).toHaveBeenCalledWith(io, 'G1', undefined, undefined, 47);
  });

  it('clamps a saved remainingTime above the configured duration down to the duration', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameDuration: 60, remainingTime: 500 });

    await resumeGameTimerIfMissing(io, 'G1');

    expect(launchedUpdate()).toMatchObject({ timerEndTimestamp: NOW + 60_000, timerElapsedOffsetMs: 0 });
  });

  it('clamps a saved remainingTime below one second up to one second', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameDuration: 60, remainingTime: 0.2 });

    await resumeGameTimerIfMissing(io, 'G1');

    expect(launchedUpdate()).toMatchObject({ timerEndTimestamp: NOW + 1_000 });
  });

  it.each([undefined, null, NaN, -5, 0, 'abc'])('falls back to the full duration when remainingTime is %s', async (saved) => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameDuration: 90, remainingTime: saved });

    await resumeGameTimerIfMissing(io, 'G1');

    expect(launchedUpdate()).toMatchObject({ timerEndTimestamp: NOW + 90_000, timerElapsedOffsetMs: 0 });
  });
});

describe('resumeGameTimerIfMissing — the 3-2-1 countdown owns the clock', () => {
  it('is a no-op while a start sequence is active and its timer has not started', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameDuration: 90, remainingTime: 90 });
    gameStartCoordinator.initializeSequence('G1', ['alice'], 90);

    expect(await resumeGameTimerIfMissing(io, 'G1')).toBe(false);
    expect(mSetTimer).not.toHaveBeenCalled();
    expect(launchedUpdate()).toBeUndefined();
  });

  it('resumes once the sequence has started the timer but the interval is gone', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameDuration: 90, remainingTime: 30 });
    const messageId = gameStartCoordinator.initializeSequence('G1', ['alice'], 90);
    gameStartCoordinator.recordCountdownComplete('G1', 'alice', messageId);

    expect(await resumeGameTimerIfMissing(io, 'G1')).toBe(true);
    expect(mSetTimer).toHaveBeenCalledWith('G1', expect.anything());
  });

  it('resumes when no start sequence exists (restart recovery)', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameDuration: 90, remainingTime: 30 });

    expect(await resumeGameTimerIfMissing(io, 'G1')).toBe(true);
  });
});
