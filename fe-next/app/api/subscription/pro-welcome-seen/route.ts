import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * POST /api/subscription/pro-welcome-seen
 *
 * Marks the caller's complimentary-Pro celebration as shown. Called the moment
 * the modal RENDERS, not when it is dismissed: a reload without dismissing must
 * not re-pop it (recurring pitfall class 1 — persist at show-time).
 *
 * Own rows only (`user_id = caller`); service-role because the write policy
 * for this table is deliberately server-only.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });

  const { error } = await admin
    .from('teacher_pro_grants')
    .update({ welcomed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('welcomed_at', null)
    .select('id');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
