import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessAdminNotify } from '@/lib/email/templates/teacherAccessAdminNotify';
import type { TeacherAccessFormPayload } from '@/lib/education/types';

const ROLES = ['teacher', 'tutor', 'admin', 'parent', 'researcher', 'other'] as const;
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid json'); }

  const { role, locale, use_case, school_or_org } = body || {};

  if (!ROLES.includes(role)) return bad('invalid role');
  if (!LOCALES.includes(locale)) return bad('invalid locale');
  if (typeof use_case !== 'string' || use_case.length < 10 || use_case.length > 800) return bad('use_case must be 10-800 chars');
  if (school_or_org && (typeof school_or_org !== 'string' || school_or_org.length > 200)) return bad('invalid school_or_org');

  const sb = await createClient();

  // Teacher access requires a signed-up account with a verified email. The
  // request is bound to that verified identity — the email is taken from the
  // account (not the form body), so a request can never be filed for an
  // address the requester hasn't proven they own.
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return bad('sign up and sign in to request teacher access', 401);
  if (!user.email_confirmed_at) return bad('verify your email address first', 403);
  if (!user.email || !EMAIL_RE.test(user.email)) return bad('account has no verified email', 403);
  const email = user.email;

  // Name and country are already captured at signup — never re-asked in the
  // form. Derive them from the account/profile so the stored request stays
  // consistent with the verified identity (single source of truth).
  const { data: profile } = await sb
    .from('profiles')
    .select('display_name, username, country_code')
    .eq('id', user.id)
    .maybeSingle();
  const metaName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    '';
  const full_name = (profile?.display_name || profile?.username || metaName || email.split('@')[0])
    .toString()
    .slice(0, 120);
  const country = profile?.country_code || undefined;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await sb
    .from('teacher_access_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if ((recent.count || 0) >= 3) return bad('too many requests in 24h, try again later', 429);

  const payload: TeacherAccessFormPayload = { email, full_name, role, locale, use_case, school_or_org, country };
  const ins = await sb.from('teacher_access_requests').insert({ ...payload, user_id: user.id });
  if (ins.error) return bad('insert failed: ' + ins.error.message, 500);

  const tpl = teacherAccessAdminNotify(payload);
  await sendEmail({ to: 'lexiclash.game@gmail.com', subject: tpl.subject, html: tpl.html });

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const sb = await createClient();
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ row: null });
  const { data } = await sb.from('teacher_access_requests')
    .select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ row: data });
}
