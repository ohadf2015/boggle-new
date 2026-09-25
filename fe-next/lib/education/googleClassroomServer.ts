/**
 * Shared server gate for every /api/education/google-classroom/* route.
 *
 * Order: flag (404 before auth) → Supabase user (401) → classroom ownership on
 * the request-scoped client (403 not_owner) → service role (500) → Teacher Pro
 * via resolveProEntitlement (403 not_pro). Never imports the browser client.
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';
import { resolveProEntitlement } from './proGrant';
import { isGradePassbackServerEnabled } from './googleClassroomGrades';
import { GC_TOKEN_COOKIE, unsealCookie } from './googleClassroomOAuth';
import { GoogleClassroomError } from './googleClassroomApi';

export interface GateOk {
  ok: true;
  user: { id: string; email?: string | null };
  admin: SupabaseClient;
}
export type GateResult = GateOk | { ok: false; response: NextResponse };

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => ({
  ok: false as const,
  response: NextResponse.json({ ok: false, error, ...extra }, { status }),
});

export function notFoundWhenDisabled(): NextResponse | null {
  return isGradePassbackServerEnabled() ? null : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function gateProTeacher(opts: { classroomId?: string } = {}): Promise<GateResult> {
  const off = notFoundWhenDisabled();
  if (off) return { ok: false, response: off };

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, 'unauthorized');

  if (opts.classroomId) {
    const { data: owned, error: ownErr } = await sb
      .from('classrooms')
      .select('id')
      .eq('id', opts.classroomId)
      .eq('teacher_id', user.id)
      .maybeSingle();
    if (ownErr) {
      logger.error('[gc-grades] ownership check failed', ownErr);
      return fail(500, 'ownership_check_failed');
    }
    if (!owned) return fail(403, 'not_owner');
  }

  const admin = createAdminClient();
  if (!admin) {
    logger.error('[gc-grades] SUPABASE_SERVICE_ROLE_KEY missing — grade passback unavailable');
    return fail(500, 'service_role_missing');
  }

  const { data: sub, error: subErr } = await admin
    .from('subscriptions')
    .select('tier,status,source,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();
  if (subErr) {
    logger.error('[gc-grades] subscription lookup failed', subErr);
    return fail(500, 'subscription_lookup_failed');
  }
  if (!resolveProEntitlement(sub, Date.now()).hasPro) return fail(403, 'not_pro');

  return { ok: true, user: { id: user.id, email: user.email }, admin };
}

/** The teacher's Google access token, only if the sealed cookie was minted for THIS user. */
export async function readGoogleToken(req: NextRequest, userId: string): Promise<string | null> {
  const payload = await unsealCookie(req.cookies.get(GC_TOKEN_COOKIE)?.value);
  if (!payload || payload.uid !== userId || typeof payload.at !== 'string') return null;
  return payload.at;
}

export function reauthResponse(): NextResponse {
  return NextResponse.json({ ok: false, error: 'reauth', reauth: true }, { status: 401 });
}

/** Map a Google failure to a response the UI can act on. Logged, never swallowed. */
export function googleErrorResponse(err: unknown, where: string): NextResponse {
  if (err instanceof GoogleClassroomError) {
    logger.warn(`[gc-grades] ${where}: Google ${err.status} ${err.kind} — ${err.message}`);
    switch (err.kind) {
      case 'reauth':
        return reauthResponse();
      case 'forbidden':
        return NextResponse.json({ ok: false, error: 'google_forbidden' }, { status: 403 });
      case 'not_linkable':
        return NextResponse.json({ ok: false, error: 'not_linkable' }, { status: 409 });
      case 'not_found':
        return NextResponse.json({ ok: false, error: 'google_not_found' }, { status: 404 });
      case 'rate_limited':
        return NextResponse.json(
          { ok: false, error: 'rate_limited', retryAfter: err.retryAfter },
          { status: 429, headers: { 'Retry-After': String(err.retryAfter ?? 60) } },
        );
      default:
        return NextResponse.json({ ok: false, error: 'google_error' }, { status: 502 });
    }
  }
  logger.error(`[gc-grades] ${where}: unexpected failure`, err);
  return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
}
