import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Proves the fix for 20260903120000_fix_user_deletion_setnull_notnull_contradiction.sql:
// season_leaderboards.player_id was NOT NULL while its FK to profiles(id) was
// ON DELETE SET NULL, so deleting any account archived into a season leaderboard failed
// with 23502. This walks the real path the app uses — auth.admin.deleteUser(), the same
// call /api/account/delete makes — against the live project, the same pattern as
// lib/education/__tests__/rls.test.ts (mint-a-throwaway-user, service-role only, RLS/DB
// behavior can't be verified any other way because it lives in the database).
//
// IMPORTANT: this migration ships in the same PR as this test and is NOT applied by
// running this file — fe-next/supabase/migrations/** is only pushed to prod by
// .github/workflows/supabase-migrations.yml on merge to master. Until that migration is
// live, this test is a REPRODUCTION of the bug (it fails). After the merge applies it,
// this test is the proof the fix works (it passes). Do not read a failure here, on this
// branch, as "the fix doesn't work" — read it as "the migration hasn't been applied yet."
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLiveEnv = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
// Same reasoning as rls.test.ts: fe-next/.env ships a placeholder service-role key that is
// truthy but invalid, so gate on it actually looking like a key, not just being set.
const hasServiceRole =
  hasLiveEnv && !!SERVICE_ROLE_KEY && !SERVICE_ROLE_KEY.startsWith('YOUR_');

const adminClient = () =>
  createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

describe.skipIf(!hasServiceRole)('account deletion with an archived season_leaderboards row (live DB)', () => {
  it('auth.admin.deleteUser() succeeds and anonymizes (not orphans) the archived row', async () => {
    const admin = adminClient();
    const email = `user-deletion-test-${Date.now()}@example.com`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;

    // 1. A real user, the way any player signs up.
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    const userId = created.data.user!.id;

    // 2. Confirm the auto-provisioning trigger gave them a profiles row (it must exist for
    //    the FK below to insert at all).
    const profile = await admin.from('profiles').select('id').eq('id', userId).single();
    expect(profile.data?.id).toBe(userId);

    // 3. The exact shape that made deletion impossible: this player archived into a season
    //    leaderboard. season 1 is seeded by 20260426160000_seasons_infrastructure.sql.
    const archived = await admin
      .from('season_leaderboards')
      .insert({
        season_id: 1,
        player_id: userId,
        username: 'user-deletion-test-player',
        total_score: 1234,
        games_played: 5,
        games_won: 3,
        rank_position: 999999,
      })
      .select('id')
      .single();
    expect(archived.error).toBeNull();
    const rowId = archived.data!.id;

    try {
      // 4. The actual call /api/account/delete makes. Before the fix this returns
      //    "Database error deleting user" (23502 underneath).
      const deleted = await admin.auth.admin.deleteUser(userId);
      expect(deleted.error).toBeNull();

      // 5. The auth user and profile are really gone.
      const profileAfter = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
      expect(profileAfter.data).toBeNull();

      // 6. The archived leaderboard row SURVIVES (history preserved) but is anonymized:
      //    player_id nulled by the FK, username/display_name scrubbed by the
      //    anonymize_season_leaderboards_on_profile_delete trigger — not left holding the
      //    deleted player's real handle.
      const rowAfter = await admin
        .from('season_leaderboards')
        .select('player_id, username, display_name, total_score, rank_position')
        .eq('id', rowId)
        .single();
      expect(rowAfter.error).toBeNull();
      expect(rowAfter.data?.player_id).toBeNull();
      expect(rowAfter.data?.username).not.toBe('user-deletion-test-player');
      expect(rowAfter.data?.display_name).toBeNull();
      // The historical stats themselves are untouched.
      expect(rowAfter.data?.total_score).toBe(1234);
      expect(rowAfter.data?.rank_position).toBe(999999);
    } finally {
      // Cleanup: the row has no player_id to filter by anymore once anonymized, so key off
      // its own id regardless of whether the assertions above passed.
      await admin.from('season_leaderboards').delete().eq('id', rowId);
      // Deletion may have already succeeded inside the try block; deleting an
      // already-deleted auth user is a harmless no-op error we don't need to check.
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
  });
});
