/**
 * API Route: POST /api/admin/edu-dashboard/outreach
 *
 * Logs one owner nudge to a stuck teacher. The server enforces the cooldown, so a
 * teacher cannot be chased from two tabs or by repeated clicks. A missing
 * admin_edu_outreach table answers 503; the copy/email actions still work client-side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { isOutreachCoolingDown, OUTREACH_CHANNELS, type OutreachChannel } from '@/lib/admin/eduOutreach';
import { migrationPendingHint, type PostgrestLikeError } from '@/lib/supabase/migrationPendingHint';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isChannel(value: unknown): value is OutreachChannel {
  return typeof value === 'string' && (OUTREACH_CHANNELS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const body = (await request.json().catch(() => null)) as { teacherId?: unknown; channel?: unknown } | null;
  const teacherId = typeof body?.teacherId === 'string' ? body.teacherId : '';
  if (!UUID.test(teacherId) || !isChannel(body?.channel)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const teacher = await supabase
    .from('profiles')
    .select('id, is_test_account')
    .eq('id', teacherId)
    .maybeSingle();
  if (teacher.error) return NextResponse.json({ error: teacher.error.message }, { status: 500 });
  if (!teacher.data || teacher.data.is_test_account) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const last = await supabase
    .from('admin_edu_outreach')
    .select('created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (last.error) {
    if (migrationPendingHint(last.error as PostgrestLikeError)) {
      return NextResponse.json({ error: 'outreach_unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: last.error.message }, { status: 500 });
  }
  const lastAt = last.data?.[0]?.created_at ?? null;
  if (isOutreachCoolingDown(lastAt, Date.now())) {
    return NextResponse.json({ error: 'cooldown', lastAt }, { status: 409 });
  }

  const inserted = await supabase
    .from('admin_edu_outreach')
    .insert({ teacher_id: teacherId, channel: body!.channel, created_by: authResult.user?.id ?? null })
    .select('created_at')
    .single();
  if (inserted.error) {
    if (migrationPendingHint(inserted.error as PostgrestLikeError)) {
      return NextResponse.json({ error: 'outreach_unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, createdAt: inserted.data?.created_at ?? null });
}
