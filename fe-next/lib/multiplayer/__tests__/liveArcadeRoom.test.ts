import { describe, it, expect, vi, beforeEach } from 'vitest';

const hmget = vi.fn();
let redisFactory: () => { hmget: typeof hmget } | null = () => ({ hmget });
vi.mock('@/backend/cache/redisCache', () => ({ getCacheClient: () => redisFactory() }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

import { isLiveArcadeRoom } from '../liveArcadeRoom';
import { KEYS } from '@/backend/redis/keys';

beforeEach(() => {
  hmget.mockReset();
  redisFactory = () => ({ hmget });
});

describe('isLiveArcadeRoom', () => {
  it('reads the room hash the socket server persists', async () => {
    hmget.mockResolvedValue(['waiting', 'false']);
    await expect(isLiveArcadeRoom('B3Y98K')).resolves.toBe(true);
    expect(hmget).toHaveBeenCalledWith(KEYS.game('B3Y98K'), 'gameState', 'isClassroom');
  });

  it('is false when no room hash exists', async () => {
    hmget.mockResolvedValue([null, null]);
    await expect(isLiveArcadeRoom('ZZZZZZ')).resolves.toBe(false);
  });

  it('leaves classroom rooms to the classroom path', async () => {
    hmget.mockResolvedValue(['waiting', 'true']);
    await expect(isLiveArcadeRoom('CLS123')).resolves.toBe(false);
  });

  it('answers false instead of throwing when Redis fails', async () => {
    redisFactory = () => {
      throw new Error('down');
    };
    await expect(isLiveArcadeRoom('B3Y98K')).resolves.toBe(false);
  });
});
