import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return new Response('Forbidden', { status: 403 });

  const url = new URL(req.url);
  let q = sb.from('school_leads').select('*').order('created_at', { ascending: false });
  const role = url.searchParams.get('role');
  const studentCount = url.searchParams.get('student_count');
  const locale = url.searchParams.get('locale');
  const interest = url.searchParams.get('interest');
  if (role) q = q.eq('role', role);
  if (studentCount) q = q.eq('student_count', studentCount);
  if (locale) q = q.eq('locale', locale);
  if (interest) q = q.contains('interests', [interest]);

  const { data } = await q;
  const rows = data || [];
  const headers = ['id', 'created_at', 'school_or_district', 'full_name', 'email', 'role', 'student_count', 'interests', 'country', 'locale', 'message', 'source'];
  const csv = [headers.join(',')].concat(
    rows.map((r: any) =>
      headers
        .map((hd) => {
          const v = hd === 'interests' && Array.isArray(r[hd]) ? r[hd].join('; ') : r[hd];
          return `"${String(v ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    )
  ).join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv',
      'content-disposition': `attachment; filename="school-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
