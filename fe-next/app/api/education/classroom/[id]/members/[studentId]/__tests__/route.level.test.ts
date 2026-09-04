import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * PATCH /api/education/classroom/[id]/members/[studentId] — set a student's
 * differentiation level (support | core | challenge) on their membership row.
 *
 * Only the owning teacher may do this. The write goes through the service-role
 * client and MUST assert that exactly one row changed: RLS returns zero rows with
 * error:null, never an error, so an unasserted update is a silent no-op (the same
 * bug class that left 14 approved teachers un-promoted — see teacher-access/approve).
 */

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { PATCH } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const TEACHER = 'teacher-1';
const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';

/** Request-scoped client: auth + ownership read (RLS-visible). */
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

/** Service-role client: the update itself. `updatedRows` stands for what `.select()` returns. */
function makeAdminClient(updatedRows: Array<{ id: string; level: string }> | null, error: { message: string } | null = null) {
  const select = vi.fn(async () => ({ data: updatedRows, error }));
  const eq2 = vi.fn(() => ({ select }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const update = vi.fn(() => ({ eq: eq1 }));
  return { client: { from: vi.fn(() => ({ update })) }, update, eq1, eq2, select };
}

const req = (body: unknown) =>
  new Request(`http://t/api/education/classroom/${CLASSROOM}/members/${STUDENT}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const ctx = (id = CLASSROOM, studentId = STUDENT) => ({ params: Promise.resolve({ id, studentId }) });

describe('PATCH /api/education/classroom/[id]/members/[studentId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 when not signed in', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: null, ownsClassroom: false }));
    const res = await PATCH(req({ level: 'support' }), ctx());
    expect(res.status).toBe(401);
  });

  it('403 when the caller does not own the classroom', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: false }));
    const admin = makeAdminClient([{ id: 'm1', level: 'support' }]);
    (createAdminClient as any).mockReturnValue(admin.client);

    const res = await PATCH(req({ level: 'support' }), ctx());

    expect(res.status).toBe(403);
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('400 on an unknown level (zod) and on malformed JSON', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    (createAdminClient as any).mockReturnValue(makeAdminClient([{ id: 'm1', level: 'core' }]).client);

    expect((await PATCH(req({ level: 'hard' }), ctx())).status).toBe(400);
    expect((await PATCH(req('{not json'), ctx())).status).toBe(400);
  });

  it('400 on a non-UUID classroom or student id (never reaches the DB)', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    const admin = makeAdminClient([{ id: 'm1', level: 'core' }]);
    (createAdminClient as any).mockReturnValue(admin.client);

    expect((await PATCH(req({ level: 'core' }), ctx('not-a-uuid', STUDENT))).status).toBe(400);
    expect((await PATCH(req({ level: 'core' }), ctx(CLASSROOM, 'nope'))).status).toBe(400);
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('writes via the service role scoped to (classroom_id, student_id) and returns { ok, level }', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    const admin = makeAdminClient([{ id: 'm1', level: 'challenge' }]);
    (createAdminClient as any).mockReturnValue(admin.client);

    const res = await PATCH(req({ level: 'challenge' }), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, level: 'challenge' });
    expect(admin.client.from).toHaveBeenCalledWith('classroom_memberships');
    expect(admin.update).toHaveBeenCalledWith({ level: 'challenge' });
    // Both filters must be present — an update filtered on student alone would
    // change that student's level in EVERY classroom they belong to.
    const filters = [admin.eq1.mock.calls[0], admin.eq2.mock.calls[0]].map((c) => c[0]).sort();
    expect(filters).toEqual(['classroom_id', 'student_id']);
  });

  it('404 when zero rows changed (student not on this roster) — never reports success for a no-op', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
    (createAdminClient as any).mockReturnValue(makeAdminClient([]).client);

    const res = await PATCH(req({ level: 'support' }), ctx());

    expect(res.status).toBe(404);
    expect((await res.json()).ok).toBe(false);
  });

  it('500 when the service-role client is not configured or the update errors', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));

    (createAdminClient as any).mockReturnValue(null);
    expect((await PATCH(req({ level: 'support' }), ctx())).status).toBe(500);

    (createAdminClient as any).mockReturnValue(makeAdminClient(null, { message: 'boom' }).client);
    expect((await PATCH(req({ level: 'support' }), ctx())).status).toBe(500);
  });
});
