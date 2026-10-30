import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLevel } = vi.hoisted(() => ({ mockLevel: vi.fn() }));
vi.mock('../supabase/classroomMembership', () => ({ getClassroomMembershipLevel: mockLevel }));

import {
  CLASSROOM_LEVEL_TTL_MS,
  clearClassroomLevelCache,
  getClassroomLevelCached,
  invalidateClassroomLevel,
  peekClassroomLevel,
  classroomTeamAbilities,
} from '../classroomLevelCache';

describe('classroom level cache', () => {
  beforeEach(() => {
    clearClassroomLevelCache();
    mockLevel.mockReset();
    mockLevel.mockResolvedValue('support');
  });

  it('loads once, then serves a hit inside the TTL', async () => {
    expect(await getClassroomLevelCached('u1', 'c1', 1_000)).toBe('support');
    mockLevel.mockResolvedValue('challenge');
    expect(await getClassroomLevelCached('u1', 'c1', 1_000 + CLASSROOM_LEVEL_TTL_MS - 1)).toBe('support');
    expect(mockLevel).toHaveBeenCalledTimes(1);
  });

  it('keys by classroom and user', async () => {
    await getClassroomLevelCached('u1', 'c1', 0);
    await getClassroomLevelCached('u1', 'c2', 0);
    await getClassroomLevelCached('u2', 'c1', 0);
    expect(mockLevel).toHaveBeenCalledTimes(3);
  });

  it('reloads after the TTL expires', async () => {
    await getClassroomLevelCached('u1', 'c1', 0);
    mockLevel.mockResolvedValue('challenge');
    expect(await getClassroomLevelCached('u1', 'c1', CLASSROOM_LEVEL_TTL_MS)).toBe('challenge');
    expect(mockLevel).toHaveBeenCalledTimes(2);
  });

  it('reloads after an explicit invalidation', async () => {
    await getClassroomLevelCached('u1', 'c1', 0);
    invalidateClassroomLevel('c1', 'u1');
    mockLevel.mockResolvedValue('challenge');
    expect(await getClassroomLevelCached('u1', 'c1', 1)).toBe('challenge');
  });

  it('peek returns the last known level even past the TTL', async () => {
    expect(peekClassroomLevel('c1', 'u1')).toBeUndefined();
    await getClassroomLevelCached('u1', 'c1', Date.now() - CLASSROOM_LEVEL_TTL_MS * 10);
    expect(peekClassroomLevel('c1', 'u1')).toBe('support');
  });

  it('maps known levels to team abilities and leaves unknown students out', async () => {
    mockLevel.mockImplementation(async (userId: string) => (userId === 'u1' ? 'challenge' : 'support'));
    await getClassroomLevelCached('u1', 'c1', 0);
    await getClassroomLevelCached('u2', 'c1', 0);
    const abilities = classroomTeamAbilities('c1', [
      { username: 'Ana', authUserId: 'u1' },
      { username: 'bo', authUserId: 'u2' },
      { username: 'guest', authUserId: null },
      { username: 'cy', authUserId: 'u3' },
    ]);
    expect(abilities).toEqual({ ana: 3, bo: 1 });
  });
});
