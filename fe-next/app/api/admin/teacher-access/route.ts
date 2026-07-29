import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('id, is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const locale = url.searchParams.get('locale');
  const country = url.searchParams.get('country');
  const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10));
  const PAGE_SIZE = 50;

  let q = sb.from('teacher_access_requests').select('*', { count: 'exact' });
  if (status) q = q.eq('status', status);
  if (locale) q = q.eq('locale', locale);
  if (country) q = q.eq('country', country);
  q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, rows: data, count, page, pageSize: PAGE_SIZE });
}
