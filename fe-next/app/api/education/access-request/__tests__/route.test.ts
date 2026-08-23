import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mutable auth/db state the mocked Supabase client reads from, reset per test.
let mockUser:
  | { id: string; email: string | null; email_confirmed_at: string | null; user_metadata?: Record<string, unknown> }
  | null = null;
let recentCount = 0;
let mockProfile: { display_name?: string | null; username?: string | null; country_code?: string | null } | null = null;
let insertMock = vi.fn(async () => ({ data: { id: 'req-1' }, error: null }));
let selectMock = vi.fn(async () => ({ data: [] }));
let approveMock = vi.fn(async (_args?: any) => ({ data: [{ id: 'req-1' }], error: null }));
let adminSelectMock = vi.fn(async () => ({ data: [{ id: 'user-1' }], error: null }));
let adminAvailable = true;
let sendEmailMock = vi.fn(async (_args: any) => ({ ok: true as boolean, error: undefined as string | undefined }));

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

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    if (!adminAvailable) return null;
    return {
      from: (table: string) => {
        if (table === 'teacher_access_requests') {
          return {
            update: (values: any) => ({
              eq: (key: string, val: string) => ({
                eq: (key2: string, val2: string) => ({
                  select: (cols: string) => {
                    return Promise.resolve(approveMock({ table, values, key, val, key2, val2, cols }));
                  },
                }),
              }),
            }),
            select: (cols: string) => ({
              eq: (key: string, val: string) => ({
                eq: (key2: string, val2: string) => ({
                  limit: (count: number) => {
                    return Promise.resolve(selectMock());
                  },
                }),
              }),
            }),
          };
        } else if (table === 'profiles') {
          return {
            update: (values: any) => ({
              eq: (key: string, val: string) => ({
                select: (cols: string) => {
                  return Promise.resolve(adminSelectMock({ table, values, key, val, cols }));
                },
              }),
            }),
          };
        }
        // For any other table, return an object that will cause the test to fail if used.
        return {
          update: () => { throw new Error(`Unexpected table ${table}`); },
          select: () => { throw new Error(`Unexpected table ${table}`); },
        };
      },
    };
  },
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: (args: any) => sendEmailMock(args),
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
    approveMock = vi.fn(async () => ({ data: [{ id: 'req-1' }], error: null }));
    adminSelectMock = vi.fn(async () => ({ data: [{ id: 'user-1' }], error: null }));
    adminAvailable = true;
    sendEmailMock = vi.fn(async () => ({ ok: true, error: undefined }));
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
    expect(insertMock).not.toHaveBeenCalled();
    expect(approveMock).not.toHaveBeenCalled();
  });

  describe('instant auto-approval', () => {
    it('marks the request approved with trial expiry + reviewed_at right after insert (via admin client — RLS has no user UPDATE policy)', async () => {
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      expect(approveMock).toHaveBeenCalledTimes(1);
      const call = approveMock.mock.calls[0][0] as any;
      expect(call.table).toBe('teacher_access_requests');
      expect(call.key).toBe('user_id');
      expect(call.val).toBe('user-1');
      expect(call.key2).toBe('status');
      expect(call.val2).toBe('pending');
      const update = call.values;
      expect(update.status).toBe('approved');
      expect(typeof update.trial_expires_at).toBe('string');
      // Trial is ~14 days out — just verify it parses and is in the future.
      expect(new Date(update.trial_expires_at).getTime()).toBeGreaterThan(Date.now());
      expect(typeof update.reviewed_at).toBe('string');
    });

    it('500s when the approval matched no request row (silent no-op guard)', async () => {
      approveMock = vi.fn(async () => ({ data: [], error: null }));
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(500);
      expect(adminSelectMock).not.toHaveBeenCalled();
    });

    it('promotes the profile to teacher via the admin (service-role) client', async () => {
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      expect(adminSelectMock).toHaveBeenCalledTimes(1);
      const call = adminSelectMock.mock.calls[0][0] as any;
      expect(call.table).toBe('profiles');
      expect(call.values).toEqual({ user_role: 'teacher' });
      expect(call.key).toBe('id');
      expect(call.val).toBe('user-1');
    });

    it('500s when the promotion matched no profile row (silent no-op guard)', async () => {
      adminSelectMock = vi.fn(async () => ({ data: [], error: null }));
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(500);
    });

    it('500s when the admin client is not configured', async () => {
      adminAvailable = false;
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(500);
    });

    it('still answers 200 when the confirmation email fails', async () => {
      sendEmailMock = vi.fn(async () => ({ ok: false, error: 'resend down' }));
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('sends the admin notify + the confirmation to the verified account email', async () => {
      await POST(mkReq(validPayload));
      expect(sendEmailMock).toHaveBeenCalledTimes(2);
      const recipients = sendEmailMock.mock.calls.map((c) => (c[0] as any).to);
      expect(recipients).toContain('lexiclash.game@gmail.com');
      expect(recipients).toContain('jane@school.edu');
    });

    it('accepts the ru locale (COPY must have a ru entry)', async () => {
      const res = await POST(mkReq({ ...validPayload, locale: 'ru' }));
      expect(res.status).toBe(200);
      const confirm = sendEmailMock.mock.calls.find((c) => (c[0] as any).to === 'jane@school.edu');
      expect(confirm).toBeTruthy();
      expect((confirm![0] as any).subject.length).toBeGreaterThan(0);
    });
  });
});