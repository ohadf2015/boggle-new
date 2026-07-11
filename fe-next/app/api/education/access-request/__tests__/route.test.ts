import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mutable auth/db state the mocked Supabase client reads from, reset per test.
let mockUser:
  | { id: string; email: string | null; email_confirmed_at: string | null; user_metadata?: Record<string, unknown> }
  | null = null;
let recentCount = 0;
let mockProfile: { display_name?: string | null; username?: string | null; country_code?: string | null } | null = null;
let insertMock = vi.fn(async () => ({ data: { id: 'req-1' }, error: null }));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
    from: (table: string) => ({
      insert: insertMock,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          // Rate-limit count query (teacher_access_requests)
          gte: vi.fn(async () => ({ data: [], count: recentCount, error: null })),
          // Profile lookup for server-derived name/country
          maybeSingle: vi.fn(async () =>
            table === 'profiles' ? { data: mockProfile, error: null } : { data: null, error: null }
          ),
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

// Email, name, and country now come from the authenticated account/profile —
// never from the body. The client only sends role, locale, use_case, school.
const validPayload = {
  role: 'teacher',
  locale: 'en',
  use_case: 'I want to use this with 9th grade ESL.',
};

const verifiedUser = () => ({
  id: 'user-1',
  email: 'jane@school.edu',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  user_metadata: { full_name: 'Jane Meta' },
});

describe('POST /api/education/access-request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = verifiedUser();
    recentCount = 0;
    mockProfile = { display_name: 'Jane Doe', username: 'janed', country_code: 'US' };
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

  it('derives name and country from the profile, ignoring any body-supplied name', async () => {
    await POST(mkReq({ ...validPayload, full_name: 'Body Spoof', country: 'ZZ' }));
    const row = insertMock.mock.calls[0][0] as any;
    expect(row.full_name).toBe('Jane Doe'); // profile.display_name
    expect(row.country).toBe('US'); // profile.country_code
  });

  it('falls back to account metadata, then email prefix, when no profile name', async () => {
    mockProfile = { display_name: null, username: null, country_code: null };
    await POST(mkReq(validPayload));
    let row = insertMock.mock.calls[0][0] as any;
    expect(row.full_name).toBe('Jane Meta'); // user_metadata.full_name

    insertMock.mockClear();
    mockUser = { id: 'user-1', email: 'jane@school.edu', email_confirmed_at: '2026-01-01T00:00:00Z' };
    await POST(mkReq(validPayload));
    row = insertMock.mock.calls[0][0] as any;
    expect(row.full_name).toBe('jane'); // email prefix
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
