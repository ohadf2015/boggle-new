import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mutable auth/db state the mocked Supabase client reads from, reset per test.
let mockUser: { id: string; email: string | null; email_confirmed_at: string | null } | null = null;
let recentCount = 0;
let insertMock = vi.fn(async () => ({ data: { id: 'req-1' }, error: null }));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
    from: () => ({
      insert: insertMock,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(async () => ({ data: [], count: recentCount, error: null })),
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

// Email now comes from the authenticated, verified account — not the body.
const validPayload = {
  full_name: 'Jane Doe',
  role: 'teacher',
  locale: 'en',
  use_case: 'I want to use this with 9th grade ESL.',
};

const verifiedUser = () => ({
  id: 'user-1',
  email: 'jane@school.edu',
  email_confirmed_at: '2026-01-01T00:00:00Z',
});

describe('POST /api/education/access-request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = verifiedUser();
    recentCount = 0;
    insertMock = vi.fn(async () => ({ data: { id: 'req-1' }, error: null }));
  });

  it('200 for a signed-up, email-verified user', async () => {
    const res = await POST(mkReq(validPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('stamps user_id and the verified account email onto the row', async () => {
    // Body email is spoofed — the verified account email must win.
    await POST(mkReq({ ...validPayload, email: 'spoofed@evil.com' }));
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0] as any;
    expect(row.user_id).toBe('user-1');
    expect(row.email).toBe('jane@school.edu');
  });

  it('401 when the visitor is not signed in', async () => {
    mockUser = null;
    const res = await POST(mkReq(validPayload));
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('403 when the account email is not verified', async () => {
    mockUser = { id: 'user-1', email: 'jane@school.edu', email_confirmed_at: null };
    const res = await POST(mkReq(validPayload));
    expect(res.status).toBe(403);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('400 if full_name missing', async () => {
    const { full_name, ...bad } = validPayload;
    const res = await POST(mkReq(bad));
    expect(res.status).toBe(400);
  });

  it('400 if use_case > 800 chars', async () => {
    const res = await POST(mkReq({ ...validPayload, use_case: 'x'.repeat(801) }));
    expect(res.status).toBe(400);
  });

  it('400 if role unknown', async () => {
    const res = await POST(mkReq({ ...validPayload, role: 'janitor' }));
    expect(res.status).toBe(400);
  });

  it('429 when 3 requests already exist in 24h', async () => {
    recentCount = 3;
    const res = await POST(mkReq(validPayload));
    expect(res.status).toBe(429);
  });
});
