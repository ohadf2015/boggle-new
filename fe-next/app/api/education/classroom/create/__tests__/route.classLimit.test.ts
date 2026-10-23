import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => ({ id: 'teacher-1', email: 't@lexiclash.test' })) }));
vi.mock('@/lib/subscriptions', () => ({
  canCreateClass: vi.fn(async () => ({ allowed: false, currentCount: 3, limit: 3, reason: 'cap' })),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

describe('POST /api/education/classroom/create — free class cap', () => {
  it('403s a free teacher at the class cap and creates nothing', async () => {
    const res = await POST(
      new Request('http://t/api/education/classroom/create', { method: 'POST', body: JSON.stringify({ name: '4th', language: 'en' }) }) as never,
    );
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'CLASS_LIMIT_REACHED', limit: 3 });
    expect(createClient).not.toHaveBeenCalled();
  });
});
