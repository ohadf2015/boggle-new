import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';

/**
 * DELETE /api/account/delete
 * Permanently deletes the authenticated user's account and all associated data.
 * Uses admin client to delete from auth.users — cascades to profiles and all FK'd tables.
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

    // 4. Delete the auth user — cascades to profiles and all FK'd tables
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
