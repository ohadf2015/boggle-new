import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';

/**
 * DELETE /api/account/delete
 * Permanently deletes the authenticated user's account and all associated data.
 * Uses admin client to delete from auth.users — cascades to profiles and all FK'd tables.
 *
 * "All FK'd tables" is the catch: teacher access rows are keyed by the email
 * STRING, not by a user id, so no cascade reaches them. A teacher who deleted
 * her account on 2026-09-20 still had her address sitting in
 * `teacher_access_requests` afterwards. Anything holding the address as text
 * has to be cleared explicitly, here, before the auth row (and with it the
 * only copy of the email) goes away.
 */
export async function DELETE() {
  try {
    // 1. Verify the user is authenticated via session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get admin client (service role — bypasses RLS)
    const admin = createAdminClient();
    if (!admin) {
      captureApiError(
        new Error('Admin client unavailable for account deletion'),
        '/api/account/delete',
        { method: 'DELETE', userId: user.id, statusCode: 500 }
      );
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 3. Clean up push tokens explicitly (may not have CASCADE FK)
    await admin
      .from('user_push_tokens')
      .delete()
      .eq('user_id', user.id)
      .then(() => {});

    // 4. Clear rows keyed by the email STRING — no FK, so no cascade. Must run
    //    BEFORE deleteUser, which is what destroys our copy of the address.
    //    Signup lowercases the address while the request row keeps whatever the
    //    teacher typed, so match lowercased on both sides.
    const email = user.email?.toLowerCase();
    if (email) {
      for (const table of ['teacher_access_requests', 'teacher_access_allowlist'] as const) {
        const { error: emailRowError } = await admin.from(table).delete().eq('email', email);
        // Non-fatal: the account must still go. But it must not vanish
        // silently — an un-erased address is the whole point of the request.
        if (emailRowError) {
          captureApiError(
            new Error(`Failed to clear ${table} for deleted account: ${emailRowError.message}`),
            '/api/account/delete',
            { method: 'DELETE', userId: user.id, statusCode: 500 }
          );
        }
      }
    }

    // 5. Delete the auth user — cascades to profiles and all FK'd tables
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      captureApiError(
        new Error(deleteError.message),
        '/api/account/delete',
        { method: 'DELETE', userId: user.id, statusCode: 500 }
      );
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    captureApiError(
      err instanceof Error ? err : new Error('Account deletion error'),
      '/api/account/delete',
      { method: 'DELETE', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
