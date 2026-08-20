import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasLiveEnv = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const anonClient = () => createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

describe.skipIf(!hasLiveEnv)('teacher_access_requests RLS (live DB)', () => {
  it('anon CAN insert a new request', async () => {
    const sb = anonClient();
    const { error } = await sb.from('teacher_access_requests').insert({
      email: `rls-test-${Date.now()}@example.com`,
      full_name: 'RLS Test',
      role: 'teacher',
      locale: 'en',
      use_case: 'integration test for RLS policy',
    });
    expect(error).toBeNull();
  });

  it('anon CANNOT select rows', async () => {
    const sb = anonClient();
    const { data } = await sb.from('teacher_access_requests').select('*').limit(1);
    // Denial arrives as an ERROR here, not an empty set: the SELECT policy calls
    // is_admin_user(), and EXECUTE on it is granted to authenticated/service_role but not
    // to anon, so PostgREST returns 42501 with data:null. Assert the property that matters
    // — no rows leak — rather than one of the two shapes denial can take.
    expect(data ?? []).toEqual([]);
  });

  it('anon CANNOT update rows', async () => {
    const sb = anonClient();
    const testEmail = `rls-update-test-${Date.now()}@example.com`;
    // 1. Insert a row as anon (allowed by RLS).
    const ins = await sb.from('teacher_access_requests').insert({
      email: testEmail,
      full_name: 'Update Test',
      role: 'teacher',
      locale: 'en',
      use_case: 'integration test for update RLS',
    });
    expect(ins.error).toBeNull();

    // 2. Try to update that same row as anon.
    const upd = await sb.from('teacher_access_requests')
      .update({ status: 'approved' })
      .eq('email', testEmail)
      .select();

    // 3. RLS should block — either as zero rows updated or as a permission error (the
    //    UPDATE policy calls is_admin_user(), which anon may not EXECUTE). Both are denial;
    //    what must never happen is the row coming back changed.
    expect(upd.data ?? []).toEqual([]);
  });
});

describe.skipIf(!hasLiveEnv)('classrooms are not enumerable (live DB)', () => {
  /**
   * The SELECT policy used to start with `auth.uid() IS NOT NULL AND join_code IS NOT NULL`,
   * which handed any signed-in account the full classroom list — names and join codes, i.e. a
   * working key to every class. It only existed for the join-by-code path, which now goes
   * through the SECURITY DEFINER lookup_classroom_by_join_code() RPC instead.
   *
   * anon stands in for "an account with no relationship to any classroom": neither member,
   * nor teacher, nor admin.
   */
  it('anon cannot list classrooms or harvest join codes', async () => {
    const sb = anonClient();
    const { data } = await sb.from('classrooms').select('id, name, join_code').limit(5);
    expect(data ?? []).toEqual([]);
  });
});

describe.skipIf(!hasLiveEnv)('public_profiles view is read-only to the public key (live DB)', () => {
  /**
   * `public_profiles` is a view over `profiles` with security_invoker OFF — deliberately,
   * because that is how teachers, leaderboards and friends read other players' names past
   * the own-row-only RLS on profiles. But the view is auto-updatable, and INSERT/UPDATE/
   * DELETE had been granted to anon and authenticated. Since the view bypasses RLS, any
   * holder of the public anon key could rewrite any user's username, display name, avatar
   * or score through it — reopening, via the view, the anon-write hole that was closed on
   * profiles itself.
   *
   * Privileges were revoked. Reads must keep working; writes must not.
   */
  it('anon CAN still read (the whole point of the view)', async () => {
    const sb = anonClient();
    const { data, error } = await sb.from('public_profiles').select('id').limit(1);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it('anon CANNOT update through the view', async () => {
    const sb = anonClient();
    const { data: victim } = await sb.from('public_profiles').select('id, username').limit(1).single();

    const upd = await sb
      .from('public_profiles')
      .update({ username: `pwned-${Date.now()}` })
      .eq('id', victim!.id)
      .select();

    expect(upd.error).not.toBeNull();

    // Belt and braces: prove the row is untouched, since a swallowed error would look
    // identical to a blocked write from the caller's side.
    const { data: after } = await sb.from('public_profiles').select('username').eq('id', victim!.id).single();
    expect(after!.username).toBe(victim!.username);
  });
});
