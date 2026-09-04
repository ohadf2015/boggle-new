import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => ({ id: 'u1', email: 't@x.org' }) }));
const update = vi.fn(() => ({ eq: () => ({ is: () => ({ select: async () => ({ data: [{ id: 'g1' }], error: null }) }) }) }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: () => ({ update }) }) }));

import { POST } from '../route';

/**
 * The celebration marker is written at SHOW time, from the client, the moment the
 * modal renders — never at dismiss time (a reload without dismissing would re-pop it;
 * recurring pitfall class 1).
 */
describe('POST /api/subscription/pro-welcome-seen', () => {
  it('stamps welcomed_at on the caller\'s own unwelcomed grant', async () => {
    const res = await POST(new NextRequest('http://localhost/api/subscription/pro-welcome-seen', { method: 'POST' }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ welcomed_at: expect.any(String) }));
  });
});
