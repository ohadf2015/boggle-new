/**
 * "This round ended" is not "the teacher ended the game".
 *
 * The previous gate refused any record with `status: 'finished'`. But that
 * status is written at the end of EVERY round — `gameScores.ts:405` the instant
 * the board timer expires, `vocabQuizRound.ts:92` when a quiz's last question
 * closes — and the next round only starts when the teacher presses it, seconds
 * to minutes later while the class reads the results screen. For that whole
 * teacher-paced gap the room, the roster and the projector code were all alive
 * and a brand-new student typing that code was told "we didn't recognize that
 * game PIN". A fresh dead end, introduced by the fix for the old one.
 *
 * Kahoot's actual bar: a PIN survives between questions and dies when the HOST
 * ENDS THE GAME. So the terminal marker is its own field, `endedAt`, written by
 * the two things that genuinely end a session and by nothing else:
 *
 *   1. the teacher's `endClassroomGame` / `classroomGameEnd` socket event, and
 *   2. the room actually being torn down — `gameStateManager.deleteGame`, which
 *      is where "host closed the room", "host left with no successor", "host
 *      reconnect grace expired", the empty-room sweep and the stale sweep all
 *      converge.
 *
 * Deliberately NOT `gameCleanupEmitter.onGameEnd`: `gameLifecycle/gameEnd.ts:85`
 * emits that at every ROUND end, so subscribing to it would rebuild the exact
 * bug above under a new field name.
 */
import { vi, type Mock } from 'vitest';

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: {
    smembers: vi.fn(),
    get: vi.fn(),
    srem: vi.fn(),
    setex: vi.fn(),
    sadd: vi.fn(),
    del: vi.fn(),
  },
}));

let redisAvailable = true;
vi.mock('../../redisClient', () => ({
  getRedisClient: () => (redisAvailable ? mockRedis : null),
}));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  endClassroomGameSession,
  isClassroomSessionEnded,
} from '../classroomGameSession';
import { beginClassroomRound, getActiveClassroomGames } from '../classroomGameManager';
import { isClassroomGameJoinable } from '../../handlers/classroomGameJoinGate';

const CLASSROOM = 'c1a67a70-d94f-4bcc-abe2-a28c461adcd5';
const CODE = 'R438D5';

function record(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    gameCode: CODE,
    classroomId: CLASSROOM,
    teacherId: 't1',
    teacherName: 'gauntlet teacher',
    lessonIds: ['l1'],
    lessonNames: ['Week 3 Vocabulary'],
    vocabularyWords: [],
    settings: {},
    players: [],
    createdAt: '2026-09-10T08:00:00.000Z',
    status: 'playing',
    ...extra,
  });
}

const written = () => JSON.parse((mockRedis.setex as Mock).mock.calls[0][2]);

beforeEach(() => {
  vi.clearAllMocks();
  redisAvailable = true;
  mockRedis.setex.mockResolvedValue('OK');
  mockRedis.sadd.mockResolvedValue(1);
  mockRedis.srem.mockResolvedValue(1);
});

describe('the between-round gap keeps the code alive', () => {
  /**
   * THE GAP THIS ROUND EXISTS TO CLOSE. The teacher's round-one timer has
   * expired, the class is on the results screen, the teacher has not pressed
   * "next round" yet — and a latecomer types the code off the whiteboard.
   */
  it('a round that just finished is still joinable', () => {
    expect(isClassroomGameJoinable({ status: 'finished' })).toBe(true);
    expect(isClassroomSessionEnded({ status: 'finished' })).toBe(false);
  });

  it.each(['waiting', 'playing', 'finished'] as const)(
    'keeps a %s game in the classroom index so the student banner still offers it',
    async (status) => {
      mockRedis.smembers.mockResolvedValue([CODE]);
      mockRedis.get.mockResolvedValue(record({ status }));

      await expect(getActiveClassroomGames(CLASSROOM)).resolves.toHaveLength(1);
      expect(mockRedis.srem).not.toHaveBeenCalled();
    }
  );

  it('still lets the next round reopen a finished game', async () => {
    mockRedis.get.mockResolvedValue(record({ status: 'finished' }));

    await beginClassroomRound(CODE);

    expect(written().status).toBe('playing');
  });
});

describe('endClassroomGameSession', () => {
  it('stamps the terminal marker and drops the code out of the classroom index', async () => {
    mockRedis.get.mockResolvedValue(record({ status: 'finished' }));

    await endClassroomGameSession(CODE);

    const saved = written();
    expect(saved.status).toBe('ended');
    expect(typeof saved.endedAt).toBe('string');
    expect(mockRedis.srem).toHaveBeenCalledWith(`classroom_games:${CLASSROOM}`, CODE);
  });

  /**
   * Kept, not deleted: `gameScores.ts` re-reads the record while it scores the
   * round it just ended (participation bonus, classroom summary). Deleting on
   * end would trade a dead end for a silently lost round — pitfall class 4.
   */
  it('keeps the record readable so the round it just ended can still be scored', async () => {
    mockRedis.get.mockResolvedValue(record({ status: 'finished' }));

    await endClassroomGameSession(CODE);

    expect(mockRedis.del).not.toHaveBeenCalled();
    expect(mockRedis.setex).toHaveBeenCalled();
  });

  it('is a no-op for an ordinary multiplayer room', async () => {
    mockRedis.get.mockResolvedValue(null);

    await endClassroomGameSession('ABCDEF');

    expect(mockRedis.setex).not.toHaveBeenCalled();
    expect(mockRedis.srem).not.toHaveBeenCalled();
  });

  it('is idempotent — a second teardown does not rewrite the record', async () => {
    mockRedis.get.mockResolvedValue(record({ status: 'ended', endedAt: '2026-09-10T09:00:00.000Z' }));

    await endClassroomGameSession(CODE);

    expect(mockRedis.setex).not.toHaveBeenCalled();
  });

  it('costs nothing and never throws when this process has no Redis', async () => {
    redisAvailable = false;

    await expect(endClassroomGameSession(CODE)).resolves.toBeUndefined();
    expect(mockRedis.get).not.toHaveBeenCalled();
  });

  it('never throws when Redis rejects', async () => {
    mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(endClassroomGameSession(CODE)).resolves.toBeUndefined();
  });
});

describe('an ended session is terminal', () => {
  it('is not joinable', () => {
    expect(isClassroomGameJoinable({ status: 'ended' })).toBe(false);
    expect(isClassroomGameJoinable({ status: 'finished', endedAt: 'x' })).toBe(false);
  });

  it('is pruned out of the classroom index', async () => {
    mockRedis.smembers.mockResolvedValue([CODE]);
    mockRedis.get.mockResolvedValue(record({ status: 'ended', endedAt: 'x' }));

    await expect(getActiveClassroomGames(CLASSROOM)).resolves.toEqual([]);
    expect(mockRedis.srem).toHaveBeenCalledWith(`classroom_games:${CLASSROOM}`, CODE);
  });

  /**
   * `beginClassroomRound` runs on EVERY `startGame` in the app. A stray start
   * on a dead code must not resurrect it — that would reopen the original
   * dead-room bug from the other end.
   */
  it('cannot be reopened by a later round start', async () => {
    mockRedis.get.mockResolvedValue(record({ status: 'ended', endedAt: 'x' }));

    await beginClassroomRound(CODE);

    expect(mockRedis.setex).not.toHaveBeenCalled();
    expect(mockRedis.sadd).not.toHaveBeenCalled();
  });
});

/**
 * A record with no status at all stays joinable. Failing closed on a missing
 * field would lock a whole class out of a live round — strictly worse than the
 * bug this fixes (pitfall class 4).
 */
it('treats a record with neither status nor endedAt as joinable', () => {
  expect(isClassroomGameJoinable({})).toBe(true);
  expect(isClassroomSessionEnded({})).toBe(false);
});
