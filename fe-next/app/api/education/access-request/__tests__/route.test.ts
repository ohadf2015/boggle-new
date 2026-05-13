import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      insert: vi.fn(async () => ({ data: { id: 'req-1' }, error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(async () => ({ data: [], count: 0, error: null })),
        })),
      })),
    }),
  }),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

const mkReq = (body: any): Request => new Request('http://test/api/education/access-request', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const validPayload = {
  email: 'jane@school.edu',
  full_name: 'Jane Doe',
  role: 'teacher',
  locale: 'en',
  use_case: 'I want to use this with 9th grade ESL.',
};

describe('POST /api/education/access-request', () => {
  beforeEach(() => vi.clearAllMocks());

  it('200 on valid payload', async () => {
    const res = await POST(mkReq(validPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('400 if email missing', async () => {
    const { email, ...bad } = validPayload;
    const res = await POST(mkReq(bad));
    expect(res.status).toBe(400);
  });

  it('400 if use_case > 800 chars', async () => {
    const res = await POST(mkReq({ ...validPayload, use_case: 'x'.repeat(801) }));
    expect(res.status).toBe(400);
  });

  it('400 if email malformed', async () => {
    const res = await POST(mkReq({ ...validPayload, email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('400 if role unknown', async () => {
    const res = await POST(mkReq({ ...validPayload, role: 'janitor' }));
    expect(res.status).toBe(400);
  });
});
