/**
 * "Active" must mean joinable.
 *
 * Live Redis on 2026-09-05, from the critic's own session:
 *
 *   classroom_games:c1a67a70… => VHTDFB, R438D5, 9K9NB4
 *   classroom_game:R438D5     => { lessonNames: ["Flow Check Words"], status: "finished" }
 *   classroom_game:VHTDFB     => { lessonNames: ["Week 3 Vocabulary"], status: "waiting"  }
 *
 * Three games, one classroom, and `getActiveClassroomGames` returned all three.
 * It pruned only games whose Redis key had EXPIRED; a game explicitly marked
 * `finished` stayed in the set for the rest of its four-hour TTL.
 *
 * The student banner shows `games[0]`, and set membership has no order, so a
 * student saw whichever game Redis handed back first — routinely a finished one,
 * or one whose lesson belonged to a different period the teacher had run
 * earlier. Tapping JOIN walked them into a dead room, which is the generic
 * multiplayer hub saying "No battles in progress", with no error.
 *
 * The critic filed this as a cross-CLASSROOM leak. It is not: the classroom
 * scoping is correct at every layer. It is a cross-GAME leak inside one
 * classroom, and an ended game being advertised as live.
 *
 * "Ended", not `status: 'finished'`. That status is written at the end of every
 * ROUND, and the teacher presses "next round" seconds to minutes later, so
 * pruning on it hid a lesson that was still running from its own class — the
 * banner went blank the moment the timer expired. The terminal marker is
 * `endedAt` (`backend/modules/classroomGameSession.ts`), written once when the
 * teacher ends the game or its room is torn down.
 */
import { vi, type Mock } from 'vitest';

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: { smembers: vi.fn(), get: vi.fn(), srem: vi.fn(), setex: vi.fn(), sadd: vi.fn(), del: vi.fn() },
}));

vi.mock('../../redisClient', () => ({ getRedisClient: () => mockRedis }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getActiveClassroomGames } from '../classroomGameManager';

const CLASSROOM = 'c1a67a70-d94f-4bcc-abe2-a28c461adcd5';

function game(gameCode: string, status: string, lessonName: string) {
  return JSON.stringify({
    gameCode,
    classroomId: CLASSROOM,
    teacherId: 't1',
    teacherName: 'gauntlet teacher',
    lessonIds: ['l1'],
    lessonNames: [lessonName],
    vocabularyWords: [],
    settings: {},
    players: [],
    createdAt: '2026-09-05T13:43:43.871Z',
    status,
  });
}

describe('getActiveClassroomGames — active means joinable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.srem.mockResolvedValue(1);
  });

  it('does not return a game whose session the teacher ended', async () => {
    // GIVEN the exact live state: one waiting game and one ended one
    (mockRedis.smembers as Mock).mockResolvedValue(['R438D5', 'VHTDFB']);
    (mockRedis.get as Mock).mockImplementation(async (key: string) =>
      key.endsWith('R438D5') ? game('R438D5', 'ended', 'Flow Check Words')
        : game('VHTDFB', 'waiting', 'Week 3 Vocabulary')
    );

    // WHEN a student's banner asks what is live in their classroom
    const games = await getActiveClassroomGames(CLASSROOM);

    // THEN only the one they can actually walk into comes back
    expect(games.map((g) => g.gameCode)).toEqual(['VHTDFB']);
  });

  it('prunes the ended game from the set so it stops being offered', async () => {
    // GIVEN an ended game still sitting in the classroom's set
    (mockRedis.smembers as Mock).mockResolvedValue(['R438D5']);
    (mockRedis.get as Mock).mockResolvedValue(game('R438D5', 'ended', 'Flow Check Words'));

    // WHEN the list is read
    await getActiveClassroomGames(CLASSROOM);

    // THEN it is removed, exactly as an expired key already was — otherwise it
    // is re-filtered on every 15-second poll for four hours
    expect(mockRedis.srem).toHaveBeenCalledWith(`classroom_games:${CLASSROOM}`, 'R438D5');
  });

  /**
   * The between-round gap. Round one's timer has expired, the class is on the
   * results screen, the teacher has not pressed "next round" yet — and the
   * banner must still offer the game, because a latecomer can still join it.
   */
  it('still offers a game whose round just finished', async () => {
    (mockRedis.smembers as Mock).mockResolvedValue(['R438D5']);
    (mockRedis.get as Mock).mockResolvedValue(game('R438D5', 'finished', 'Flow Check Words'));

    const games = await getActiveClassroomGames(CLASSROOM);

    expect(games.map((g) => g.gameCode)).toEqual(['R438D5']);
    expect(mockRedis.srem).not.toHaveBeenCalled();
  });

  it('still returns waiting and playing games', async () => {
    // GIVEN a lobby and a round in progress
    (mockRedis.smembers as Mock).mockResolvedValue(['AAA111', 'BBB222']);
    (mockRedis.get as Mock).mockImplementation(async (key: string) =>
      key.endsWith('AAA111') ? game('AAA111', 'waiting', 'One') : game('BBB222', 'playing', 'Two')
    );

    // WHEN the list is read
    const games = await getActiveClassroomGames(CLASSROOM);

    // THEN a student can join either
    expect(games.map((g) => g.gameCode).sort()).toEqual(['AAA111', 'BBB222']);
    expect(mockRedis.srem).not.toHaveBeenCalled();
  });

  it('still prunes a game whose key expired', async () => {
    // GIVEN a code in the set whose record is gone
    (mockRedis.smembers as Mock).mockResolvedValue(['GONE01']);
    (mockRedis.get as Mock).mockResolvedValue(null);

    // WHEN the list is read
    const games = await getActiveClassroomGames(CLASSROOM);

    // THEN the existing expiry cleanup is unchanged
    expect(games).toEqual([]);
    expect(mockRedis.srem).toHaveBeenCalledWith(`classroom_games:${CLASSROOM}`, 'GONE01');
  });
});
