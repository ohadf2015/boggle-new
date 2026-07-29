import { describe, it, expect, vi, beforeEach } from 'vitest';

const adminProfile = { id: 'admin-1', is_admin: true };
const userProfile = { id: 'user-1', is_admin: false };

const mockSupabase = (profile: any, requestRow: any = null) => ({
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: profile.id } }, error: null })) },
  from: vi.fn((table: string) => {
    if (table === 'profiles') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    if (table === 'teacher_access_requests') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: requestRow, error: null }) }) }),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    if (table === 'teacher_access_allowlist') return {
      insert: vi.fn(async () => ({ error: null })),
    };
    return {};
  }),
});

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));

import { POST as approve } from '../[id]/approve/route';
import { POST as decline } from '../[id]/decline/route';
import { GET as list } from '../route';
import { createClient } from '@/utils/supabase/server';

const req = (body?: any) => new Request('http://t', { method: 'POST', body: body ? JSON.stringify(body) : undefined });

describe('admin teacher-access endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approve rejects non-admin', async () => {
    (createClient as any).mockReturnValue(mockSupabase(userProfile));
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(403);
  });

  it('approve flips status and allowlists email when no user_id', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en' };
    const sb = mockSupabase(adminProfile, row);
    (createClient as any).mockReturnValue(sb);
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
  });

  it('decline writes admin_note and status', async () => {
    const row = { id: 'req-1', user_id: 'u-1', email: 'x@y.com', full_name: 'X', locale: 'en' };
    const sb = mockSupabase(adminProfile, row);
    (createClient as any).mockReturnValue(sb);
    const res = await decline(req({ reason: 'incomplete info' }), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
  });

  it('list rejects non-admin', async () => {
    (createClient as any).mockReturnValue(mockSupabase(userProfile));
    const res = await list(new Request('http://t'));
    expect(res.status).toBe(403);
  });
});
