/**
 * Teacher live controls — timer pause / resume / extend math.
 *
 * The round clock is a timestamp-based setInterval. A teacher pause must
 * (1) stop ticks entirely (no timeUpdate, no word-hunt life drain), (2) remember
 * exactly how much time was left, and (3) resume from that remainder — not from
 * the original endTimestamp, which would otherwise keep running under the pause
 * and end the round the moment the teacher resumes.
 */

import { vi, type Mock } from 'vitest';

// In-memory game object shared with the module under test so updateGame
// mutates the same state pauseGameTimer/resumeGameTimer read back.
const state = vi.hoisted(() => ({ game: null as any }));

vi.mock('../../../modules/gameStateManager', () => ({
  getGame: vi.fn(() => state.game),
  updateGame: vi.fn((_code: string, updates: Record<string, unknown>) => {
    if (state.game) Object.assign(state.game, updates);
  }),
}));

vi.mock('../../../modules/communityWordManager', () => ({
  resetGameAIValidationCount: vi.fn(),
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: (c: string) => `room:${c}`,
}));

// Real setInterval handles need real clearInterval under fake timers.
const { intervalIds, clear, set, has } = vi.hoisted(() => {
  const intervalIds = new Map<string, NodeJS.Timeout>();
  const clear = (code: string) => {
    const id = intervalIds.get(`game:${code}`);
    if (id) clearInterval(id);
    intervalIds.delete(`game:${code}`);
  };
  const set = (code: string, id: NodeJS.Timeout) => { intervalIds.set(`game:${code}`, id); };
  const has = (code: string) => intervalIds.has(`game:${code}`);
  return { intervalIds, clear, set, has };
});
vi.mock('../../../utils/timerManager', () => ({
  default: { clearGameTimer: clear, setGameTimer: set, hasGameTimer: has, setTimeout: vi.fn() },
  clearGameTimer: clear,
  setGameTimer: set,
  hasGameTimer: has,
}));

vi.mock('../botGame', () => ({
  startBotsForGame: vi.fn(),
  restoreBotsForGame: vi.fn(() => 0),
}));

vi.mock('../gameEnd', () => ({
  endGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../modules/wordHuntManager', () => ({
  drainLife: vi.fn((state: any) => ({ updatedLives: { ...state.playerLives }, newlyEliminated: [] })),
  areAllPlayersEliminated: vi.fn(() => false),
}));

vi.mock('../../../dictionary', () => ({
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { broadcastToRoom } from '../../../utils/socketHelpers';
import { drainLife } from '../../../modules/wordHuntManager';
import { endGame } from '../gameEnd';
import {
  startGameTimer,
  pauseGameTimer,
  resumeGameTimer,
  extendGameTimer,
  resumeGameTimerIfMissing,
} from '../gameTimer';

const mockBroadcast = broadcastToRoom as Mock;
const mockEndGame = endGame as Mock;
const mockDrainLife = drainLife as Mock;

const CODE = 'TEACH1';
const io = {} as any;

function eventsOf(name: string) {
  return mockBroadcast.mock.calls.filter((c) => c[2] === name).map((c) => c[3]);
}

function baseGame(extra: Record<string, unknown> = {}) {
  return {
    gameState: 'in-progress',
    gameMode: 'classic',
    letterGrid: [['A']],
    language: 'en',
    gameSessionId: 7,
    isClassroom: true,
    ...extra,
  };
}

describe('gameTimer — teacher pause / resume / extend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T10:00:00Z'));
    mockBroadcast.mockClear();
    mockEndGame.mockClear();
    mockDrainLife.mockClear();
    intervalIds.forEach((id) => clearInterval(id));
    intervalIds.clear();
    state.game = baseGame();
  });

  afterEach(() => {
    intervalIds.forEach((id) => clearInterval(id));
    intervalIds.clear();
    vi.useRealTimers();
  });

  it('startGameTimer publishes a mutable timerEndTimestamp and clears any stale pause flags', () => {
    // GIVEN a state.game carrying stale pause state from a previous round
    state.game = baseGame({ isPaused: true, pausedRemainingMs: 5000 });

    // WHEN a new round timer starts
    startGameTimer(io, CODE, 60);

    // THEN the end timestamp lives on state.game state and the pause flags are reset
    expect(state.game.timerEndTimestamp).toBe(Date.now() + 60_000);
    expect(state.game.isPaused).toBe(false);
    expect(state.game.pausedRemainingMs).toBeNull();
  });

  it('pauseGameTimer stops ticks, records the remainder and broadcasts gamePaused', () => {
    startGameTimer(io, CODE, 60);
    vi.advanceTimersByTime(10_000); // 50s left

    const result = pauseGameTimer(io, CODE);

    expect(result).toEqual({ remainingTime: 50 });
    expect(state.game.isPaused).toBe(true);
    expect(state.game.pausedRemainingMs).toBe(50_000);
    expect(state.game.remainingTime).toBe(50);
    expect(has(CODE)).toBe(false);
    expect(eventsOf('gamePaused')).toEqual([{ remainingTime: 50, gameSessionId: 7 }]);

    // AND no timeUpdate ticks arrive while paused, even long past the original end
    mockBroadcast.mockClear();
    vi.advanceTimersByTime(120_000);
    expect(eventsOf('timeUpdate')).toHaveLength(0);
    expect(mockEndGame).not.toHaveBeenCalled();
  });

  it('pauseGameTimer is a no-op (null) when already paused or not in progress', () => {
    startGameTimer(io, CODE, 60);
    expect(pauseGameTimer(io, CODE)).toEqual({ remainingTime: 60 });
    expect(pauseGameTimer(io, CODE)).toBeNull();

    state.game = baseGame({ gameState: 'finished' });
    expect(pauseGameTimer(io, CODE)).toBeNull();
  });

  it('resumeGameTimer restarts from the paused remainder, not the original end', () => {
    startGameTimer(io, CODE, 60);
    vi.advanceTimersByTime(10_000); // 50s left
    pauseGameTimer(io, CODE);
    vi.advanceTimersByTime(90_000); // paused for 90s — original end long gone
    mockBroadcast.mockClear();

    const result = resumeGameTimer(io, CODE);

    expect(result).toEqual({ remainingTime: 50 });
    expect(state.game.isPaused).toBe(false);
    expect(state.game.pausedRemainingMs).toBeNull();
    expect(has(CODE)).toBe(true);
    expect(eventsOf('gameResumed')).toEqual([{ remainingTime: 50, gameSessionId: 7 }]);

    // Ticks continue from 50 → 49 …
    vi.advanceTimersByTime(1_000);
    expect(eventsOf('timeUpdate').at(-1)).toEqual({ remainingTime: 49, gameSessionId: 7 });

    // …and the round ends 50s after resume, exactly once.
    vi.advanceTimersByTime(48_000);
    expect(mockEndGame).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(mockEndGame).toHaveBeenCalledTimes(1);
  });

  it('resumeGameTimer is a no-op (null) when the state.game is not paused', () => {
    startGameTimer(io, CODE, 60);
    expect(resumeGameTimer(io, CODE)).toBeNull();
  });

  it('extendGameTimer pushes the end timestamp while running and broadcasts timeExtended + an immediate timeUpdate', () => {
    startGameTimer(io, CODE, 60);
    vi.advanceTimersByTime(10_000); // 50s left
    mockBroadcast.mockClear();

    const result = extendGameTimer(io, CODE, 30);

    expect(result).toEqual({ addedSeconds: 30, remainingTime: 80 });
    expect(state.game.timerEndTimestamp).toBe(Date.now() + 80_000);
    expect(state.game.remainingTime).toBe(80);
    expect(eventsOf('timeExtended')).toEqual([{ addedSeconds: 30, remainingTime: 80, gameSessionId: 7 }]);
    expect(eventsOf('timeUpdate')).toEqual([{ remainingTime: 80, gameSessionId: 7 }]);

    // The running interval honours the new end: no endGame at the old end…
    vi.advanceTimersByTime(50_000);
    expect(mockEndGame).not.toHaveBeenCalled();
    // …only at the extended one.
    vi.advanceTimersByTime(30_000);
    expect(mockEndGame).toHaveBeenCalledTimes(1);
  });

  it('extendGameTimer clamps the request to 10..120 seconds', () => {
    startGameTimer(io, CODE, 60);
    expect(extendGameTimer(io, CODE, 3)).toEqual({ addedSeconds: 10, remainingTime: 70 });
    expect(extendGameTimer(io, CODE, 999)).toEqual({ addedSeconds: 120, remainingTime: 190 });
    expect(extendGameTimer(io, CODE, Number.NaN)).toBeNull();
  });

  it('extendGameTimer while paused grows the stored remainder so resume honours it', () => {
    startGameTimer(io, CODE, 60);
    vi.advanceTimersByTime(10_000);
    pauseGameTimer(io, CODE); // 50s left
    mockBroadcast.mockClear();

    expect(extendGameTimer(io, CODE, 30)).toEqual({ addedSeconds: 30, remainingTime: 80 });
    expect(state.game.pausedRemainingMs).toBe(80_000);
    expect(state.game.isPaused).toBe(true);
    expect(has(CODE)).toBe(false); // still paused — no interval
    expect(eventsOf('timeUpdate')).toEqual([{ remainingTime: 80, gameSessionId: 7 }]);

    expect(resumeGameTimer(io, CODE)).toEqual({ remainingTime: 80 });
  });

  it('extendGameTimer returns null when the state.game is not in progress', () => {
    state.game = baseGame({ gameState: 'finished' });
    expect(extendGameTimer(io, CODE, 30)).toBeNull();
  });

  it('word-hunt life drain does not run while paused and resumes with play-time elapsed (pause excluded)', () => {
    state.game = baseGame({
      gameMode: 'word-hunt',
      wordHuntState: { playerLives: { amy: 100 }, eliminatedPlayers: [] },
    });
    startGameTimer(io, CODE, 120);
    vi.advanceTimersByTime(5_000); // 5 drain ticks, elapsed 0..4s
    expect(mockDrainLife).toHaveBeenCalledTimes(5);

    pauseGameTimer(io, CODE);
    mockDrainLife.mockClear();
    vi.advanceTimersByTime(60_000); // a full minute paused
    expect(mockDrainLife).not.toHaveBeenCalled();

    resumeGameTimer(io, CODE);
    vi.advanceTimersByTime(1_000);
    expect(mockDrainLife).toHaveBeenCalledTimes(1);
    // elapsedSeconds passed to drainLife counts PLAY time only (~6s), not the
    // 60s pause — otherwise the drain rate would jump to a late-state.game rate.
    const elapsedArg = mockDrainLife.mock.calls[0][1];
    expect(elapsedArg).toBeGreaterThanOrEqual(5);
    expect(elapsedArg).toBeLessThanOrEqual(7);
  });

  it('resumeGameTimerIfMissing does not restart a deliberately paused game', async () => {
    startGameTimer(io, CODE, 60);
    pauseGameTimer(io, CODE);

    // A paused state.game has no interval, which looks exactly like an orphaned one.
    const resumed = await resumeGameTimerIfMissing(io, CODE);

    expect(resumed).toBe(false);
    expect(has(CODE)).toBe(false);
    expect(state.game.isPaused).toBe(true);
  });
});
