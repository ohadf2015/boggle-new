// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { GET as startGET } from '../oauth/start/route';
import { GET as callbackGET } from '../oauth/callback/route';
import { GET as coursesGET } from '../courses/route';
import { POST as courseworkPOST } from '../coursework/route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { GC_STATE_COOKIE, GC_TOKEN_COOKIE, sealCookie, unsealCookie } from '@/lib/education/googleClassroomOAuth';
import { GC_GRADE_PASSBACK_SCOPES } from '@/lib/education/googleClassroomGrades';

const TEACHER = 'teacher-1';
const CLASSROOM = '11111111-1111-4111-8111-111111111111';

function query(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'or']) q[m] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  return q;
}
const userClient = (user: { id: string; email?: string } | null, owns = true) => ({
  auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
  from: vi.fn(() => query({ data: owns ? { id: CLASSROOM } : null, error: null })),
});
const adminClient = (pro: boolean) => ({
  from: vi.fn(() =>
    query({ data: pro ? { tier: 'pro', status: 'active', source: 'polar', current_period_end: null } : null, error: null }),
  ),
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const tokenCookie = async (uid = TEACHER) => `${GC_TOKEN_COOKIE}=${await sealCookie({ uid, at: 'ya29.tok' }, 600)}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', 'true');
  vi.stubEnv('GC_TOKEN_COOKIE_SECRET', 'k'.repeat(40));
  vi.stubEnv('GOOGLE_CLASSROOM_CLIENT_ID', 'cid');
  vi.stubEnv('GOOGLE_CLASSROOM_CLIENT_SECRET', 'sec');
  vi.stubEnv('GOOGLE_CLASSROOM_REDIRECT_URI', 'https://www.lexiclash.live/api/education/google-classroom/oauth/callback');
  (createClient as any).mockResolvedValue(userClient({ id: TEACHER, email: 't@school.org' }));
  (createAdminClient as any).mockReturnValue(adminClient(true));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('flag off → 404 on every route', () => {
  it.each([
    ['start', () => startGET(new NextRequest('http://t/api/education/google-classroom/oauth/start'))],
    ['callback', () => callbackGET(new NextRequest('http://t/api/education/google-classroom/oauth/callback?code=c&state=s'))],
    ['courses', () => coursesGET(new NextRequest('http://t/api/education/google-classroom/courses'))],
    ['coursework', () => courseworkPOST(new NextRequest('http://t/x', { method: 'POST', body: '{}' }))],
  ])('%s', async (_n, call) => {
    vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', 'false');
    expect((await call()).status).toBe(404);
  });
});

describe('GET oauth/start', () => {
  it('401 when signed out', async () => {
    (createClient as any).mockResolvedValue(userClient(null));
    expect((await startGET(new NextRequest('http://t/api/education/google-classroom/oauth/start'))).status).toBe(401);
  });

  it('403 for a free teacher', async () => {
    (createAdminClient as any).mockReturnValue(adminClient(false));
    expect((await startGET(new NextRequest('http://t/api/education/google-classroom/oauth/start'))).status).toBe(403);
  });

  it('500 (logged) when OAuth env is missing', async () => {
    vi.stubEnv('GOOGLE_CLASSROOM_CLIENT_SECRET', '');
    expect((await startGET(new NextRequest('http://t/api/education/google-classroom/oauth/start'))).status).toBe(500);
  });

  it('redirects to Google and sets a sealed, httpOnly state cookie bound to the user', async () => {
    const res = await startGET(
      new NextRequest('http://t/api/education/google-classroom/oauth/start?returnTo=/he/teacher/reports'),
    );
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.hostname).toBe('accounts.google.com');
    expect(loc.searchParams.get('login_hint')).toBe('t@school.org');
    const cookie = res.cookies.get(GC_STATE_COOKIE)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('lax');
    const state = await unsealCookie(cookie.value);
    expect(state).toMatchObject({ uid: TEACHER, st: loc.searchParams.get('state'), rt: '/he/teacher/reports' });
  });
});

describe('GET oauth/callback', () => {
  async function callback(query: string, statePayload: Record<string, unknown> | null) {
    const headers: Record<string, string> = {};
    if (statePayload) headers.cookie = `${GC_STATE_COOKIE}=${await sealCookie(statePayload, 600)}`;
    return callbackGET(new NextRequest(`http://t/api/education/google-classroom/oauth/callback?${query}`, { headers }));
  }

  it('state mismatch → redirect with gc=error and no token cookie', async () => {
    const res = await callback('code=c&state=WRONG', { uid: TEACHER, st: 'S', v: 'V', rt: '/en/teacher/reports' });
    expect(res.headers.get('location')).toContain('gc=error');
    expect(res.cookies.get(GC_TOKEN_COOKIE)).toBeUndefined();
  });

  it('state minted for another user → gc=error', async () => {
    const res = await callback('code=c&state=S', { uid: 'other', st: 'S', v: 'V', rt: '/en/teacher/reports' });
    expect(res.headers.get('location')).toContain('gc=error');
  });

  it('teacher denied consent → gc=denied', async () => {
    const res = await callback('error=access_denied&state=S', { uid: TEACHER, st: 'S', v: 'V', rt: '/en/teacher/reports' });
    expect(res.headers.get('location')).toContain('gc=denied');
  });

  it('teacher unticked a scope on the consent screen → gc=scopes, no token cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({ access_token: 'ya29.new', expires_in: 3600, scope: GC_GRADE_PASSBACK_SCOPES.slice(0, 3).join(' ') }),
      ),
    );
    const res = await callback('code=c&state=S', { uid: TEACHER, st: 'S', v: 'V', rt: '/en/teacher/reports' });
    expect(new URL(res.headers.get('location')!).searchParams.get('gc')).toBe('scopes');
    expect(res.cookies.get(GC_TOKEN_COOKIE)).toBeUndefined();
  });

  it('redirects to the configured public origin, not the (possibly internal) request host', async () => {
    const res = await callback('code=c&state=WRONG', { uid: TEACHER, st: 'S', v: 'V', rt: '/en/teacher/reports' });
    expect(new URL(res.headers.get('location')!).origin).toBe('https://www.lexiclash.live');
  });

  it('exchanges the code and seals the token for this user', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ access_token: 'ya29.new', expires_in: 3600, scope: `openid ${GC_GRADE_PASSBACK_SCOPES.join(' ')}` }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await callback('code=c&state=S', { uid: TEACHER, st: 'S', v: 'V', rt: '/he/teacher/reports' });
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/he/teacher/reports');
    expect(loc.searchParams.get('gc')).toBe('connected');
    const tok = res.cookies.get(GC_TOKEN_COOKIE)!;
    expect(tok.httpOnly).toBe(true);
    expect(tok.value).not.toContain('ya29');
    expect(await unsealCookie(tok.value)).toMatchObject({ uid: TEACHER, at: 'ya29.new' });
    expect(new URLSearchParams(fetchMock.mock.calls[0][1].body).get('code_verifier')).toBe('V');
  });

  it('token exchange failure → gc=error (logged)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"invalid_grant"}', { status: 400 })));
    const res = await callback('code=c&state=S', { uid: TEACHER, st: 'S', v: 'V', rt: '/en/teacher/reports' });
    expect(res.headers.get('location')).toContain('gc=error');
  });
});

describe('GET courses', () => {
  it('401 reauth with no token', async () => {
    const res = await coursesGET(new NextRequest('http://t/api/education/google-classroom/courses'));
    expect(res.status).toBe(401);
    expect((await res.json()).reauth).toBe(true);
  });

  it('lists courses, then courseWork for ?courseId', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ courses: [{ id: 'c1', name: '5A' }] }))
      .mockResolvedValueOnce(json({ courseWork: [{ id: 'w1', title: 'L1', maxPoints: 100, associatedWithDeveloper: true }] }));
    vi.stubGlobal('fetch', fetchMock);
    const headers = { cookie: await tokenCookie() };
    const a = await coursesGET(new NextRequest('http://t/api/education/google-classroom/courses', { headers }));
    expect(await a.json()).toMatchObject({ ok: true, courses: [{ id: 'c1', name: '5A' }] });
    const b = await coursesGET(new NextRequest('http://t/api/education/google-classroom/courses?courseId=c1', { headers }));
    expect(await b.json()).toMatchObject({ ok: true, courseWork: [{ id: 'w1', associatedWithDeveloper: true }] });
  });

  it('Google 403 scope → 401 reauth', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ error: { message: 'Request had insufficient authentication scopes.' } }, 403)),
    );
    const res = await coursesGET(
      new NextRequest('http://t/api/education/google-classroom/courses', { headers: { cookie: await tokenCookie() } }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).reauth).toBe(true);
  });
});

describe('POST coursework', () => {
  const post = async (body: unknown) =>
    courseworkPOST(
      new NextRequest('http://t/api/education/google-classroom/coursework', {
        method: 'POST',
        headers: { cookie: await tokenCookie(), 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('403 when the teacher does not own the classroom', async () => {
    (createClient as any).mockResolvedValue(userClient({ id: TEACHER }, false));
    expect((await post({ classroomId: CLASSROOM, courseId: 'c1', title: 'Animals' })).status).toBe(403);
  });

  it('creates a 100-point PUBLISHED assignment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ id: 'w9', title: 'Animals', maxPoints: 100, associatedWithDeveloper: true }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await post({ classroomId: CLASSROOM, courseId: 'c1', title: 'Animals' });
    expect(res.status).toBe(200);
    expect((await res.json()).courseWork).toMatchObject({ id: 'w9', maxPoints: 100 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ maxPoints: 100, workType: 'ASSIGNMENT' });
  });
});
