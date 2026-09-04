import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const get = vi.fn();
/**
 * Indirected through a mutable factory so a test can make the CLIENT itself fail without
 * `get` ever recording a rejected promise — vitest reports a rejection stored in
 * `mock.results` as unhandled even when the code under test catches it.
 */
let redisFactory: () => { get: typeof get } = () => ({ get });
vi.mock('@/backend/cache/redisCache', () => ({ getCacheClient: () => redisFactory() }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

import {
  lookupLiveClassroomGame,
  classroomGameKey,
  CLASSROOM_GAME_KEY_PREFIX,
} from '../classroomGameLookup';

beforeEach(() => {
  get.mockReset();
  redisFactory = () => ({ get });
});

describe('lookupLiveClassroomGame', () => {
  it('reads the game the socket server wrote', async () => {
    get.mockResolvedValue(JSON.stringify({
      classroomId: 'c1', lessonIds: ['l1'], teacherName: 'Ms. G',
    }));
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toEqual({
      classroomId: 'c1', lessonIds: ['l1'], teacherName: 'Ms. G',
    });
    expect(get).toHaveBeenCalledWith('classroom_game:TZCOQ7');
  });

  it('returns null when there is no such game', async () => {
    get.mockResolvedValue(null);
    await expect(lookupLiveClassroomGame('ZZZZZZ')).resolves.toBeNull();
  });

  it('returns null instead of throwing when Redis fails', async () => {
    redisFactory = () => { throw new Error('ECONNREFUSED'); };
    const result = await lookupLiveClassroomGame('TZCOQ7');
    expect(result).toBeNull();
  });

  it('returns null on malformed JSON rather than crashing the route', async () => {
    get.mockResolvedValue('{not json');
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toBeNull();
  });

  /**
   * The key is written by `backend/modules/classroomGameManager.ts` and read here. Two
   * definitions of one key is a drift risk, so pin it: if the writer's key format changes,
   * this fails instead of the lookup silently returning null forever.
   */
  it('uses the same Redis key as the socket server that writes it', () => {
    const src = readFileSync(
      join(process.cwd(), 'backend/modules/classroomGameManager.ts'),
      'utf8'
    );
    expect(src).toContain(`\`${CLASSROOM_GAME_KEY_PREFIX}\${gameCode}\``);
    expect(classroomGameKey('ABC123')).toBe('classroom_game:ABC123');
  });
});
