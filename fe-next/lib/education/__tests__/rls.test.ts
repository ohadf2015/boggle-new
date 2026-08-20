import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLiveEnv = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
// The enumeration probe needs a SIGNED-IN stranger, and anonymous sign-ins are disabled on
// this project — so it mints and deletes a throwaway user, which needs the service-role key.
const hasServiceRole = hasLiveEnv && !!SERVICE_ROLE_KEY;

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

describe.skipIf(!hasServiceRole)('a guest student can join a classroom (live DB)', () => {
  /**
   * The guest path had three separate things wrong with it, stacked, each hiding the next:
   *
   *   1. anonymous sign-ins were disabled on the project, so the route 500'd immediately;
   *   2. the guest profile upsert named an `is_guest` column that profiles does not have,
   *      which makes PostgREST reject the whole write;
   *   3. guard_profiles_privileged_columns ran with an empty search_path but cast to a bare
   *      `'student'::user_role`, so the trigger itself raised `type "user_role" does not
   *      exist` on every client-role INSERT — including the INSERT half of any upsert.
   *
   * Each fix only revealed the one behind it, and none of them was visible from unit tests
   * because they all live in the database. So this walks the real thing, as a real anonymous
   * user holding nothing but the public anon key.
   */
  it('signs in anonymously, gets a name the teacher can see, and still cannot self-promote', async () => {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const sb = anonClient();

    const signIn = await sb.auth.signInAnonymously();
    expect(signIn.error).toBeNull();
    const guestId = signIn.data.user!.id;

    try {
      // The write the join route makes so the roster has a name to render.
      const upsert = await sb
        .from('profiles')
        .upsert({ id: guestId, username: 'RLS guest probe' }, { onConflict: 'id' })
        .select('id');
      expect(upsert.error).toBeNull();

      // And the teacher must actually be able to read that name back — via public_profiles,
      // since profiles itself is own-row-only.
      const seen = await admin.from('public_profiles').select('username').eq('id', guestId).single();
      expect(seen.data?.username).toBe('RLS guest probe');

      // Enabling anonymous auth must not hand a throwaway account any privilege. Both the
      // update and the upsert route into the same guard.
      const viaUpdate = await sb.from('profiles').update({ user_role: 'teacher' }).eq('id', guestId).select('id');
      expect(viaUpdate.error).not.toBeNull();

      const viaUpsert = await sb
        .from('profiles')
        .upsert({ id: guestId, username: 'x', user_role: 'teacher' }, { onConflict: 'id' })
        .select('id');
      expect(viaUpsert.error).not.toBeNull();

      const stillStudent = await admin.from('profiles').select('user_role').eq('id', guestId).single();
      expect(stillStudent.data?.user_role).toBe('student');
    } finally {
      await admin.auth.admin.deleteUser(guestId);
    }
  });
});

describe.skipIf(!hasLiveEnv)('classrooms are not enumerable (live DB)', () => {
  /**
   * The SELECT policy used to start with `auth.uid() IS NOT NULL AND join_code IS NOT NULL`,
   * which handed any signed-in account the full classroom list — names and join codes, i.e. a
   * working key to every class. It only existed for the join-by-code path, which now goes
   * through the SECURITY DEFINER lookup_classroom_by_join_code() RPC instead.
   *
   * This MUST run as a SIGNED-IN account, not a bare anon key. The removed clause was
   * `auth.uid() IS NOT NULL AND ...`, false for anon anyway — and the sibling clause calls
   * is_classroom_member(), which anon has no EXECUTE on, so a bare-anon probe returns null
   * under the holed policy exactly as it does under the fixed one. Such a test passes either
   * way and guards nothing.
   *
   * signInAnonymously() is not an option — anonymous sign-ins are disabled on this project.
   * So mint a throwaway email user with the service-role key, sign in as them (role
   * `authenticated`, a real uid that is neither member, teacher, nor admin — precisely the
   * account the old clause handed the whole directory to), probe, and delete them.
   *
   * Confirmed to discriminate: with the blanket clause temporarily restored on the live DB
   * this assertion fails; it passes once the clause is dropped again.
   */
  it.skipIf(!hasServiceRole)('a signed-in stranger cannot list classrooms or harvest join codes', async () => {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const email = `rls-stranger-${Date.now()}@example.com`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;

    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    const strangerId = created.data.user!.id;

    try {
      const sb = anonClient();
      const signIn = await sb.auth.signInWithPassword({ email, password });
      expect(signIn.error).toBeNull();
      expect(signIn.data.user?.id).toBe(strangerId);

      // Sanity-check the probe is meaningful: there is at least one classroom to leak.
      const { count } = await admin.from('classrooms').select('*', { count: 'exact', head: true });
      expect(count).toBeGreaterThan(0);

      const { data } = await sb.from('classrooms').select('id, name, join_code').limit(5);

      expect(data ?? []).toEqual([]);
    } finally {
      await admin.auth.admin.deleteUser(strangerId);
    }
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
