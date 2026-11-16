import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadPublicProfileName } from '../loadPublicProfileName';

const ID = '3fa2b1c4-1111-4222-8333-444455556666';

type Rows = Record<string, { data: unknown; error: unknown }>;

function fakeDb(rows: Rows, delayMs = 0) {
  const calls: Array<{ table: string; col: string; val: string }> = [];
  const db = {
    from(table: string) {
      const q = {
        select: () => q,
        limit: () => q,
        eq: (col: string, val: string) => { calls.push({ table, col, val }); return q; },
        maybeSingle: () => q,
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          new Promise((r) => setTimeout(r, delayMs)).then(() => rows[table] ?? { data: null, error: null }).then(res, rej),
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, calls };
}

describe('loadPublicProfileName', () => {
  it('Given a chosen display name and an adult account, Then it returns the name', async () => {
    const { db, calls } = fakeDb({
      profiles: { data: { id: ID, display_name: '  Dana  ' }, error: null },
      classroom_memberships: { data: [], error: null },
      parental_consents: { data: [], error: null },
    });
    await expect(loadPublicProfileName(db, { id: ID })).resolves.toBe('Dana');
    expect(calls).toContainEqual({ table: 'profiles', col: 'id', val: ID });
  });

  it('Given a username key, Then it looks the profile up by username', async () => {
    const { db, calls } = fakeDb({
      profiles: { data: { id: ID, display_name: 'Dana' }, error: null },
      classroom_memberships: { data: [], error: null },
      parental_consents: { data: [], error: null },
    });
    await expect(loadPublicProfileName(db, { username: 'dana_w' })).resolves.toBe('Dana');
    expect(calls).toContainEqual({ table: 'profiles', col: 'username', val: 'dana_w' });
    expect(calls).toContainEqual({ table: 'classroom_memberships', col: 'student_id', val: ID });
  });

  it('Given a student in a classroom, Then no name is returned', async () => {
    const { db } = fakeDb({
      profiles: { data: { id: ID, display_name: 'Dana' }, error: null },
      classroom_memberships: { data: [{ student_id: ID }], error: null },
      parental_consents: { data: [], error: null },
    });
    await expect(loadPublicProfileName(db, { id: ID })).resolves.toBeNull();
  });

  it('Given a player under parental consent, Then no name is returned', async () => {
    const { db } = fakeDb({
      profiles: { data: { id: ID, display_name: 'Dana' }, error: null },
      classroom_memberships: { data: [], error: null },
      parental_consents: { data: [{ user_id: ID }], error: null },
    });
    await expect(loadPublicProfileName(db, { id: ID })).resolves.toBeNull();
  });

  it('Given a generated name and no display name, Then it never falls back to the username', async () => {
    const { db } = fakeDb({
      profiles: { data: { id: ID, display_name: null, username: 'Player_3fa2b1' }, error: null },
      classroom_memberships: { data: [], error: null },
      parental_consents: { data: [], error: null },
    });
    await expect(loadPublicProfileName(db, { id: ID })).resolves.toBeNull();
  });

  it('Given the safety lookup fails, Then it fails closed with no name', async () => {
    const { db } = fakeDb({
      profiles: { data: { id: ID, display_name: 'Dana' }, error: null },
      classroom_memberships: { data: null, error: { message: 'boom' } },
      parental_consents: { data: [], error: null },
    });
    await expect(loadPublicProfileName(db, { id: ID })).resolves.toBeNull();
  });

  it('Given no db or a malformed key, Then it returns null without querying', async () => {
    const { db, calls } = fakeDb({});
    await expect(loadPublicProfileName(null, { id: ID })).resolves.toBeNull();
    await expect(loadPublicProfileName(db, { id: 'not-a-uuid' })).resolves.toBeNull();
    await expect(loadPublicProfileName(db, { username: "x';drop" })).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('Given a slow database, Then it gives up at the time cap', async () => {
    vi.useFakeTimers();
    const { db } = fakeDb({ profiles: { data: { id: ID, display_name: 'Dana' }, error: null } }, 5_000);
    const p = loadPublicProfileName(db, { id: ID }, 100);
    await vi.advanceTimersByTimeAsync(150);
    await expect(p).resolves.toBeNull();
    vi.useRealTimers();
  });
});
