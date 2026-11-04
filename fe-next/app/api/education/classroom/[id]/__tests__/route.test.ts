import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/education/ownedClassroomRoute', () => ({ authorizeClassroomOwner: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { DELETE } from '../route';
import { createAdminClient } from '@/utils/supabase/admin';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';

const CLASS = '11111111-1111-4111-8111-111111111111';

function admin(deleted: unknown[] = [{ id: CLASS }]) {
  const selectAfterDelete = vi.fn(async () => ({ data: deleted, error: null }));
  const eq = vi.fn(() => ({ select: selectAfterDelete }));
  const del = vi.fn(() => ({ eq }));
  const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  const eqSelect = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: eqSelect }));
  return { from: vi.fn(() => ({ delete: del, select })), del };
}

const call = () =>
  DELETE(new Request(`http://t/api/education/classroom/${CLASS}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id: CLASS }),
  });

describe('DELETE /api/education/classroom/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes an ownership refusal through and deletes nothing', async () => {
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false }, { status: 403 }),
    });
    expect((await call()).status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('deletes rounds then the classroom for the owning teacher', async () => {
    const db = admin();
    vi.mocked(createAdminClient).mockReturnValue(db as never);
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({
      ok: true,
      sb: {},
      userId: 't1',
      classroom: { id: CLASS },
    } as never);
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, alreadyDeleted: false });
    expect(db.from).toHaveBeenCalledWith('classroom_rounds');
    expect(db.from).toHaveBeenCalledWith('classrooms');
  });

  it('500s when the service role client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never);
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({
      ok: true,
      sb: {},
      userId: 't1',
      classroom: { id: CLASS },
    } as never);
    expect((await call()).status).toBe(500);
  });
});
