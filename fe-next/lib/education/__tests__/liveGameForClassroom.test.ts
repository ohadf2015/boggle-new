/**
 * A student who types the PERMANENT ROSTER code while their class is mid-game.
 *
 * `lookupLiveClassroomGame` answers "which classroom does this GAME code belong
 * to". This is the other direction — "is this classroom playing right now" —
 * and without it the roster code was a dead end: the join route enrolled the
 * student, returned no `gameCode`, and `useJoinFlow` pushed them to `/student`
 * with a success toast while their class played on. Two systems mint six-char
 * codes into one field (see `classroomGameLookup`), the game code walked a
 * student in from 2026-09-04, and the roster code — the one on the handout and
 * in Google Classroom — never did.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const smembers = vi.fn();
let redisFactory: () => { get: typeof get; smembers: typeof smembers } = () => ({ get, smembers });
vi.mock('@/backend/cache/redisCache', () => ({ getCacheClient: () => redisFactory() }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

import { lookupLiveGameForClassroom } from '../liveGameForClassroom';

const live = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ classroomId: 'c1', createdAt: '2026-09-14T19:00:00.000Z', ...over });

beforeEach(() => {
  get.mockReset();
  smembers.mockReset();
  redisFactory = () => ({ get, smembers });
});

describe('lookupLiveGameForClassroom', () => {
  it('finds the live game code for a classroom that is playing', async () => {
    smembers.mockResolvedValue(['TZCOQ7']);
    get.mockResolvedValue(live());
    await expect(lookupLiveGameForClassroom('c1')).resolves.toBe('TZCOQ7');
    expect(smembers).toHaveBeenCalledWith('classroom_games:c1');
  });

  it('returns null when the classroom has no live game', async () => {
    smembers.mockResolvedValue([]);
    await expect(lookupLiveGameForClassroom('c1')).resolves.toBeNull();
  });

  /**
   * The set keeps an ended game for the rest of its 4h TTL. Handing that code
   * back would walk the student into a dead room — the exact bug
   * `classroomGameManager` prunes for on its own poll.
   */
  it('ignores a game whose session the teacher ended', async () => {
    smembers.mockResolvedValue(['ENDED1']);
    get.mockResolvedValue(live({ endedAt: '2026-09-14T20:30:00.000Z' }));
    await expect(lookupLiveGameForClassroom('c1')).resolves.toBeNull();
  });

  /** A Redis set has no order, so "whichever came back first" is a coin flip. */
  it('picks the most recently created game when a classroom has more than one', async () => {
    smembers.mockResolvedValue(['OLDER1', 'NEWER1']);
    get.mockImplementation((key: string) =>
      Promise.resolve(
        key === 'classroom_game:NEWER1'
          ? live({ createdAt: '2026-09-14T20:00:00.000Z' })
          : live({ createdAt: '2026-09-14T19:00:00.000Z' })
      )
    );
    await expect(lookupLiveGameForClassroom('c1')).resolves.toBe('NEWER1');
  });

  /** A stale code still in the set must not shadow the game that is running. */
  it('skips an expired record and returns the one that is still live', async () => {
    smembers.mockResolvedValue(['GONE01', 'ALIVE1']);
    get.mockImplementation((key: string) =>
      Promise.resolve(key === 'classroom_game:ALIVE1' ? live() : null)
    );
    await expect(lookupLiveGameForClassroom('c1')).resolves.toBe('ALIVE1');
  });

  /** Redis down must never block a join that would otherwise succeed. */
  it('returns null rather than throwing when Redis fails', async () => {
    redisFactory = () => { throw new Error('ECONNREFUSED'); };
    await expect(lookupLiveGameForClassroom('c1')).resolves.toBeNull();
  });
});
