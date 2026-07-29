import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessDecline } from '@/lib/email/templates/teacherAccessDecline';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: any = {}; try { body = await req.json(); } catch {}
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : undefined;

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('id, is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ ok: false }, { status: 403 });

  const { data: row } = await sb.from('teacher_access_requests').select('*').eq('id', id).single();
  if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const upd = await sb.from('teacher_access_requests').update({
    status: 'declined',
    admin_note: reason || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq('id', id);
  if (upd.error) return NextResponse.json({ ok: false }, { status: 500 });

  const tpl = teacherAccessDecline({ full_name: row.full_name, locale: row.locale, reason });
  await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });

  return NextResponse.json({ ok: true });
}
