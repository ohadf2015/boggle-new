import { describe, it, expect, vi } from 'vitest';
import { findUserIdByEmail } from '../findUserIdByEmail';

function fakeAuthAdmin(pages: Array<Array<{ id: string; email: string }>>) {
  const listUsers = vi.fn(async ({ page }: { page: number; perPage: number }) => {
    const users = pages[page - 1] ?? [];
    return { data: { users }, error: null };
  });
  return { auth: { admin: { listUsers } } } as any;
}

describe('findUserIdByEmail', () => {
  it('finds a match on the first page, case-insensitively', async () => {
    const admin = fakeAuthAdmin([[{ id: 'u1', email: 'tori.plant@belcourt.k12.nd.us' }]]);
    const r = await findUserIdByEmail(admin, 'Tori.Plant@Belcourt.K12.ND.US');
    expect(r).toEqual({ userId: 'u1' });
  });

  it('pages through listUsers until it finds a later match', async () => {
    const page1 = Array.from({ length: 3 }, (_, i) => ({ id: `p1-${i}`, email: `a${i}@x.org` }));
    const page2 = [{ id: 'u9', email: 'new@school.org' }];
    const admin = fakeAuthAdmin([page1, page2]);
    admin.auth.admin.listUsers = vi.fn(async ({ page }: { page: number; perPage: number }) => {
      if (page === 1) return { data: { users: Array.from({ length: 200 }, (_, i) => ({ id: `p1-${i}`, email: `a${i}@x.org` })) }, error: null };
      if (page === 2) return { data: { users: page2 }, error: null };
      return { data: { users: [] }, error: null };
    });
    const r = await findUserIdByEmail(admin, 'new@school.org');
    expect(r).toEqual({ userId: 'u9' });
    expect(admin.auth.admin.listUsers).toHaveBeenCalledTimes(2);
  });

  it('returns userId null when no page has a match', async () => {
    const admin = fakeAuthAdmin([[{ id: 'u1', email: 'someone@else.org' }]]);
    const r = await findUserIdByEmail(admin, 'nobody@school.org');
    expect(r).toEqual({ userId: null });
  });

  it('propagates a listUsers error instead of silently returning not-found', async () => {
    const admin = { auth: { admin: { listUsers: vi.fn(async () => ({ data: null, error: { message: 'auth admin api down' } })) } } } as any;
    const r = await findUserIdByEmail(admin, 't@x.org');
    expect(r).toEqual({ userId: null, error: 'auth admin api down' });
  });

  it('rejects an empty email without calling listUsers', async () => {
    const listUsers = vi.fn();
    const admin = { auth: { admin: { listUsers } } } as any;
    const r = await findUserIdByEmail(admin, '   ');
    expect(r).toEqual({ userId: null });
    expect(listUsers).not.toHaveBeenCalled();
  });
});
