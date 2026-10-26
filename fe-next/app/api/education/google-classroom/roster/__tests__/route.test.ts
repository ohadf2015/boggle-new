// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { GET, POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { GC_TOKEN_COOKIE, sealCookie } from '@/lib/education/googleClassroomOAuth';

const TEACHER = 'teacher-1';
const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const COURSE = 'c-555';
// sha256 hex (shasum -a 256) of the two school emails used below.
const STUDENT_HASH = 'f5e4c205b9969dd4960747cdfa439b58880b29e54028e957a17e0044e4f89fd2';
const KID_HASH = '563678794b9c9e305eff1bb567a5b04a9e18e6083a9ee85a749a890a78784527';

// Shape copied from Classroom API courses.students.list (v1): userId + profile{id,name{givenName,familyName,fullName},emailAddress}.
const googleStudents = {
  students: [
    { courseId: COURSE, userId: '1001', profile: { id: '1001', name: { givenName: 'Maya', familyName: 'Katz', fullName: 'Maya Katz' }, emailAddress: 'student@school.org' } },
    { courseId: COURSE, userId: '1002', profile: { id: '1002', name: { givenName: 'Ari', familyName: 'Levi', fullName: 'Ari Levi' }, emailAddress: 'kid@school.org' } },
    { courseId: COURSE, userId: '1003', profile: { id: '1003', name: { givenName: 'Dana', familyName: 'Rosen', fullName: 'Dana Rosen' }, emailAddress: 'dana@school.org' } },
  ],
};

type Rows = Record<string, Array<Record<string, unknown>>>;

function table(rows: Array<Record<string, unknown>>, writes: Array<{ table: string; payload: unknown }>, name: string) {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  const q: Record<string, unknown> = {};
  const result = () => ({ data: rows.filter((r) => filters.every((f) => f(r))), error: null });
  q.select = vi.fn(() => q);
  q.eq = vi.fn((k: string, v: unknown) => (filters.push((r) => r[k] === v), q));
  q.in = vi.fn((k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), q));
  q.maybeSingle = vi.fn(async () => ({ data: result().data[0] ?? null, error: null }));
  q.then = (resolve: (v: unknown) => void) => resolve(result());
  q.insert = vi.fn(async (payload: Record<string, unknown>) => {
    writes.push({ table: name, payload });
    rows.push(payload);
    return { error: null };
  });
  q.update = vi.fn(() => ({ eq: () => ({ eq: async () => ({ error: null }) }) }));
  return q;
}

function setup(opts: { owns?: boolean; consent?: Array<{ student_id: string; has_consent: boolean }> | 'error'; rows?: Partial<Rows> } = {}) {
  const writes: Array<{ table: string; payload: unknown }> = [];
  const rows: Rows = {
    subscriptions: [{ user_id: TEACHER, tier: 'pro', status: 'active', source: 'polar', current_period_end: null }],
    classroom_memberships: [
      { classroom_id: CLASSROOM, student_id: 's-email' },
      { classroom_id: CLASSROOM, student_id: 's-linked' },
      { classroom_id: CLASSROOM, student_id: 's-guest' },
    ],
    profiles: [
      { id: 's-email', display_name: 'Ari' },
      { id: 's-linked', display_name: 'Dana' },
      { id: 's-guest', display_name: 'Guest Fox' },
    ],
    external_identities: [{ user_id: 's-linked', provider: 'google', external_id: '1003', email_hash: null }],
    ...opts.rows,
  } as Rows;
  const users: Record<string, { email?: string | null; is_anonymous?: boolean }> = {
    's-email': { email: 'kid@school.org' },
    's-linked': { email: 'personal@home.net' },
    's-guest': { email: null, is_anonymous: true },
  };
  const createUser = vi.fn();
  const admin = {
    from: vi.fn((name: string) => table(rows[name] ?? [], writes, name)),
    auth: {
      admin: {
        getUserById: vi.fn(async (id: string) => ({ data: { user: { id, ...users[id] } }, error: null })),
        createUser,
      },
    },
  };
  const rpc = vi.fn(async () =>
    opts.consent === 'error'
      ? { data: null, error: { message: 'rpc down' } }
      : { data: opts.consent ?? [{ student_id: 's-email', has_consent: true }, { student_id: 's-linked', has_consent: false }, { student_id: 's-guest', has_consent: false }], error: null },
  );
  const userClient = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: TEACHER, email: 't@school.org' } }, error: null })) },
    from: vi.fn(() => table(opts.owns === false ? [] : [{ id: CLASSROOM, teacher_id: TEACHER }], writes, 'classrooms')),
    rpc,
  };
  (createClient as any).mockResolvedValue(userClient);
  (createAdminClient as any).mockReturnValue(admin);
  return { writes, rpc, createUser };
}

const fakeClassroomApi = vi.fn(async (url: string) => {
  if (url.includes(`/courses/${COURSE}/students`)) {
    return new Response(JSON.stringify(googleStudents), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 });
});

const cookie = async () => `${GC_TOKEN_COOKIE}=${await sealCookie({ uid: TEACHER, at: 'ya29.tok' }, 600)}`;
const getReq = async (qs: string, withCookie = true) =>
  new NextRequest(`http://t/api/education/google-classroom/roster?${qs}`, { headers: withCookie ? { cookie: await cookie() } : {} });
const postReq = async (body: unknown) =>
  new NextRequest('http://t/api/education/google-classroom/roster', {
    method: 'POST',
    headers: { cookie: await cookie(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GC_ROSTER_IMPORT_ENABLED', 'true');
  vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', 'true');
  vi.stubEnv('GC_TOKEN_COOKIE_SECRET', 'k'.repeat(40));
  vi.stubGlobal('fetch', fakeClassroomApi);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('flag gating', () => {
  it('404s both methods while GC_ROSTER_IMPORT_ENABLED is off, before any auth', async () => {
    vi.stubEnv('GC_ROSTER_IMPORT_ENABLED', '');
    setup();
    expect((await GET(await getReq(`classroomId=${CLASSROOM}&courseId=${COURSE}`))).status).toBe(404);
    expect((await POST(await postReq({ classroomId: CLASSROOM, courseId: COURSE }))).status).toBe(404);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe('GET roster', () => {
  it('400s on a missing or malformed id', async () => {
    setup();
    expect((await GET(await getReq(`courseId=${COURSE}`))).status).toBe(400);
    expect((await GET(await getReq(`classroomId=${CLASSROOM}&courseId=bad/id`))).status).toBe(400);
  });

  it('403s for a classroom the teacher does not own', async () => {
    setup({ owns: false });
    const res = await GET(await getReq(`classroomId=${CLASSROOM}&courseId=${COURSE}`));
    expect(res.status).toBe(403);
    expect(fakeClassroomApi).not.toHaveBeenCalled();
  });

  it('asks to reconnect without a Google token', async () => {
    setup();
    const res = await GET(await getReq(`classroomId=${CLASSROOM}&courseId=${COURSE}`, false));
    expect(res.status).toBe(401);
    expect((await res.json()).reauth).toBe(true);
  });

  it('returns given name + family initial + email hash only', async () => {
    setup();
    const res = await GET(await getReq(`classroomId=${CLASSROOM}&courseId=${COURSE}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toEqual([
      { displayName: 'Maya K.', emailHash: STUDENT_HASH },
      { displayName: 'Ari L.', emailHash: KID_HASH },
      { displayName: 'Dana R.', emailHash: expect.stringMatching(/^[0-9a-f]{64}$/) },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/school\.org|Katz|Levi|Rosen|1001/);
  });
});

describe('POST roster match', () => {
  it('matches by linked identity and email hash, reports consent, and creates nothing', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    const { writes, rpc, createUser } = setup();
    const res = await POST(await postReq({ classroomId: CLASSROOM, courseId: COURSE }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, rosterCount: 3, matchedCount: 2, unmatchedCount: 1, linked: 0 });
    expect(body.unmatched).toEqual([{ displayName: 'Maya K.' }]);
    expect(body.matched).toEqual([
      { studentId: 's-linked', name: 'Dana', consentNeeded: true },
      { studentId: 's-email', name: 'Ari', consentNeeded: false },
    ]);
    expect(rpc).toHaveBeenCalledWith('classroom_consent_status', { p_classroom_id: CLASSROOM });
    expect(writes).toEqual([]);
    expect(createUser).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toMatch(/school\.org|home\.net|Katz/);
  });

  it('ignores stored links while identity linking is off (email hash only)', async () => {
    setup();
    const body = await (await POST(await postReq({ classroomId: CLASSROOM, courseId: COURSE }))).json();
    expect(body.matchedCount).toBe(1);
    expect(body.matched).toEqual([{ studentId: 's-email', name: 'Ari', consentNeeded: false }]);
  });

  it('links only matched students whose consent is on file, storing a hash and never the email', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    const { writes } = setup();
    const body = await (await POST(await postReq({ classroomId: CLASSROOM, courseId: COURSE, link: true }))).json();
    expect(body).toMatchObject({ linked: 1, skippedForConsent: 1 });
    expect(writes).toEqual([
      { table: 'external_identities', payload: { user_id: 's-email', provider: 'google', external_id: '1002', email_hash: KID_HASH } },
    ]);
  });

  it('writes nothing on link when identity linking is off', async () => {
    const { writes } = setup();
    const body = await (await POST(await postReq({ classroomId: CLASSROOM, courseId: COURSE, link: true }))).json();
    expect(body.linked).toBe(0);
    expect(body.linkError).toBe('linking_disabled');
    expect(writes).toEqual([]);
  });

  it('treats every match as consent needed when the consent status cannot be read', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    const { writes } = setup({ consent: 'error' });
    const body = await (await POST(await postReq({ classroomId: CLASSROOM, courseId: COURSE, link: true }))).json();
    expect(body.matched.every((m: { consentNeeded: boolean }) => m.consentNeeded)).toBe(true);
    expect(body.linked).toBe(0);
    expect(writes).toEqual([]);
  });

  it('400s on a bad body', async () => {
    setup();
    expect((await POST(await postReq({ classroomId: 'nope', courseId: COURSE }))).status).toBe(400);
  });
});
