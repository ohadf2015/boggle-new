import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.hoisted(() => vi.fn());
const offline = vi.hoisted(() => ({ on: false }));
vi.mock('@/utils/authFetch', () => ({
  postWithAuth: async (...a: unknown[]) => {
    if (offline.on) throw new TypeError('Failed to fetch');
    return post(...a);
  },
}));
vi.mock('@/utils/supabase/loadClient', () => ({ loadSupabaseClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { sendFriendRequest, acceptFriendRequest, blockUser } from '../friends';

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

describe('friend writes', () => {
  beforeEach(() => {
    post.mockReset();
    offline.on = false;
  });

  it('Given a send, Then it posts the action to the server route with the session', async () => {
    post.mockResolvedValue(json(200, { success: true }));
    expect(await sendFriendRequest('u2')).toEqual({ success: true });
    expect(post).toHaveBeenCalledWith('/api/friends/action', { action: 'request', target: 'u2' }, { requireSession: true });
  });

  it('Given the server rejects by policy, Then the code comes back', async () => {
    post.mockResolvedValue(json(403, { success: false, code: 'SOCIAL_RESTRICTED' }));
    expect(await acceptFriendRequest('r1')).toMatchObject({ success: false, code: 'SOCIAL_RESTRICTED' });
  });

  it('Given the network fails, Then it reports failure instead of throwing', async () => {
    offline.on = true;
    expect(await blockUser('u2')).toMatchObject({ success: false, code: 'NETWORK' });
  });
});
