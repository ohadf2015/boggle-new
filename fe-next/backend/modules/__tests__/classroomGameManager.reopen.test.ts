/**
 * A second round must bring the code back to life.
 *
 * The gate that shuts an ended game's code keys on `endedAt`, precisely because
 * `status: 'finished'` is written at the end of EVERY round, not at the end of
 * the lesson: `gameScores.ts:405` for a board round, `vocabQuizRound.ts:92` for
 * a quiz. Nothing wrote that status back, so the round start has to.
 *
 *   - `startClassroomGame` refuses any status other than `'waiting'`, so it
 *     cannot reopen a finished game — and no client emits that event at all.
 *   - The teacher's "Rematch" is `onReturnToRoom`: the SAME room, the SAME
 *     game code, a new round.
 *
 * So round one ending killed the projector code for the rest of the lesson. A
 * student who dropped wifi during round two and re-scanned the QR was told
 * their code was not recognised while the class was actively playing it — the
 * exact dead end this piece exists to remove, just moved one round later.
 *
 * Both halves matter. Writing `status: 'playing'` without the SADD leaves the
 * code out of the classroom's index set, so `getActiveClassroomGames` keeps
 * answering "no live game" and the student hub's banner never advertises round
 * two: a dead end traded for an invisible game.
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

vi.mock('../../redisClient', () => ({ getRedisClient: () => mockRedis }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { beginClassroomRound, reopenClassroomGameForRound } from '../classroomGameManager';

const CLASSROOM = 'c1a67a70-d94f-4bcc-abe2-a28c461adcd5';
const CODE = 'R438D5';

function record(status: string) {
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
    status,
  });
}

const writtenRecord = () => JSON.parse((mockRedis.setex as Mock).mock.calls[0][2]);

describe('reopenClassroomGameForRound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.sadd.mockResolvedValue(1);
  });

  it('flips a finished game back to playing', async () => {
    // GIVEN the code of a game whose first round ended
    mockRedis.get.mockResolvedValue(record('finished'));

    // WHEN the teacher starts another round in the same room
    await reopenClassroomGameForRound(CODE);

    // THEN the record says the round is live again
    expect(mockRedis.setex).toHaveBeenCalledTimes(1);
    expect(writtenRecord().status).toBe('playing');
  });

  it('puts the code back in the classroom index whatever pruned it', async () => {
    // GIVEN the same finished game. Nothing prunes on `finished` any more, but
    // an earlier `ended` write (or an expired key) may have taken it out, and
    // the round start must be able to put it back.
    mockRedis.get.mockResolvedValue(record('finished'));

    // WHEN the round restarts
    await reopenClassroomGameForRound(CODE);

    // THEN the student hub can find it again
    expect(mockRedis.sadd).toHaveBeenCalledWith(`classroom_games:${CLASSROOM}`, CODE);
  });

  it('stamps startedAt when the record never carried one', async () => {
    mockRedis.get.mockResolvedValue(record('waiting'));

    await reopenClassroomGameForRound(CODE);

    expect(writtenRecord().startedAt).toEqual(expect.any(String));
  });

  it('writes nothing when the game is already playing', async () => {
    // Every round start calls this. A no-op costs one Redis read, not a write
    // and a fresh four-hour TTL on a record nobody changed.
    mockRedis.get.mockResolvedValue(record('playing'));

    await reopenClassroomGameForRound(CODE);

    expect(mockRedis.setex).not.toHaveBeenCalled();
    expect(mockRedis.sadd).not.toHaveBeenCalled();
  });

  it('does nothing for an ordinary multiplayer room', async () => {
    // No classroom record under this code — the common case, since this runs on
    // every game start.
    mockRedis.get.mockResolvedValue(null);

    await reopenClassroomGameForRound('PLAIN1');

    expect(mockRedis.setex).not.toHaveBeenCalled();
    expect(mockRedis.sadd).not.toHaveBeenCalled();
  });

  it('never throws when Redis is down — a round must start regardless', async () => {
    mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(reopenClassroomGameForRound(CODE)).resolves.toBeUndefined();
  });
});

/**
 * `beginClassroomRound` is the same reopen, folded into the read game start
 * already performs.
 *
 * Game start needs two things at that point: the classroom record (for the
 * lesson words) and the record marked live. Doing them as two calls meant two
 * Redis reads of the same key on every start in the app, and left a window
 * where the placed-vocabulary write a few hundred lines later could be
 * clobbered by a reopen still in flight. One awaited call, one read, no race.
 */
describe('beginClassroomRound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.sadd.mockResolvedValue(1);
  });

  it('hands game start the classroom record it was already reading', async () => {
    // GIVEN a classroom game whose previous round finished
    mockRedis.get.mockResolvedValue(record('finished'));

    // WHEN the next round starts
    const game = await beginClassroomRound(CODE);

    // THEN start gets the record (lesson words and settings come off it)
    expect(game?.gameCode).toBe(CODE);
    expect(game?.classroomId).toBe(CLASSROOM);
  });

  it('marks the code live again so a re-scanned QR still resolves', async () => {
    mockRedis.get.mockResolvedValue(record('finished'));

    await beginClassroomRound(CODE);

    expect(writtenRecord().status).toBe('playing');
    expect(mockRedis.sadd).toHaveBeenCalledWith(`classroom_games:${CLASSROOM}`, CODE);
  });

  it('reads the key once, not twice', async () => {
    // It replaces `getClassroomGame` at the call site rather than joining it.
    mockRedis.get.mockResolvedValue(record('finished'));

    await beginClassroomRound(CODE);

    expect(mockRedis.get).toHaveBeenCalledTimes(1);
  });

  it('returns null and writes nothing for an ordinary multiplayer room', async () => {
    // The overwhelmingly common case: this runs on EVERY game start.
    mockRedis.get.mockResolvedValue(null);

    await expect(beginClassroomRound('PLAIN1')).resolves.toBeNull();
    expect(mockRedis.setex).not.toHaveBeenCalled();
  });

  it('still returns the record when the write fails — the round must start', async () => {
    // Redis half-down: the code may stay shut, but nobody is blocked from
    // playing, and the failure is logged rather than swallowed (class 4).
    mockRedis.get.mockResolvedValue(record('finished'));
    mockRedis.setex.mockRejectedValue(new Error('READONLY'));

    const game = await beginClassroomRound(CODE);

    expect(game?.gameCode).toBe(CODE);
  });

  it('never throws when the read itself fails', async () => {
    mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(beginClassroomRound(CODE)).resolves.toBeNull();
  });
});
