/**
 * The room dying is what kills the classroom code.
 *
 * `endClassroomGameSession` is only worth anything if something real calls it.
 * A side-effect import or an unsubscribed listener would leave the terminal
 * marker never written, the tests green, and a projector code joinable for the
 * rest of its four-hour TTL — pitfall class 4 exactly.
 *
 * `deleteGame` is the single convergence point for every genuine teardown:
 * `closeRoom` (host pressed close), host-left-with-no-successor, the host
 * reconnect grace expiring, the host starting a new game elsewhere, the
 * empty-room sweep and the stale-game sweep. None of them is a round ending —
 * a round end leaves the room standing for results and Rematch — which is why
 * the hook is here and not on `gameCleanupEmitter.onGameEnd`
 * (`gameLifecycle/gameEnd.ts:85` fires that on every round end).
 *
 * These cases drive the SWEEP paths as well as the direct call: a test through
 * a handler would prove nothing about the two timers that actually run on a
 * long-lived server.
 */
vi.mock('../supabaseServer', () => ({
  getPopularPlayerWords: vi.fn().mockResolvedValue({ data: [] }),
  getSupabase: vi.fn().mockReturnValue(null),
  incrementBotWordUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../boggleSolver', () => ({
  findWordsForBots: vi.fn().mockReturnValue({ easy: [], medium: [], hard: [] }),
}));

vi.mock('../../dictionary', () => ({
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../gameState/persistence', () => ({
  persistGameState: vi.fn(),
  persistGameStateNow: vi.fn().mockResolvedValue(undefined),
  restoreGameFromRedis: vi.fn().mockResolvedValue(null),
  restoreAllGamesFromRedis: vi.fn().mockResolvedValue(0),
  getAllGameCodesFromRedis: vi.fn().mockResolvedValue([]),
  deleteGameFromRedis: vi.fn(),
  clearPersistTimer: vi.fn(),
}));

vi.mock('../../services/gameLifecycle/gameResults', () => ({
  clearEngagementTimeouts: vi.fn(),
}));

vi.mock('../classroomGameSession', () => ({
  endClassroomGameSession: vi.fn().mockResolvedValue(undefined),
}));

import { vi } from 'vitest';
import gsm from '../gameStateManager';
import { endClassroomGameSession } from '../classroomGameSession';

function creationData() {
  return {
    hostSocketId: 'socket-host',
    hostUsername: 'Ms Gauntlet',
    hostPlayerId: 'host-player-id',
    roomName: 'Period 3',
    language: 'en' as const,
    isRanked: false,
    allowLateJoin: true,
  };
}

describe('deleteGame ends the classroom session behind the room', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => gsm.clearAllGames());

  it('ends the session when the room is torn down directly', () => {
    gsm.createGame('ROOM01', creationData());

    gsm.deleteGame('ROOM01');

    expect(endClassroomGameSession).toHaveBeenCalledWith('ROOM01');
  });

  it('ends the session when the stale-game sweep removes the room', () => {
    const game = gsm.createGame('ROOM02', creationData());
    game.lastActivity = Date.now() - 60 * 60 * 1000;

    expect(gsm.cleanupStaleGames()).toBe(1);
    expect(endClassroomGameSession).toHaveBeenCalledWith('ROOM02');
  });

  it('does not end a session for a room that was never deleted', () => {
    gsm.createGame('ROOM03', creationData());

    expect(endClassroomGameSession).not.toHaveBeenCalled();
  });
});
