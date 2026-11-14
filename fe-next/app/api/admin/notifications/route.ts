/**
 * API Route: /api/admin/notifications  (admins only)
 *
 * GET  -> newest notifications + this admin's unread count, for the admin bell.
 * POST -> { seenAt } : the admin opened the bell and saw everything up to seenAt.
 *
 * Unread is per admin (admin_notification_seen), so one admin opening the bell never
 * clears it for another. A database without the tables yet answers an empty feed
 * (`available: false`), so the bell stays quiet instead of erroring on every admin page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { migrationPendingHint } from '@/lib/supabase/migrationPendingHint';

const PAGE = 30;

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const seen = await supabase.from('admin_notification_seen').select('seen_at').eq('admin_id', authResult.user!.id).maybeSingle();
  const seenAt = (seen.data as { seen_at?: string } | null)?.seen_at ?? null;

  const listQuery = supabase
    .from('admin_notifications')
    .select('id, kind, severity, title, body, link, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE);
  const unreadQuery = supabase.from('admin_notifications').select('id', { count: 'exact', head: true });
  const [list, unread] = await Promise.all([listQuery, seenAt ? unreadQuery.gt('created_at', seenAt) : unreadQuery]);

  const error = list.error ?? unread.error;
  if (error) {
    if (migrationPendingHint(error)) return NextResponse.json({ items: [], unread: 0, available: false });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const seenMs = seenAt ? Date.parse(seenAt) : -Infinity;
  const items = ((list.data ?? []) as Array<{ created_at: string }>).map((n) => ({
    ...n,
    read_at: Date.parse(n.created_at) <= seenMs ? seenAt : null,
  }));
  return NextResponse.json({ items, unread: unread.count ?? 0, available: true });
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const body = (await request.json().catch(() => null)) as { seenAt?: unknown } | null;
  const ms = typeof body?.seenAt === 'string' ? Date.parse(body.seenAt) : NaN;
  if (!Number.isFinite(ms)) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const seen_at = new Date(Math.min(ms, Date.now())).toISOString();
  const { error } = await supabase
    .from('admin_notification_seen')
    .upsert({ admin_id: authResult.user!.id, seen_at }, { onConflict: 'admin_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
