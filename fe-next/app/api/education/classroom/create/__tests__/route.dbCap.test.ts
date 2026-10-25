import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => ({ id: 'teacher-1', email: 't@lexiclash.test' })) }));
vi.mock('@/lib/subscriptions', () => ({
  canCreateClass: vi.fn(async () => ({ allowed: true, currentCount: 2, limit: 3 })),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const insert = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'c1' }, error: null }) }) });
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    from: () => ({
      select: () => ({ eq: async () => ({ count: 2, error: null }) }),
      insert,
    }),
  });
});

const post = (body: unknown) =>
  POST(new Request('http://t/api/education/classroom/create', { method: 'POST', body: JSON.stringify(body) }) as never);

describe('POST /api/education/classroom/create — names and the database cap', () => {
  it('rejects a whitespace-only name', async () => {
    const res = await post({ name: '   ', language: 'en' });
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it('stores the trimmed name', async () => {
    await post({ name: '  Period 3  ', language: 'en' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Period 3' }));
  });

  it('answers a cap the database caught (parallel create) as the upgrade 403', async () => {
    insert.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: null,
          error: { code: 'P0001', message: 'CLASS_LIMIT_REACHED', details: '{"currentCount" : 3, "limit" : 3}' },
        }),
      }),
    });
    const res = await post({ name: 'Fourth', language: 'en' });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'CLASS_LIMIT_REACHED', currentCount: 3, limit: 3 });
  });
});
