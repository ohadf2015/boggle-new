import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Admin list of school/district leads. Inline cookie auth + is_admin (mirrors the
// teacher-access admin route); school_leads SELECT is admin-only under RLS so the
// admin session can read while the public anon form path cannot.
export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('id, is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const role = url.searchParams.get('role');
  const studentCount = url.searchParams.get('student_count');
  const locale = url.searchParams.get('locale');
  const interest = url.searchParams.get('interest');
  const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10));
  const PAGE_SIZE = 50;

  let q = sb.from('school_leads').select('*', { count: 'exact' });
  if (role) q = q.eq('role', role);
  if (studentCount) q = q.eq('student_count', studentCount);
  if (locale) q = q.eq('locale', locale);
  if (interest) q = q.contains('interests', [interest]);
  q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, rows: data, count, page, pageSize: PAGE_SIZE });
}
