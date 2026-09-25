// @vitest-environment node
// (jsdom's Request drops the forbidden `cookie` header, which is the whole point here.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * POST /api/education/google-classroom/grades — push LexiClash lesson grades to
 * a Google Classroom courseWork. Google is mocked at the fetch layer with real
 * Response objects; assertions check the URL / updateMask / body actually sent.
 */

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { GC_TOKEN_COOKIE, sealCookie } from '@/lib/education/googleClassroomOAuth';

const TEACHER = 'teacher-1';
const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const ASSIGNMENT = '33333333-3333-4333-8333-333333333333';
const LESSON = '44444444-4444-4444-8444-444444444444';
const S_DANA = 'aaaaaaaa-0000-4000-8000-000000000001';
const S_GUEST = 'aaaaaaaa-0000-4000-8000-000000000002';
const S_IDLE = 'aaaaaaaa-0000-4000-8000-000000000003';

/** Chainable, thenable query stub: every filter returns itself, awaiting yields `result`. */
function query(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'or', 'not', 'order', 'limit']) q[m] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
  return q;
}

function userClient(opts: { user: { id: string; email?: string } | null; owns: boolean }) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: opts.user }, error: null })) },
    from: vi.fn(() => query({ data: opts.owns ? { id: CLASSROOM } : null, error: null })),
  };
}

function adminClient(opts: { pro: boolean }) {
  const tables: Record<string, { data: unknown; error: unknown }> = {
    subscriptions: {
      data: opts.pro ? { tier: 'pro', status: 'active', source: 'polar', current_period_end: null } : null,
      error: null,
    },
    lesson_assignments: { data: { id: ASSIGNMENT, lesson_id: LESSON, classroom_id: CLASSROOM }, error: null },
    classroom_memberships: {
      data: [{ student_id: S_DANA }, { student_id: S_GUEST }, { student_id: S_IDLE }],
      error: null,
    },
    student_lesson_progress: {
      data: [
        { student_id: S_DANA, completed_at: null, words_attempted: { cat: { attempts: 4, correct: 3 } }, words_mastered: [] },
        { student_id: S_GUEST, completed_at: '2026-09-01T00:00:00Z', words_attempted: {}, words_mastered: [] },
      ],
      error: null,
    },
    profiles: {
      data: [
        { id: S_DANA, display_name: 'Dana', username: null },
        { id: S_GUEST, display_name: 'Guest Fox', username: null },
        { id: S_IDLE, display_name: 'Idle Ido', username: null },
      ],
      error: null,
    },
  };
  const emails: Record<string, string | null> = { [S_DANA]: 'DANA@school.org', [S_GUEST]: null, [S_IDLE]: 'ido@school.org' };
  return {
    from: vi.fn((t: string) => query(tables[t] ?? { data: null, error: null })),
    auth: {
      admin: {
        getUserById: vi.fn(async (id: string) => ({
          data: { user: { id, email: emails[id], is_anonymous: emails[id] == null } },
          error: null,
        })),
      },
    },
  };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

/** Routes Google calls by URL so order of roster/submission reads does not matter. */
function googleFetch(overrides: { patch?: () => Response; courseWork?: () => Response } = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (init?.method === 'PATCH') return overrides.patch ? overrides.patch() : json({ id: 'sub' });
    if (u.includes('/studentSubmissions')) {
      return json({ studentSubmissions: [{ id: 'sub-dana', userId: 'g-dana' }, { id: 'sub-ido', userId: 'g-ido' }] });
    }
    if (u.includes('/students')) {
      return json({
        students: [
          { userId: 'g-dana', profile: { emailAddress: 'dana@school.org' } },
          { userId: 'g-ido', profile: { emailAddress: 'ido@school.org' } },
        ],
      });
    }
    if (u.includes('/courseWork/cw1')) {
      return overrides.courseWork ? overrides.courseWork() : json({ id: 'cw1', title: 'Animals', maxPoints: 20, associatedWithDeveloper: true });
    }
    return json({ error: { message: `unexpected ${u}` } }, 500);
  });
}

async function req(body: unknown, opts: { cookieUid?: string | null } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const uid = opts.cookieUid === undefined ? TEACHER : opts.cookieUid;
  if (uid) headers.cookie = `${GC_TOKEN_COOKIE}=${await sealCookie({ uid, at: 'ya29.tok' }, 600)}`;
  return new NextRequest('http://t/api/education/google-classroom/grades', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const BODY = { classroomId: CLASSROOM, lessonOrAssignmentId: ASSIGNMENT, courseId: 'c1', courseWorkId: 'cw1' };

let fetchMock: ReturnType<typeof googleFetch>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', 'true');
  vi.stubEnv('GC_TOKEN_COOKIE_SECRET', 'k'.repeat(40));
  (createClient as any).mockResolvedValue(userClient({ user: { id: TEACHER }, owns: true }));
  (createAdminClient as any).mockReturnValue(adminClient({ pro: true }));
  fetchMock = googleFetch();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST /api/education/google-classroom/grades', () => {
  it('404 when the server flag is off (default)', async () => {
    vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', '');
    const res = await POST(await req(BODY));
    expect(res.status).toBe(404);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('401 when not signed in', async () => {
    (createClient as any).mockResolvedValue(userClient({ user: null, owns: false }));
    expect((await POST(await req(BODY))).status).toBe(401);
  });

  it('403 not_owner when the teacher does not own the classroom', async () => {
    (createClient as any).mockResolvedValue(userClient({ user: { id: TEACHER }, owns: false }));
    const res = await POST(await req(BODY));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('not_owner');
  });

  it('403 not_pro for a free teacher', async () => {
    (createAdminClient as any).mockReturnValue(adminClient({ pro: false }));
    const res = await POST(await req(BODY));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('not_pro');
  });

  it('400 on a bad body', async () => {
    expect((await POST(await req({ classroomId: 'nope' }))).status).toBe(400);
  });

  it('401 reauth when there is no Google token cookie', async () => {
    const res = await POST(await req(BODY, { cookieUid: null }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'reauth', reauth: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401 reauth when the token cookie belongs to another LexiClash user', async () => {
    const res = await POST(await req(BODY, { cookieUid: 'someone-else' }));
    expect(res.status).toBe(401);
    expect((await res.json()).reauth).toBe(true);
  });

  it('pushes scaled draft grades to matched students; guests unmatched; idle skipped', async () => {
    const res = await POST(await req(BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(1);
    expect(body.unmatched).toEqual([{ studentId: S_GUEST, name: 'Guest Fox', reason: 'no_email' }]);
    expect(body.skipped).toEqual([{ studentId: S_IDLE, name: 'Idle Ido' }]);
    expect(body.failed).toEqual([]);

    const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(patches).toHaveLength(1);
    expect(String(patches[0][0])).toBe(
      'https://classroom.googleapis.com/v1/courses/c1/courseWork/cw1/studentSubmissions/sub-dana?updateMask=draftGrade',
    );
    // 3/4 correct = 75% of maxPoints 20 = 15
    expect(JSON.parse(String(patches[0][1]!.body))).toEqual({ draftGrade: 15 });
    // Google identities never leave the server
    expect(JSON.stringify(body)).not.toContain('school.org');
  });

  it('returnGrades=true sets assignedGrade and calls :return', async () => {
    await POST(await req({ ...BODY, returnGrades: true }));
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.includes('updateMask=draftGrade%2CassignedGrade'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/studentSubmissions/sub-dana:return'))).toBe(true);
  });

  it('409 not_linkable when the courseWork was not created by LexiClash', async () => {
    fetchMock = googleFetch({ courseWork: () => json({ id: 'cw1', maxPoints: 10, associatedWithDeveloper: false }) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(await req(BODY));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('not_linkable');
  });

  it('422 ungraded when courseWork has no maxPoints', async () => {
    fetchMock = googleFetch({ courseWork: () => json({ id: 'cw1', associatedWithDeveloper: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(await req(BODY));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('ungraded');
  });

  it('Google 401 → reauth signal for the UI', async () => {
    fetchMock = googleFetch({ courseWork: () => json({ error: { status: 'UNAUTHENTICATED' } }, 401) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(await req(BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'reauth', reauth: true });
  });

  it('Google 404 → course_not_found', async () => {
    fetchMock = googleFetch({ courseWork: () => json({ error: { status: 'NOT_FOUND' } }, 404) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(await req(BODY));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('google_not_found');
  });

  it('429 during the patch loop stops and reports rate_limited with retryAfter', async () => {
    fetchMock = googleFetch({ patch: () => json({ error: {} }, 429, { 'retry-after': '12' }) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(await req(BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(0);
    expect(body.retryAfter).toBe(12);
    expect(body.failed).toEqual([{ studentId: S_DANA, name: 'Dana', reason: 'rate_limited' }]);
  });

  it('roster without any emails (profile.emails scope not granted) → reauth, not "not_in_course" for everyone', async () => {
    const base = googleFetch();
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/students') && !u.includes('/studentSubmissions')) {
        return json({ students: [{ userId: 'g-dana', profile: {} }, { userId: 'g-ido', profile: {} }] });
      }
      return base(url, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(await req(BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'reauth', reauth: true });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('Google 403 that re-auth cannot fix → 403 google_forbidden (no reauth loop)', async () => {
    fetchMock = googleFetch({ courseWork: () => json({ error: { message: 'The caller does not have permission' } }, 403) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(await req(BODY));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('google_forbidden');
    expect(body.reauth).toBeUndefined();
  });

  it('429 before the loop → 429 with retryAfter', async () => {
    fetchMock = googleFetch({ courseWork: () => json({ error: {} }, 429, { 'retry-after': '5' }) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(await req(BODY));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'rate_limited', retryAfter: 5 });
  });
});
