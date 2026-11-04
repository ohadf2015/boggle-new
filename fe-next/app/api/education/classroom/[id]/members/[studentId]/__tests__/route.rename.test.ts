import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { PATCH } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const TEACHER = 'teacher-1';
const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';

function makeUserClient(opts: { user: { id: string } | null; ownsClassroom: boolean }) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: opts.user }, error: null })) },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.ownsClassroom ? { id: CLASSROOM } : null, error: null }),
          }),
        }),
      }),
    })),
  };
}

function makeAdminClient(rows: Array<Record<string, unknown>> | null, error: { message: string; code?: string } | null = null) {
  const select = vi.fn(async () => ({ data: rows, error }));
  const eq2 = vi.fn(() => ({ select }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const update = vi.fn(() => ({ eq: eq1 }));
  return { client: { from: vi.fn(() => ({ update })) }, update, eq1, eq2 };
}

const req = (body: unknown) =>
  new Request(`http://t/api/education/classroom/${CLASSROOM}/members/${STUDENT}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
const ctx = () => ({ params: Promise.resolve({ id: CLASSROOM, studentId: STUDENT }) });

function asOwner(rows: Array<Record<string, unknown>> | null = [{ id: 'm1' }], error: { message: string; code?: string } | null = null) {
  (createClient as any).mockResolvedValue(makeUserClient({ user: { id: TEACHER }, ownsClassroom: true }));
  const admin = makeAdminClient(rows, error);
  (createAdminClient as any).mockReturnValue(admin.client);
  return admin;
}

describe('PATCH members/[studentId] roster_name', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves a trimmed roster name on this one membership and echoes it back', async () => {
    const admin = asOwner();
    const res = await PATCH(req({ roster_name: '  Dani K.  ' }), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, roster_name: 'Dani K.' });
    expect(admin.update).toHaveBeenCalledWith({ roster_name: 'Dani K.' });
    const filters = [admin.eq1.mock.calls[0], admin.eq2.mock.calls[0]].map((c: unknown[]) => c[0]).sort();
    expect(filters).toEqual(['classroom_id', 'student_id']);
  });

  it('null clears the roster name so the student’s own name shows again', async () => {
    const admin = asOwner();
    const res = await PATCH(req({ roster_name: null }), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, roster_name: null });
    expect(admin.update).toHaveBeenCalledWith({ roster_name: null });
  });

  it('keeps Hebrew text intact and counts characters, not UTF-16 units', async () => {
    const admin = asOwner();
    const hebrew = 'דני כהן';
    expect((await PATCH(req({ roster_name: hebrew }), ctx())).status).toBe(200);
    expect(admin.update).toHaveBeenCalledWith({ roster_name: hebrew });

    const forty = '😀'.repeat(40);
    expect((await PATCH(req({ roster_name: forty }), ctx())).status).toBe(200);
  });

  it('400 on an empty or whitespace-only name, and never writes', async () => {
    const admin = asOwner();
    expect((await PATCH(req({ roster_name: '' }), ctx())).status).toBe(400);
    expect((await PATCH(req({ roster_name: '   \t ' }), ctx())).status).toBe(400);
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('400 on a name over 40 characters after trimming', async () => {
    const admin = asOwner();
    expect((await PATCH(req({ roster_name: `  ${'a'.repeat(40)}  ` }), ctx())).status).toBe(200);
    expect((await PATCH(req({ roster_name: 'a'.repeat(41) }), ctx())).status).toBe(400);
    expect(admin.update).toHaveBeenCalledTimes(1);
  });

  it('400 on a non-string name or a body with both level and roster_name', async () => {
    const admin = asOwner();
    expect((await PATCH(req({ roster_name: 42 }), ctx())).status).toBe(400);
    expect((await PATCH(req({ roster_name: 'Dani', level: 'core' }), ctx())).status).toBe(400);
    expect(admin.update).not.toHaveBeenCalled();
  });

  it("403 for another teacher's class, and never writes", async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: { id: 'other-teacher' }, ownsClassroom: false }));
    const admin = makeAdminClient([{ id: 'm1' }]);
    (createAdminClient as any).mockReturnValue(admin.client);

    const res = await PATCH(req({ roster_name: 'Dani' }), ctx());

    expect(res.status).toBe(403);
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('401 when signed out', async () => {
    (createClient as any).mockResolvedValue(makeUserClient({ user: null, ownsClassroom: false }));
    expect((await PATCH(req({ roster_name: 'Dani' }), ctx())).status).toBe(401);
  });

  it('404 when the student is not on this roster', async () => {
    asOwner([]);
    expect((await PATCH(req({ roster_name: 'Dani' }), ctx())).status).toBe(404);
  });

  it.each([
    ['42703', 'column "roster_name" does not exist'],
    ['PGRST204', "Could not find the 'roster_name' column of 'classroom_memberships' in the schema cache"],
  ])('503 when the database has no roster_name column (%s)', async (code, message) => {
    asOwner(null, { message, code });
    const res = await PATCH(req({ roster_name: 'Dani' }), ctx());
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
  });
});
