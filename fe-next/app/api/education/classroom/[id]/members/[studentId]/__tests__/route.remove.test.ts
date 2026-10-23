import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/education/ownedClassroomRoute', () => ({ authorizeClassroomOwner: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { DELETE } from '../route';
import { createAdminClient } from '@/utils/supabase/admin';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';

function teacherClient(deleted: Array<{ id: string }> | null, error: { message: string } | null = null) {
  const select = vi.fn(async () => ({ data: deleted, error }));
  const eq2 = vi.fn(() => ({ select }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const del = vi.fn(() => ({ eq: eq1 }));
  return { client: { from: vi.fn(() => ({ delete: del })) }, del, eq1, eq2 };
}

const call = (studentId = STUDENT) =>
  DELETE(new Request(`http://t/api/education/classroom/${CLASSROOM}/members/${studentId}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id: CLASSROOM, studentId }),
  });

function owner(sb: unknown) {
  vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: true, sb, userId: 't1', classroom: { id: CLASSROOM } } as never);
}

describe('DELETE /api/education/classroom/[id]/members/[studentId] (roster remove)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the ownership refusal through and deletes nothing', async () => {
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) });
    expect((await call()).status).toBe(403);
  });

  it('400s a malformed student id', async () => {
    const t = teacherClient([{ id: 'm1' }]);
    owner(t.client);
    expect((await call('nope')).status).toBe(400);
    expect(t.del).not.toHaveBeenCalled();
  });

  it('removes exactly that student from that class on the teacher\'s own client, with no service role', async () => {
    const t = teacherClient([{ id: 'm1' }]);
    owner(t.client);
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(t.client.from).toHaveBeenCalledWith('classroom_memberships');
    expect(t.eq1).toHaveBeenCalledWith('classroom_id', CLASSROOM);
    expect(t.eq2).toHaveBeenCalledWith('student_id', STUDENT);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('is free: a teacher without Pro can still manage the roster', async () => {
    const t = teacherClient([{ id: 'm1' }]);
    owner(t.client);
    expect((await call()).status).toBe(200);
  });

  it('404s when no row was removed (not on this roster), never a silent success', async () => {
    owner(teacherClient([]).client);
    expect((await call()).status).toBe(404);
  });

  it('500s on a database error', async () => {
    owner(teacherClient(null, { message: 'boom' }).client);
    expect((await call()).status).toBe(500);
  });
});
