/**
 * API Route: /api/admin/notifications  (admins only)
 *
 * GET  -> newest notifications + unread count, for the admin bell.
 * POST -> mark read: { all: true } or { ids: uuid[] }.
 *
 * Read state is global, not per admin: one owner reads the feed. Add a per-admin
 * reads table if a second admin ever needs their own unread count.
 * A database without the table yet answers an empty feed (`available: false`), so the
 * bell stays quiet instead of erroring on every admin page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { migrationPendingHint } from '@/lib/supabase/migrationPendingHint';

const PAGE = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const [list, unread] = await Promise.all([
    supabase
      .from('admin_notifications')
      .select('id, kind, severity, title, body, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(PAGE),
    supabase.from('admin_notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ]);

  const error = list.error ?? unread.error;
  if (error) {
    if (migrationPendingHint(error)) return NextResponse.json({ items: [], unread: 0, available: false });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: list.data ?? [], unread: unread.count ?? 0, available: true });
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const body = (await request.json().catch(() => null)) as { all?: unknown; ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids : null;
  const valid = body?.all === true || (ids !== null && ids.length > 0 && ids.length <= PAGE && ids.every((id) => typeof id === 'string' && UUID.test(id)));
  if (!valid) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const base = supabase.from('admin_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  const { error } = body?.all === true ? await base : await base.in('id', ids as string[]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
