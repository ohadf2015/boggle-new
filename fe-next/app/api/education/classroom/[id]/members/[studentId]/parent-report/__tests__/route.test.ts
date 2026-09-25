import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * POST /api/education/classroom/[id]/members/[studentId]/parent-report
 *
 * Mints a signed, stateless "parent report" link for ONE student in ONE
 * classroom. Only the owning teacher, only when the student is on that
 * roster, only when the teacher has Teacher Pro.
 *
 * Checks in order: 401 not signed in -> 403 not the owning teacher ->
 * 403 student not a classroom member -> 402 not Pro -> 500 if the signing
 * secret is missing/misconfigured -> 200 { ok: true, path }.
 */

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkTeacherSubscription } from '@/lib/subscriptions';

const TEACHER = 'teacher-1';
const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';

function makeUserClient(opts: { user: { id: string } | null; ownsClassroom: boolean }) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: opts.user }, error: null })) },
    from: vi.fn((table: string) => {
      if (table === 'classrooms') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: opts.ownsClassroom ? { id: CLASSROOM } : null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  };
}

function makeAdminClient(opts: { isMember: boolean; membershipError?: { message: string } | null }) {
  const maybeSingle = vi.fn(async () => ({
    data: opts.isMember ? { id: 'membership-1' } : null,
    error: opts.membershipError ?? null,
  }));
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, eq1, eq2, maybeSingle };
}

const proStatus = (hasPro: boolean) => ({
  tier: hasPro ? 'pro' : 'free',
  status: 'active',
  classes_limit: null,
  students_limit_per_class: null,
  current_period_end: null,
  cancel_at_period_end: false,
  has_pro: hasPro,
  source: 'polar',
  grant_expired: false,
});

const req = () =>
  new Request(`http://t/api/education/classroom/${CLASSROOM}/members/${STUDENT}/parent-report`, {
    method: 'POST',
  });

const ctx = (id = CLASSROOM, studentId = STUDENT) => ({ params: Promise.resolve({ id, studentId }) });

describe('POST /api/education/classroom/[id]/members/[studentId]/parent-report', () => {
  const ORIGINAL_SECRET = process.env.PARENT_REPORT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PARENT_REPORT_SECRET = 'test-secret';
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.PARENT_REPORT_SECRET;
    else process.env.PARENT_REPORT_SECRET = ORIGINAL_SECRET;
  });

  it('401 when not signed in', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: null, ownsClassroom: false }));

    const res = await POST(req(), ctx());

    expect(res.status).toBe(401);
  });

  it('400 on a non-UUID classroom or student id (never reaches the DB)', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));

    expect((await POST(req(), ctx('not-a-uuid', STUDENT))).status).toBe(400);
    expect((await POST(req(), ctx(CLASSROOM, 'nope'))).status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('403 when the caller does not own the classroom', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: false }));
    const admin = makeAdminClient({ isMember: true });
    (createAdminClient as any).mockReturnValue(admin.client);
    (checkTeacherSubscription as any).mockResolvedValue(proStatus(true));

    const res = await POST(req(), ctx());

    expect(res.status).toBe(403);
    expect(admin.from).not.toHaveBeenCalled();
  });

  it('403 when the student is not a member of the classroom', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    const admin = makeAdminClient({ isMember: false });
    (createAdminClient as any).mockReturnValue(admin.client);
    (checkTeacherSubscription as any).mockResolvedValue(proStatus(true));

    const res = await POST(req(), ctx());

    expect(res.status).toBe(403);
    expect((await res.json()).ok).toBe(false);
  });

  it('402 when the teacher does not have Pro', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    const admin = makeAdminClient({ isMember: true });
    (createAdminClient as any).mockReturnValue(admin.client);
    (checkTeacherSubscription as any).mockResolvedValue(proStatus(false));

    const res = await POST(req(), ctx());

    expect(res.status).toBe(402);
  });

  it('500 when the service-role client is not configured', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    (createAdminClient as any).mockReturnValue(null);
    (checkTeacherSubscription as any).mockResolvedValue(proStatus(true));

    const res = await POST(req(), ctx());

    expect(res.status).toBe(500);
  });

  it('500 when the membership check errors', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    const admin = makeAdminClient({ isMember: false, membershipError: { message: 'db down' } });
    (createAdminClient as any).mockReturnValue(admin.client);
    (checkTeacherSubscription as any).mockResolvedValue(proStatus(true));

    const res = await POST(req(), ctx());

    expect(res.status).toBe(500);
  });

  it('500 and logs when PARENT_REPORT_SECRET is not configured (fail closed, never issues an unsigned link)', async () => {
    delete process.env.PARENT_REPORT_SECRET;
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    const admin = makeAdminClient({ isMember: true });
    (createAdminClient as any).mockReturnValue(admin.client);
    (checkTeacherSubscription as any).mockResolvedValue(proStatus(true));
    const logger = (await import('@/utils/logger')).default;

    const res = await POST(req(), ctx());

    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  it('200 returns a locale-free /report/<token> path when everything checks out', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    const admin = makeAdminClient({ isMember: true });
    (createAdminClient as any).mockReturnValue(admin.client);
    (checkTeacherSubscription as any).mockResolvedValue(proStatus(true));

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(typeof body.path).toBe('string');
    expect(body.path.startsWith('/report/')).toBe(true);
    // path carries a real token: verifiable, and scoped to this student+classroom.
    const { verifyParentReportToken } = await import('@/lib/education/parentReportToken');
    const token = body.path.replace('/report/', '');
    const payload = verifyParentReportToken(token);
    expect(payload).toEqual(
      expect.objectContaining({ studentId: STUDENT, classroomId: CLASSROOM }),
    );
  });

  it('scopes the membership check to (classroom_id, student_id), never student alone', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    const admin = makeAdminClient({ isMember: true });
    (createAdminClient as any).mockReturnValue(admin.client);
    (checkTeacherSubscription as any).mockResolvedValue(proStatus(true));

    await POST(req(), ctx());

    expect(admin.from).toHaveBeenCalledWith('classroom_memberships');
    const filters = [admin.eq1.mock.calls[0], admin.eq2.mock.calls[0]].map((c) => c[0]).sort();
    expect(filters).toEqual(['classroom_id', 'student_id']);
  });
});
