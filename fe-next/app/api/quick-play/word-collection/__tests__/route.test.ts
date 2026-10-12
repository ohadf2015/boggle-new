import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (req: Request) => getAuthedUser(req) }));

const remoteGetUser = vi.fn();
const eq = vi.fn();
let rows: Array<{ word: string }> = [];
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: remoteGetUser },
    from: () => ({
      select: () => ({
        eq: (col: string, val: string) => {
          eq(col, val);
          return { limit: async () => ({ data: rows, error: null }) };
        },
      }),
    }),
  }),
}));

import { GET } from '../route';

const req = () => new NextRequest('http://localhost/api/quick-play/word-collection');

describe('GET /api/quick-play/word-collection', () => {
  beforeEach(() => {
    getAuthedUser.mockReset();
    remoteGetUser.mockReset();
    eq.mockReset();
    rows = [];
  });

  it('given a verified session, returns that player\'s unique words without a remote auth call', async () => {
    getAuthedUser.mockResolvedValue({ id: 'player-1' });
    rows = [{ word: 'House' }, { word: 'house' }, { word: 'tree' }];

    const res = await GET(req());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ collected: ['house', 'tree'], total: 2 });
    expect(eq).toHaveBeenCalledWith('player_id', 'player-1');
    expect(remoteGetUser).not.toHaveBeenCalled();
  });

  it('given no session, returns 401 without reading the collection', async () => {
    getAuthedUser.mockResolvedValue(null);

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(eq).not.toHaveBeenCalled();
  });
});
