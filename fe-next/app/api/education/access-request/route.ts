import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessAdminNotify } from '@/lib/email/templates/teacherAccessAdminNotify';
import type { TeacherAccessFormPayload } from '@/lib/education/types';

const ROLES = ['teacher', 'tutor', 'admin', 'parent', 'researcher', 'other'] as const;
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid json'); }

  const { email, full_name, role, locale, use_case, school_or_org, country } = body || {};

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) return bad('invalid email');
  if (!full_name || typeof full_name !== 'string' || full_name.length < 2 || full_name.length > 120) return bad('invalid full_name');
  if (!ROLES.includes(role)) return bad('invalid role');
  if (!LOCALES.includes(locale)) return bad('invalid locale');
  if (typeof use_case !== 'string' || use_case.length < 10 || use_case.length > 800) return bad('use_case must be 10-800 chars');
  if (school_or_org && (typeof school_or_org !== 'string' || school_or_org.length > 200)) return bad('invalid school_or_org');
  if (country && (typeof country !== 'string' || country.length > 80)) return bad('invalid country');

  const sb = await createClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await sb
    .from('teacher_access_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if ((recent.count || 0) >= 3) return bad('too many requests in 24h, try again later', 429);

  const payload: TeacherAccessFormPayload = { email, full_name, role, locale, use_case, school_or_org, country };
  const ins = await sb.from('teacher_access_requests').insert({ ...payload, user_id: null });
  if (ins.error) return bad('insert failed: ' + ins.error.message, 500);

  const tpl = teacherAccessAdminNotify(payload);
  await sendEmail({ to: 'lexiclash.game@gmail.com', subject: tpl.subject, html: tpl.html });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ row: null });
  const { data } = await sb.from('teacher_access_requests')
    .select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ row: data });
}
