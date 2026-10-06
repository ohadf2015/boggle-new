import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { EDU_ANALYTICS_HOST } from '@/backend/utils/educationTelemetry';

// Mutable auth/db state the mocked Supabase client reads from, reset per test.
let mockUser:
  | { id: string; email: string | null; email_confirmed_at: string | null; user_metadata?: Record<string, unknown> }
  | null = null;
let recentCount = 0;
let mockProfile: { display_name?: string | null; username?: string | null; country_code?: string | null; user_role?: string | null; is_admin?: boolean | null } | null = null;
let profileFetchError: any = null;
let insertMock = vi.fn(async () => ({ data: { id: 'req-1' }, error: null }));
let approveMock = vi.fn(async (_args?: any) => ({ data: [{ id: 'req-1' }], error: null }));
let adminSelectMock = vi.fn(async () => ({ data: [{ id: 'user-1' }], error: null }));
let adminAvailable = true;
let sendEmailMock = vi.fn(async (_args: any) => ({ ok: true as boolean, error: undefined as string | undefined }));
let captureMock = vi.fn();
let posthogThrows = false;
// Rows the twin-check select (approved request already exists?) returns.
let twinRows: any[] = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => {
    if (posthogThrows) throw new Error('posthog down');
    return { capture: (...a: unknown[]) => captureMock(...a) };
  },
}));

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
            table === 'profiles' ? { data: mockProfile, error: profileFetchError } : { data: null, error: null }
          ),
        })),
      })),
    }),
  }),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () =>
    adminAvailable
      ? {
          from: (table: string) => ({
            update: (values: any) =>
              table === 'teacher_access_requests'
                ? // Auto-approve: update(...).eq('user_id', ...).eq('status', 'pending').select('id')
                  {
                    eq: (key: string, val: string) => ({
                      eq: (key2: string, val2: string) => ({
                        select: (cols: string) => approveMock({ table, values, key, val, key2, val2, cols }),
                      }),
                    }),
                  }
                : // Promotion: update({ user_role: 'teacher' }).eq('id', user.id).select('id')
                  {
                    eq: (key: string, val: string) => ({
                      select: (cols: string) => adminSelectMock({ table, values, key, val, cols }),
                    }),
                  },
            select: (cols: string) => ({
              eq: (key: string, val: string) => ({
                eq: (key2: string, val2: string) => ({
                  limit: (n: number) => vi.fn(async () => ({ data: twinRows, error: null }))(),
                }),
              }),
            }),
          }),
        }
      : null,
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
    profileFetchError = null;
    insertMock = vi.fn(async () => ({ data: { id: 'req-1' }, error: null }));
    approveMock = vi.fn(async () => ({ data: [{ id: 'req-1' }], error: null }));
    adminSelectMock = vi.fn(async () => ({ data: [{ id: 'user-1' }], error: null }));
    adminAvailable = true;
    twinRows = [];
    sendEmailMock = vi.fn(async () => ({ ok: true, error: undefined }));
    captureMock = vi.fn();
    posthogThrows = false;
  });

  it('200 for a signed-up, email-verified user and fires edu_access_request_created', async () => {
    const res = await POST(mkReq(validPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    expect(captureMock).toHaveBeenCalledTimes(1);
    const ev = captureMock.mock.calls[0][0];
    expect(ev.distinctId).toBe('user-1');
    expect(ev.event).toBe('edu_access_request_created');
    expect(ev.properties.$host).toBe(EDU_ANALYTICS_HOST);
    expect(ev.properties.role).toBe('teacher');
    expect(ev.properties.locale).toBe('en');
  });

  it('still succeeds when posthog capture throws', async () => {
    posthogThrows = true;
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

  describe('profile fetch error handling: fail-closed on genuine errors', () => {
    it('500s and does not insert when profile fetch returns an error', async () => {
      profileFetchError = { code: 'CONNECTION_TIMEOUT', message: 'Connection timeout' };
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(500);
      expect(insertMock).not.toHaveBeenCalled();
      expect(approveMock).not.toHaveBeenCalled();
    });

    it('allows normal filing when profile fetch returns null with no error (brand-new user)', async () => {
      profileFetchError = null;
      mockProfile = null;
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(approveMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('idempotency guard: already-teacher short-circuit', () => {
    it('returns 200 and does not insert when profile already has user_role=teacher', async () => {
      mockProfile = { display_name: 'Jane Doe', username: 'janed', country_code: 'US', user_role: 'teacher', is_admin: false };
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.alreadyApproved).toBe(true);
      expect(insertMock).not.toHaveBeenCalled();
      expect(approveMock).not.toHaveBeenCalled();
      expect(adminSelectMock).not.toHaveBeenCalled();
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('returns 200 and does not insert when profile already has user_role=admin', async () => {
      mockProfile = { display_name: 'Jane Doe', username: 'janed', country_code: 'US', user_role: 'admin', is_admin: false };
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.alreadyApproved).toBe(true);
      expect(insertMock).not.toHaveBeenCalled();
      expect(approveMock).not.toHaveBeenCalled();
      expect(adminSelectMock).not.toHaveBeenCalled();
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('returns 200 and does not insert when profile already has is_admin=true', async () => {
      mockProfile = { display_name: 'Jane Doe', username: 'janed', country_code: 'US', user_role: 'student', is_admin: true };
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.alreadyApproved).toBe(true);
      expect(insertMock).not.toHaveBeenCalled();
      expect(approveMock).not.toHaveBeenCalled();
      expect(adminSelectMock).not.toHaveBeenCalled();
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('still files normally for a student without teacher access', async () => {
      mockProfile = { display_name: 'Jane Doe', username: 'janed', country_code: 'US', user_role: 'student', is_admin: false };
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(approveMock).toHaveBeenCalledTimes(1);
      expect(adminSelectMock).toHaveBeenCalledTimes(1);
    });
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

    it('still answers 200 when the confirmation email fails', async () => {
      sendEmailMock = vi.fn(async () => ({ ok: false, error: 'resend down' }));
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('still answers 200 but logs loudly when the ADMIN notify email fails (no silent islands)', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        sendEmailMock = vi.fn(async (args: any) =>
          args.to === 'lexiclash.game@gmail.com'
            ? { ok: false, error: 'resend down' }
            : { ok: true, error: undefined });
        const res = await POST(mkReq(validPayload));
        expect(res.status).toBe(200);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[access-request] admin notify'),
          'resend down'
        );
      } finally {
        errorSpy.mockRestore();
      }
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

  // The insert commits BEFORE the approval step runs. Once the request row is
  // durably stored, a failing approve/promote step must NOT surface as a
  // generic 500 — the teacher did succeed in filing. The truthful answer is
  // 202 approvalPending: request received, approval still processing (a
  // re-submit re-runs the approval against the stranded pending row, and the
  // server log carries the real error).
  describe('post-insert failure truthfulness (insert committed, approve/promote failed)', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      errorSpy.mockRestore();
    });

    it('202 approvalPending when the approve step errors — request stays on record', async () => {
      approveMock = vi.fn(async () => ({ data: null, error: { message: 'Invalid API key' } }));
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.approvalPending).toBe(true);
      // Never a naked 500, and the failure must be LOUD on the server.
      expect(errorSpy).toHaveBeenCalled();
      // Partial chain stops: no promotion, no emails.
      expect(adminSelectMock).not.toHaveBeenCalled();
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('202 approvalPending when approval matched no pending row and no approved twin exists', async () => {
      approveMock = vi.fn(async () => ({ data: [], error: null }));
      twinRows = [];
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.approvalPending).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
      expect(adminSelectMock).not.toHaveBeenCalled();
    });

    it('200 (not 202) when the racing twin already approved the row', async () => {
      approveMock = vi.fn(async () => ({ data: [], error: null }));
      twinRows = [{ id: 'req-twin' }];
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.approvalPending).toBeUndefined();
    });

    it('202 approvalPending when profile promotion errors after the row approved', async () => {
      adminSelectMock = vi.fn(async () => ({ data: null, error: { message: 'profiles rls' } }));
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.approvalPending).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('202 approvalPending when promotion matched no profile row', async () => {
      adminSelectMock = vi.fn(async () => ({ data: [], error: null }));
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.approvalPending).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('202 approvalPending when the admin client is not configured', async () => {
      adminAvailable = false;
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.approvalPending).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('500 when the INSERT itself fails — nothing committed, so a real error is truthful', async () => {
      insertMock = vi.fn(async () => ({ data: null, error: { message: 'db down' } }));
      const res = await POST(mkReq(validPayload));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(approveMock).not.toHaveBeenCalled();
    });
  });
});
