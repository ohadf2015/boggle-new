import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return new Response('Forbidden', { status: 403 });

  const url = new URL(req.url);
  let q = sb.from('teacher_access_requests').select('*').order('created_at', { ascending: false });
  const status = url.searchParams.get('status');
  const locale = url.searchParams.get('locale');
  const country = url.searchParams.get('country');
  if (status) q = q.eq('status', status);
  if (locale) q = q.eq('locale', locale);
  if (country) q = q.eq('country', country);

  const { data } = await q;
  const rows = data || [];
  const headers = ['id','created_at','email','full_name','role','locale','country','school_or_org','status','admin_note','use_case'];
  const csv = [headers.join(',')].concat(
    rows.map((r: any) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ).join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv',
      'content-disposition': `attachment; filename="teacher-access-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
