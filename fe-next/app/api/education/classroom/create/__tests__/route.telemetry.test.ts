import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({
    capture: (arg: { distinctId: string; event: string; properties: Record<string, unknown> }) => {
      captured.push(arg);
    },
  }),
}));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(async () => ({ id: 'teacher-1', email: 'teacher@example.com' })),
}));
vi.mock('@/lib/subscriptions', () => ({
  canCreateClass: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 2 })),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const insertOk = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: 'c-1' }, error: null }) }) }));
const insertFails = vi.fn(() => ({
  select: () => ({ single: async () => ({ data: null, error: { message: 'boom' } }) }),
}));

const req = (body: unknown) =>
  new Request('http://t/api/education/classroom/create', { method: 'POST', body: JSON.stringify(body) }) as never;

const created = () => captured.filter((c) => c.event === 'edu_classroom_created');

describe('POST /api/education/classroom/create — edu_classroom_created', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.length = 0;
  });

  it('Given a created classroom, When POSTed, Then exactly one event fires for the teacher with the classroom id', async () => {
    (createClient as any).mockResolvedValue({ from: vi.fn(() => ({ insert: insertOk })) });

    const res = await POST(req({ name: 'Class A', language: 'en' }));

    expect(res.status).toBe(201);
    expect(created()).toHaveLength(1);
    expect(created()[0].distinctId).toBe('teacher-1');
    expect(created()[0].properties).toMatchObject({ classroom_id: 'c-1', language: 'en', is_test_account: false });
  });

  it('Given the insert fails, When POSTed, Then no classroom event fires', async () => {
    (createClient as any).mockResolvedValue({ from: vi.fn(() => ({ insert: insertFails })) });

    const res = await POST(req({ name: 'Class A', language: 'en' }));

    expect(res.status).toBe(500);
    expect(created()).toHaveLength(0);
  });
});
